import { create } from "zustand";
import { devtools } from "zustand/middleware";
import debounce from "lodash/debounce";
import { Item, ColumnTitles, ItemStatus } from "@/typings/types";
import { useWeeklyScheduleStore } from "./useWeeklyScheduleStore";
import { ItemUtil } from "@/utils/ItemUtil";
import { invalidateStatsCaches } from "@/lib/stats-shared";
import { laDayKey } from "@/lib/debt-metrics";
import { updatePausedDueDate } from "@/lib/due-date-pause";
import { normalizeOrderWipPatch } from "@/lib/order-wip";
import {
  buildItemPatch,
  itemValuesEqual,
  stripDerivedItemFields,
} from "@/lib/order-patch";
import { shouldBootAppData } from "@/lib/app-boot";

const SEARCH_DEBOUNCE_MS = 300;
const DONE_ITEMS_PAGE_SIZE = 25;
const ITEM_CONFLICT_STATUS = 409;

const SSE_RECONNECT_BASE_MS = 2_000;
const SSE_RECONNECT_MAX_MS = 60_000;
const PAUSED_DUE_DATE_CLOCK_CHECK_MS = 60_000;

// When a live item change arrives over SSE, refresh the stats caches so any open
// stats page / nav badge / glued badge updates without a manual refresh. Debounced
// (trailing) so a burst of changes coalesces into one refetch; maxWait guarantees a
// continuous stream still refreshes stats at least this often.
const STATS_REVALIDATE_DEBOUNCE_MS = 3_000;
const STATS_REVALIDATE_MAXWAIT_MS = 12_000;
const debouncedInvalidateStats = debounce(
  invalidateStatsCaches,
  STATS_REVALIDATE_DEBOUNCE_MS,
  { maxWait: STATS_REVALIDATE_MAXWAIT_MS }
);

let sseReconnectAttempts = 0;
let sseReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pausedDueDateClock: ReturnType<typeof setInterval> | null = null;
let pausedDueDateClockDayKey: string | null = null;
let loadItemsInFlight: Promise<void> | null = null;
// Set when the live stream drops; the next successful connection reloads the
// board so changes made while disconnected are not missed.
let sseNeedsCatchUp = false;
// Only the newest Done-list request may write its result; older ones are
// aborted and their responses dropped.
let doneItemsRequestId = 0;
let doneItemsAbort: AbortController | null = null;
// Field values this tab has sent but the server has not confirmed yet. A quick
// second edit expects the first edit's value, not the one shown before it.
const pendingItemWrites = new Map<string, Map<string, { value: unknown; requestId: number }>>();
let itemWriteRequestId = 0;

// Coalesces search keystrokes into a single API call. Lodash.debounce keeps the
// latest args, so the trailing fire uses the most recent query.
const debouncedSearchDoneItems = debounce(
  (fn: (query: string) => Promise<void>, query: string) => {
    fn(query);
  },
  SEARCH_DEBOUNCE_MS
);

interface OrderState {
  lastFetched: number | null;
  isLoading: boolean;
  isDoneLoading: boolean;
  eventSource: EventSource | null;
  doneItemsLoaded: boolean;
  items: Item[];
  doneItems: Item[];
  scheduledItems: Item[];
  doneItemsPage: number;
  hasMoreDoneItems: boolean;
  allItems: Item[];
  searchQuery: string;
  searchResults: Item[];
  // Actions
  loadItems: () => Promise<void>;
  /** Unshared fetch behind loadItems; call loadItems instead. */
  loadItemsOnce: () => Promise<void>;
  updateItem: (updatedItem: Item, changedField?: ColumnTitles) => Promise<Item>;
  addNewItem: (newItem: Partial<Item>) => Promise<Item>;
  deleteItem: (itemId: string) => Promise<Item>;
  startWatchingChanges: () => void;
  stopWatchingChanges: () => void;
  reorderItems: (
    itemId: string,
    sourceStatus: ItemStatus,
    destinationStatus: ItemStatus,
    destinationIndex: number
  ) => Promise<void>;
  updateItemScheduleStatus: (
    boardId: string,
    itemId: string,
    isScheduled: boolean
  ) => Promise<void>;
  init: () => Promise<void>;
  checkDuplicate: (item: Item) => boolean;
  loadDoneItems: (reset?: boolean) => Promise<void>;
  searchDoneItems: (query: string) => Promise<void>;
  removeDoneItems: () => void;
  fetchItemsByIds: (ids: string[]) => Promise<void>;
  updateIsScheduled: () => void;
  setSearchQuery: (
    query: string,
    columns?: ColumnTitles[] | ColumnTitles,
    searchAllItems?: boolean
  ) => void;
  searchItems: (
    query: string,
    columns?: ColumnTitles[] | ColumnTitles,
    searchAllItems?: boolean
  ) => void;
}

type ItemLists = Pick<OrderState, "items" | "doneItems" | "scheduledItems">;

// Puts a saved order in the list for its status: Done orders move to the Done
// list, Hidden orders leave the board, active orders update in place (or are
// positioned by `placeActive`, else appended).
function routeSavedItem(
  state: ItemLists,
  item: Item,
  placeActive?: (items: Item[], item: Item) => Item[]
): ItemLists {
  const without = (list: Item[]) => list.filter((existing) => existing.id !== item.id);
  const replace = (list: Item[]) =>
    list.map((existing) => (existing.id === item.id ? item : existing));
  const has = (list: Item[]) => list.some((existing) => existing.id === item.id);

  // scheduledItems is a flat cache of items referenced by the planner
  // schedule (any status). Keep it in sync so consumers reading from
  // it — like the planner's lock-by-status check — see fresh data.
  const scheduledItems = item.status === ItemStatus.Hidden
    ? without(state.scheduledItems)
    : replace(state.scheduledItems);

  if (item.status === ItemStatus.Done) {
    return {
      items: without(state.items),
      doneItems: has(state.doneItems) ? replace(state.doneItems) : [item, ...state.doneItems],
      scheduledItems,
    };
  }
  if (item.status === ItemStatus.Hidden) {
    return { items: without(state.items), doneItems: without(state.doneItems), scheduledItems };
  }
  return {
    items: placeActive
      ? placeActive(without(state.items), item)
      : has(state.items) ? replace(state.items) : [...state.items, item],
    doneItems: without(state.doneItems),
    scheduledItems,
  };
}

// Inserts a dragged order at `index` within its destination status group.
function insertAtStatusPosition(
  items: Item[],
  item: Item,
  status: ItemStatus,
  index: number
): Item[] {
  let insertAt = 0;
  let statusCount = 0;
  for (const existing of items) {
    if (existing.status === status) {
      statusCount++;
      if (statusCount === index) break;
    }
    insertAt++;
  }
  // Adding to the end of a status group
  if (statusCount < index) {
    while (insertAt < items.length && items[insertAt]?.status === status) {
      insertAt++;
    }
  }
  return [...items.slice(0, insertAt), item, ...items.slice(insertAt)];
}

// Planner membership is computed in the browser and never stored, so a server
// copy of an order keeps the flag the board already had.
function keepScheduleFlag(state: ItemLists, item: Item): Item {
  const known = [...state.items, ...state.doneItems, ...state.scheduledItems]
    .find((existing) => existing.id === item.id);
  return { ...item, isScheduled: known?.isScheduled };
}

// The live stream identifies hard-deleted documents by Mongo _id only.
function documentIdOf(item: Item): string | undefined {
  const documentId = (item as Item & { _id?: unknown })._id;
  return documentId == null ? undefined : String(documentId);
}

// Helper function to get the customer name from an item's values
function getCustomerName(item: Item): string | undefined {
  return item.customerName;
}

// Add this helper function before the store creation
function hasDuplicateFirstValue(item: Item, items: Item[]): boolean {
  // Get the customer name from the current item
  const customerName = getCustomerName(item);

  if (!customerName) {
    return false;
  }

  // Check if any other item has a matching customer name
  const duplicates = items.filter((otherItem) => {
    const isSelf = otherItem.id === item.id;
    const notDeleted = !otherItem.deleted;

    if (isSelf || !notDeleted) {
      return false;
    }

    const otherCustomerName = getCustomerName(otherItem);

    if (!otherCustomerName) {
      return false;
    }

    // Check if the other customer name includes this customer name
    const includesMatch = otherCustomerName.includes(customerName);

    return includesMatch;
  });

  return duplicates.length > 0;
}

export const useOrderStore = create<OrderState>()(
  devtools((set, get) => {
    // Replaces one order with its stored version (after a rejected save).
    const refreshItem = async (itemId: string, storedItem?: Item) => {
      let latest = storedItem;
      if (!latest) {
        try {
          const response = await fetch(`/api/items?ids=${encodeURIComponent(itemId)}`);
          if (response.ok) latest = (await response.json())[0];
        } catch (err) {
          console.error("Failed to reload item", err);
        }
      }
      if (!latest) return;
      const processed = ItemUtil.processItem(latest);
      set((state) => routeSavedItem(state, keepScheduleFlag(state, processed)));
    };

    return {
      allItems: [],
      items: [],
      doneItems: [],
      scheduledItems: [],
      doneItemsPage: 0,
      hasMoreDoneItems: true,
      lastFetched: null,
      isLoading: false,
      isDoneLoading: false,
      settings: null,
      eventSource: null,
      doneItemsLoaded: false,
      searchQuery: "",
      searchResults: [],

      loadItems: () => {
        // Store boot and the orders page both ask on first load; share one request.
        if (!loadItemsInFlight) {
          loadItemsInFlight = get().loadItemsOnce().finally(() => {
            loadItemsInFlight = null;
          });
        }
        return loadItemsInFlight;
      },

      loadItemsOnce: async () => {
        try {
          // Avoid running this on the server where relative fetch URLs break
          if (typeof window === "undefined") {
            return;
          }

          set({ isLoading: true });
          const response = await fetch(
            "/api/items?includeDone=false&includeHidden=true"
          );
          if (!response.ok) throw new Error("Failed to fetch orders");

          const allItems = await response.json();
          const processedAllItems: Item[] = allItems.map(ItemUtil.processItem);
          set({
            allItems: processedAllItems,
            items: processedAllItems.filter(
              (item: Item) =>
                item.status !== ItemStatus.Done &&
                item.status !== ItemStatus.Hidden
            ),
            lastFetched: Date.now(),
            isLoading: false,
            doneItemsLoaded: false,
          });

          // Keep an already-open board current across LA midnight. ItemUtil
          // derives each paused due date from its fixed days-remaining offset.
          if (!pausedDueDateClock) {
            pausedDueDateClockDayKey = laDayKey();
            pausedDueDateClock = setInterval(() => {
              const currentDayKey = laDayKey();
              if (currentDayKey === pausedDueDateClockDayKey) return;
              pausedDueDateClockDayKey = currentDayKey;
              set((state) => ({
                allItems: state.allItems.map(ItemUtil.processItem),
                items: state.items.map(ItemUtil.processItem),
                doneItems: state.doneItems.map(ItemUtil.processItem),
                scheduledItems: state.scheduledItems.map(ItemUtil.processItem),
                searchResults: state.searchResults.map(ItemUtil.processItem),
              }));
            }, PAUSED_DUE_DATE_CLOCK_CHECK_MS);
          }

          // Start watching for changes after initial load. A reload (for
          // example the catch-up after a reconnect) keeps the open stream.
          if (!get().eventSource) get().startWatchingChanges();

          // Recalculate `isScheduled` if schedules are loaded
          const { schedules } = useWeeklyScheduleStore.getState();
          if (schedules.length > 0) get().updateIsScheduled();
        } catch (err) {
          console.error("Failed to load orders", err);
          set({ isLoading: false });
        }
      },

      fetchItemsByIds: async (ids: string[]) => {
        const { items, doneItems, scheduledItems } = get();
        // Create a set of known IDs for fast lookup
        const knownIds = new Set([
          ...items.map((i) => i.id),
          ...doneItems.map((i) => i.id),
          ...scheduledItems.map((i) => i.id),
        ]);

        // Filter out IDs that we already have
        const missingIds = ids.filter((id) => !knownIds.has(id));

        if (missingIds.length === 0) return;

        try {
          const response = await fetch(`/api/items?ids=${missingIds.join(",")}`);
          if (!response.ok) throw new Error("Failed to fetch items by IDs");

          const newItems = await response.json();
          const processedItems = newItems.map(ItemUtil.processItem);
          
          set((state) => ({
            scheduledItems: [...state.scheduledItems, ...processedItems],
          }));
        } catch (err) {
          console.error("Failed to fetch items by IDs", err);
        }
      },

      updateIsScheduled: () => {
        const { items } = get();
        const { schedules } = useWeeklyScheduleStore.getState();

        const updatedItems = items.map((item) => ({
          ...item,
          isScheduled: schedules.some((schedule) =>
            Object.values(schedule.schedule).some((day) =>
              day.some((dayItem) => dayItem.id === item.id)
            )
          ),
        }));

        set({ items: updatedItems });
      },

      startWatchingChanges: () => {
        // Ensure this only runs in the browser where EventSource is available
        if (typeof window === "undefined" || typeof EventSource === "undefined") {
          return;
        }

        // Clean up existing connection if any
        get().stopWatchingChanges();

        const eventSource = new EventSource("/api/items/changes");

        eventSource.onmessage = (event) => {
          try {
            const change = JSON.parse(event.data);

            // Any live item change can affect stats (glued count, throughput, etc).
            // Refresh the stats caches so open stats views update without a refresh.
            debouncedInvalidateStats();

            // Soft deletions arrive as updates. Remove them before normal status
            // routing can put the order back into an active or completed list.
            // Hard deletions only carry the Mongo document id.
            if (change.item?.deleted || change.type === "delete") {
              const deletedId: string | undefined = change.item?.id ?? change.itemId;
              const deletedDocumentId: string | undefined = change.documentId;
              if (!deletedId && !deletedDocumentId) return;
              const keep = (item: Item) =>
                item.id !== deletedId &&
                (!deletedDocumentId || documentIdOf(item) !== deletedDocumentId);
              set((state) => ({
                items: state.items.filter(keep),
                doneItems: state.doneItems.filter(keep),
                scheduledItems: state.scheduledItems.filter(keep),
                allItems: state.allItems.filter(keep),
                searchResults: state.searchResults.filter(keep),
              }));
              return;
            }

            if ((change.type === "update" || change.type === "insert") && change.item) {
              const updatedItem = ItemUtil.processItem(change.item);
              set((state) => routeSavedItem(state, keepScheduleFlag(state, updatedItem)));
            }
          } catch (error) {
            console.error("Failed to process change:", error);
          }
        };

        eventSource.onopen = () => {
          // Successful (re)connection — reset backoff
          sseReconnectAttempts = 0;
          if (!sseNeedsCatchUp) return;
          // Changes made while disconnected were never delivered: reload.
          sseNeedsCatchUp = false;
          const reloadDoneItems = get().doneItemsLoaded;
          void get().loadItems().then(() => {
            if (reloadDoneItems) return get().loadDoneItems(true);
          });
        };

        eventSource.onerror = () => {
          // The error event from EventSource carries no useful info, so we don't log it.
          // Browser auto-reconnect can fire repeatedly; we close and back off ourselves.
          sseNeedsCatchUp = true;
          get().stopWatchingChanges();

          const delay = Math.min(
            SSE_RECONNECT_BASE_MS * 2 ** sseReconnectAttempts,
            SSE_RECONNECT_MAX_MS
          );
          sseReconnectAttempts += 1;

          if (sseReconnectTimer) clearTimeout(sseReconnectTimer);
          sseReconnectTimer = setTimeout(() => {
            sseReconnectTimer = null;
            get().startWatchingChanges();
          }, delay);
        };

        set({ eventSource });
      },

      stopWatchingChanges: () => {
        if (sseReconnectTimer) {
          clearTimeout(sseReconnectTimer);
          sseReconnectTimer = null;
        }
        const { eventSource } = get();
        if (eventSource) {
          eventSource.close();
          set({ eventSource: null });
        }
      },

      updateItem: async (updatedItem, changedField) => {
        const { items, doneItems, scheduledItems } = get();
        if (!items) return;

        // Map changedField to property name
        const fieldMap: Record<string, keyof Item> = {
          [ColumnTitles.Customer_Name]: "customerName",
          [ColumnTitles.Due]: "dueDate",
          [ColumnTitles.Design]: "design",
          [ColumnTitles.Size]: "size",
          [ColumnTitles.Painted]: "painted",
          [ColumnTitles.Backboard]: "backboard",
          [ColumnTitles.Glued]: "glued",
          [ColumnTitles.Packaging]: "packaging",
          [ColumnTitles.Boxes]: "boxes",
          [ColumnTitles.Notes]: "notes",
          [ColumnTitles.Labels]: "labels",
        };

        // Construct item to update with flat fields
        let itemToUpdate = { ...updatedItem };
        const currentItem =
          items.find((item) => item.id === updatedItem.id) ??
          doneItems.find((item) => item.id === updatedItem.id) ??
          scheduledItems.find((item) => item.id === updatedItem.id);
        if (currentItem) {
          itemToUpdate = { ...itemToUpdate, ...normalizeOrderWipPatch(currentItem, itemToUpdate) };
          for (const field of ["shippingDetails", "etsyOrder"] as const) {
            const incoming = itemToUpdate[field];
            if (!incoming) continue;
            const previous = currentItem[field] as Record<string, unknown> | undefined;
            const changed = Object.fromEntries(Object.entries(incoming).filter(([key, value]) => value !== previous?.[key]));
            if (Object.keys(changed).length) Object.assign(itemToUpdate, { [field]: changed });
            else delete itemToUpdate[field];
          }
        }
        const dueDateChanged =
          changedField === ColumnTitles.Due ||
          (currentItem !== undefined &&
            currentItem.dueDate !== updatedItem.dueDate);
        if (itemToUpdate.onHold && dueDateChanged) {
          itemToUpdate = updatePausedDueDate(
            itemToUpdate,
            itemToUpdate.dueDate ?? ""
          );
        }

        // If we need to track timestamps per field, we might need a separate 'metadata' object or suffix fields like 'design_timestamp'
        // For now, assuming raw update.

        //! TODO: Add back in
        // Apply automatron rules if active
        // if (settings?.isAutomatronActive) {
        //   itemToUpdate = applyAutomatronRules(
        //     itemToUpdate,
        //     settings,
        //     changedField
        //   );
        // }

        // Send only the fields that changed from what this tab last saw, so a
        // save never overwrites someone else's edit to another field. Cells
        // name the column they edited; anything else in their copy is ignored.
        const editedKey = changedField ? fieldMap[changedField] : undefined;
        const editedFields = editedKey
          ? new Set([
            editedKey as string,
            ...Object.keys(itemToUpdate).filter(
              (key) =>
                !itemValuesEqual(
                  (itemToUpdate as Record<string, unknown>)[key],
                  (updatedItem as Record<string, unknown>)[key]
                )
            ),
          ])
          : undefined;
        const patch = currentItem
          ? buildItemPatch(currentItem, itemToUpdate, editedFields)
          : { updates: stripDerivedItemFields(itemToUpdate), expected: undefined };

        // Fields this tab is still saving are expected to hold the value sent.
        const pendingForItem = pendingItemWrites.get(updatedItem.id) ?? new Map();
        const expected = patch.expected && { ...patch.expected } as Record<string, unknown>;
        if (expected) {
          for (const key of Object.keys(expected)) {
            const pending = pendingForItem.get(key);
            if (pending) expected[key] = pending.value ?? null;
          }
        }
        const requestId = ++itemWriteRequestId;
        for (const [key, value] of Object.entries(patch.updates)) {
          pendingForItem.set(key, { value, requestId });
        }
        pendingItemWrites.set(updatedItem.id, pendingForItem);

        try {
          const response = await fetch("/api/items", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: updatedItem.id,
              updates: patch.updates,
              ...(expected ? { expected } : {}),
            }),
          });

          if (response.status === ITEM_CONFLICT_STATUS) {
            // Someone else changed this field first: show their version.
            const conflict = await response.json().catch(() => null);
            await refreshItem(updatedItem.id, conflict?.item);
            throw new Error(
              conflict?.error ?? "This order was changed by someone else. Try again."
            );
          }
          if (!response.ok) throw new Error("Failed to update item");
          const saved = await response.json().catch(() => null);
          if (!saved?.item) {
            // Older servers return only the merged shipping/Etsy fields.
            itemToUpdate = {
              ...currentItem,
              ...itemToUpdate,
              ...(saved?.shippingDetails !== undefined ? { shippingDetails: saved.shippingDetails } : {}),
              ...(saved?.etsyOrder !== undefined ? { etsyOrder: saved.etsyOrder } : {}),
            };
          }

          // Flush stats caches so glued/health badges re-fetch.
          invalidateStatsCaches();

          // Show exactly what was stored; planner membership stays client-side.
          const processedUpdate = ItemUtil.processItem(
            saved?.item
              ? { ...saved.item, isScheduled: itemToUpdate.isScheduled }
              : itemToUpdate
          );
          set((state) => routeSavedItem(state, processedUpdate));

          return processedUpdate;
        } catch (err) {
          console.error("Failed to update item", err);
          throw err;
        } finally {
          for (const [key, pending] of [...pendingForItem]) {
            if (pending.requestId === requestId) pendingForItem.delete(key);
          }
          if (pendingForItem.size === 0) pendingItemWrites.delete(updatedItem.id);
        }
      },

      addNewItem: async (newItem) => {
        const { items } = get();
        if (!items) return;

        // Default empty strings for all mapped fields
        const defaultFlatItem: Partial<Item> = {
          customerName: "",
          dueDate: "",
          design: "",
          size: "",
          painted: "",
          backboard: "",
          glued: "",
          packaging: "",
          boxes: "",
          notes: "",
          labels: "",
        };

        const fullNewItem: Item = {
          ...defaultFlatItem,
          ...newItem,
          id: Date.now().toString(),
          index: items.filter((item) => item.status === ItemStatus.New).length,
          // values array removed
          createdAt: Date.now(),
          status: ItemStatus.New,
          visible: true,
          deleted: false,
          tags: {
            isVertical: newItem.tags?.isVertical,
            hasCustomerMessage: newItem.tags?.hasCustomerMessage,
          },
        };

        try {
          const response = await fetch("/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fullNewItem),
          });

          if (!response.ok) throw new Error("Failed to add item");
          const saved = await response.json().catch(() => null);

          invalidateStatsCaches();

          // The live stream may already have added the stored copy.
          const created = ItemUtil.processItem(saved?.id ? saved : fullNewItem);
          set((state) => ({
            items: state.items.some((item) => item.id === created.id)
              ? state.items
              : [...state.items, created],
          }));
          return created;
        } catch (err) {
          console.error("Failed to add new item", err);
          throw err;
        }
      },

      deleteItem: async (itemId) => {
        const { items } = get();
        if (!items) return;

        try {
          const response = await fetch("/api/items", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: itemId,
              updates: { deleted: true },
            }),
          });

          if (!response.ok) throw new Error("Failed to delete item");

          invalidateStatsCaches();

          // Deleted items live on the /deleted page — drop from every
          // in-memory list so the active UI updates immediately.
          set((state) => ({
            items: state.items.filter((item) => item.id !== itemId),
            doneItems: state.doneItems.filter((item) => item.id !== itemId),
            scheduledItems: state.scheduledItems.filter(
              (item) => item.id !== itemId
            ),
          }));
        } catch (err) {
          console.error("Failed to mark item as deleted", err);
          throw err;
        }
      },

      reorderItems: async (
        itemId,
        sourceStatus,
        destinationStatus,
        destinationIndex
      ) => {
        const { items } = get();
        if (!items) {
          console.warn("No items found in the store.");
          return;
        }

        // Find the item to move
        const movedItem = items.find((item) => item.id === itemId);
        if (!movedItem) {
          console.error(`Item with id ${itemId} not found.`);
          return;
        }

        const movePatch = normalizeOrderWipPatch(movedItem, {
          status: destinationStatus,
          completedAt:
            destinationStatus === ItemStatus.Done ? Date.now() : undefined,
        });

        try {
          const response = await fetch("/api/items", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: itemId,
              updates: movePatch,
            }),
          });

          if (!response.ok) throw new Error("Failed to reorder items");

          invalidateStatsCaches();

          // Position against the board as it is now, not as it was before the
          // save; a drop into Done moves the order to the Done list.
          set((state) => {
            const latest = state.items.find((item) => item.id === itemId) ?? movedItem;
            return routeSavedItem(state, { ...latest, ...movePatch }, (rest, item) =>
              insertAtStatusPosition(rest, item, destinationStatus, destinationIndex)
            );
          });
        } catch (err) {
          console.error("Failed to reorder items:", err);
          throw err;
        }
      },

      init: async () => {
        const store = get();
        await store.loadItems();
      },

      checkDuplicate: (item: Item): boolean => {
        const { items } = get();
        if (!items) {
          return false;
        }

        return hasDuplicateFirstValue(item, items);
      },

      loadDoneItems: async (reset = false) => {
        // One page at a time; a reset (new search, reopen) supersedes anything
        // in flight instead of racing it.
        if (!reset && get().isDoneLoading) return;
        doneItemsAbort?.abort();
        const controller = new AbortController();
        doneItemsAbort = controller;
        const requestId = ++doneItemsRequestId;

        const { doneItemsPage, searchQuery } = get();

        if (reset) {
          set({ doneItems: [], doneItemsPage: 0, hasMoreDoneItems: true });
        }

        const currentPage = reset ? 0 : doneItemsPage;
        const limit = DONE_ITEMS_PAGE_SIZE;
        const offset = currentPage * limit;

        try {
          set({ isDoneLoading: true });
          let url = `/api/items?status=Done&includeDone=true&limit=${limit}&offset=${offset}`;
          if (searchQuery.trim()) {
             url += `&search=${encodeURIComponent(searchQuery)}`;
          }
          
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) throw new Error("Failed to fetch done items");

          const newItems: Item[] = await response.json();
          if (requestId !== doneItemsRequestId) return;
          const processedItems = newItems.map(ItemUtil.processItem);

          set((state) => {
            // Orders completed live shift the pages; skip ones already shown.
            const shown = new Set(state.doneItems.map((item) => item.id));
            return {
              doneItems: reset
                ? processedItems
                : [...state.doneItems, ...processedItems.filter((item) => !shown.has(item.id))],
              doneItemsPage: currentPage + 1,
              hasMoreDoneItems: newItems.length === limit,
              doneItemsLoaded: true,
              isDoneLoading: false,
            };
          });
        } catch (err) {
          // A newer request replaced this one; it owns the loading state.
          if (requestId !== doneItemsRequestId) return;
          console.error("Failed to load done items", err);
          set({ isDoneLoading: false });
        } finally {
          if (doneItemsAbort === controller) doneItemsAbort = null;
        }
      },

      searchDoneItems: async (query: string) => {
          get().loadDoneItems(true);
      },

      removeDoneItems: () => {
        // Drop any page still loading so it cannot refill the closed list.
        doneItemsAbort?.abort();
        doneItemsRequestId++;
        set({ doneItems: [], doneItemsLoaded: false, isDoneLoading: false });
      },

      updateItemScheduleStatus: async (
        boardId: string,
        itemId: string,
        isScheduled: boolean
      ) => {
          // This seems to be related to other functionality, leave as is
      },

      setSearchQuery: (
        query: string,
        columns?: ColumnTitles[] | ColumnTitles,
        searchAllItems?: boolean
      ) => {
        set({ searchQuery: query });
        // Local in-memory filter — runs synchronously so the UI updates immediately.
        get().searchItems(query, columns, searchAllItems);
        // Server hit for Done items — debounced so typing doesn't fire one request per keystroke.
        debouncedSearchDoneItems(get().searchDoneItems, query);
      },

      searchItems: (
        query: string,
        columns?: ColumnTitles[] | ColumnTitles,
        searchAllItems: boolean = false
      ) => {
        const { items, allItems } = get();
        if (!query.trim()) {
          set({ searchResults: [] });
          return;
        }

        const itemsToSearch = searchAllItems ? allItems : items;
        const normalizedQuery = query.toLowerCase().trim();

        // Convert single column to array for consistent handling
        const searchColumns = columns
          ? Array.isArray(columns)
            ? columns
            : [columns]
          : [];

        const results = itemsToSearch.filter((item) => {
          // Optimized search using searchText if no specific columns are requested
          if (searchColumns.length === 0 && item.searchText) {
            return item.searchText.includes(normalizedQuery);
          }

          // If searching specific columns
          if (searchColumns.length > 0) {
            // Map mapped columns to flat keys. Partial because ColumnTitles.Shipping
            // doubles as the tracking-column toggle and no longer maps to a string
            // field on Item — searches for that column should fall through.
            const fieldMap: Partial<Record<ColumnTitles, keyof Item>> = {
              [ColumnTitles.Customer_Name]: "customerName",
              [ColumnTitles.Due]: "dueDate",
              [ColumnTitles.Design]: "design",
              [ColumnTitles.Size]: "size",
              [ColumnTitles.Painted]: "painted",
              [ColumnTitles.Backboard]: "backboard",
              [ColumnTitles.Glued]: "glued",
              [ColumnTitles.Packaging]: "packaging",
              [ColumnTitles.Boxes]: "boxes",
              [ColumnTitles.Notes]: "notes",
              [ColumnTitles.Labels]: "labels",
            };

            return (searchColumns as ColumnTitles[]).some((colTitle) => {
              const key = fieldMap[colTitle as ColumnTitles];
              if (!key) return false;
              const val = item[key];
              return (
                typeof val === "string" &&
                val.toLowerCase().includes(normalizedQuery)
              );
            });
          }

          // Fallback for items without cached search text (shouldn't happen often)
          return (
            // Search all flat string fields
            Object.values(item).some(
              (val) =>
                typeof val === "string" &&
                val.toLowerCase().includes(normalizedQuery)
            ) ||
            // Search through tags
            Object.entries(item.tags || {}).some(([key, value]) => {
              const tagString = `${key}:${value}`.toLowerCase();
              return tagString.includes(normalizedQuery);
            })
          );
        });

        set({ searchResults: results });
      },
    };
  })
);

// Initialize the store after creation on the client only
if (shouldBootAppData()) {
  useOrderStore
    .getState()
    .init()
    .catch((error) => {
      console.error("Failed to initialize order store", error);
    });
}
