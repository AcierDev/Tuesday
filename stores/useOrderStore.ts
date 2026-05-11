import { create } from "zustand";
import { devtools } from "zustand/middleware";
import debounce from "lodash/debounce";
import { Item, ColumnTitles, ItemStatus, Settings } from "@/typings/types";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";
import { useWeeklyScheduleStore } from "./useWeeklyScheduleStore";
import { ITEM_DEFAULT_VALUES } from "@/typings/constants";
import { ItemUtil } from "@/utils/ItemUtil";
import { invalidateStatsCaches } from "@/lib/stats-shared";

const SEARCH_DEBOUNCE_MS = 300;

const SSE_RECONNECT_BASE_MS = 2_000;
const SSE_RECONNECT_MAX_MS = 60_000;

let sseReconnectAttempts = 0;
let sseReconnectTimer: ReturnType<typeof setTimeout> | null = null;

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

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

      loadItems: async () => {
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

          // Start watching for changes after initial load
          get().startWatchingChanges();

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
            const { items, doneItems, scheduledItems } = get();

            if (change.type === "update") {
              const updatedItem = ItemUtil.processItem(change.item);
              
              let newItems = [...items];
              let newDoneItems = [...doneItems];
              let newScheduledItems = [...scheduledItems];
              
              const isDone = updatedItem.status === ItemStatus.Done;
              const isHidden = updatedItem.status === ItemStatus.Hidden;
              
              // Update scheduledItems if present
              const scheduledIdx = newScheduledItems.findIndex(i => i.id === updatedItem.id);
              if (scheduledIdx !== -1) {
                  newScheduledItems[scheduledIdx] = updatedItem;
              }

              // Remove from old locations if status changed (or just ensure it's not in wrong list)
              // If it's Done, it shouldn't be in items.
              if (isDone) {
                  newItems = newItems.filter(i => i.id !== updatedItem.id);
                  // Update or Add to doneItems
                  const idx = newDoneItems.findIndex(i => i.id === updatedItem.id);
                  if (idx !== -1) {
                      newDoneItems[idx] = updatedItem;
                  } else {
                      newDoneItems.unshift(updatedItem);
                  }
              } 
              else if (isHidden) {
                  newItems = newItems.filter(i => i.id !== updatedItem.id);
                  newDoneItems = newDoneItems.filter(i => i.id !== updatedItem.id);
                  // If hidden items are loaded, we might update them, but let's ignore for now as per plan focus.
              }
              else {
                  // Active
                  newDoneItems = newDoneItems.filter(i => i.id !== updatedItem.id);
                  
                  const idx = newItems.findIndex(i => i.id === updatedItem.id);
                  if (idx !== -1) {
                      newItems[idx] = updatedItem;
                  } else {
                      // New active item or moved from Done/Hidden
                      newItems.push(updatedItem);
                  }
              }

              set({ items: newItems, doneItems: newDoneItems, scheduledItems: newScheduledItems });
            }
          } catch (error) {
            console.error("Failed to process change:", error);
          }
        };


        eventSource.onopen = () => {
          // Successful (re)connection — reset backoff
          sseReconnectAttempts = 0;
        };

        eventSource.onerror = () => {
          // The error event from EventSource carries no useful info, so we don't log it.
          // Browser auto-reconnect can fire repeatedly; we close and back off ourselves.
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
        const { items } = get();
        if (!items) return;

        const currentTimestamp = Date.now();

        const completeValues = Object.values(ColumnTitles).map(
          (columnTitle) => {
            // This logic needs adjustment for flat structure if we still use this flow
            // But `updatedItem` is now a flat item.
            // The `changedField` parameter is likely used for timestamp tracking.
            return {}; // Placeholder or removed logic if values are gone
          }
        );

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

        const fieldKey = changedField ? fieldMap[changedField] : undefined;

        // Construct item to update with flat fields
        let itemToUpdate = { ...updatedItem };

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

        try {
          const response = await fetch("/api/items", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: updatedItem.id,
              updates: itemToUpdate,
            }),
          });

          if (!response.ok) throw new Error("Failed to update item");

          // Flush stats caches so glued/health badges re-fetch.
          invalidateStatsCaches();

          // Update local state
          const {
            items: currentItems,
            doneItems: currentDoneItems,
            scheduledItems: currentScheduledItems,
          } = get();
          const processedUpdate = ItemUtil.processItem(itemToUpdate);

          let newItems = [...currentItems];
          let newDoneItems = [...currentDoneItems];
          let newScheduledItems = [...currentScheduledItems];

          const isDone = processedUpdate.status === ItemStatus.Done;
          const isHidden = processedUpdate.status === ItemStatus.Hidden;

          // Remove from all lists first (simplest way to handle moves)
          // But we want to preserve order if staying in same list.

          const inItemsIndex = newItems.findIndex(i => i.id === processedUpdate.id);
          const inDoneIndex = newDoneItems.findIndex(i => i.id === processedUpdate.id);
          const inScheduledIndex = newScheduledItems.findIndex(i => i.id === processedUpdate.id);

          // scheduledItems is a flat cache of items referenced by the planner
          // schedule (any status). Keep it in sync so consumers reading from
          // it — like the planner's lock-by-status check — see fresh data.
          if (inScheduledIndex !== -1) {
            if (isHidden) {
              newScheduledItems.splice(inScheduledIndex, 1);
            } else {
              newScheduledItems[inScheduledIndex] = processedUpdate;
            }
          }

          if (isDone) {
              if (inItemsIndex !== -1) newItems.splice(inItemsIndex, 1);
              if (inDoneIndex !== -1) {
                  newDoneItems[inDoneIndex] = processedUpdate;
              } else {
                  newDoneItems.unshift(processedUpdate);
              }
          } else if (isHidden) {
              if (inItemsIndex !== -1) newItems.splice(inItemsIndex, 1);
              if (inDoneIndex !== -1) newDoneItems.splice(inDoneIndex, 1);
          } else {
              // Active
              if (inDoneIndex !== -1) newDoneItems.splice(inDoneIndex, 1);
              if (inItemsIndex !== -1) {
                  newItems[inItemsIndex] = processedUpdate;
              } else {
                  newItems.push(processedUpdate);
              }
          }

          set({
            items: newItems,
            doneItems: newDoneItems,
            scheduledItems: newScheduledItems,
          });
          
          return processedUpdate;
        } catch (err) {
          console.error("Failed to update item", err);
          throw err;
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

          invalidateStatsCaches();

          set({ items: [...items, ItemUtil.processItem(fullNewItem)] });
          return fullNewItem;
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

        // Remove the item from its current position
        const currentIndex = items.findIndex((item) => item.id === itemId);
        console.log(`Current index of moved item: ${currentIndex}`);
        const updatedItems = [...items];
        updatedItems.splice(currentIndex, 1);

        // Calculate the new position
        let insertAt = 0;
        let currentStatusCount = 0;

        // Count items until we reach the destination status
        for (const item of updatedItems) {
          if (item.status === destinationStatus) {
            currentStatusCount++;
            console.log(
              `Found item with status ${destinationStatus}: count = ${currentStatusCount}`
            );
            if (currentStatusCount === destinationIndex) {
              console.log(`Target index for insertion reached: ${insertAt}`);
              break;
            }
          }
          insertAt++;
        }

        // If we're adding to the end of a status group
        if (currentStatusCount < destinationIndex) {
          while (
            insertAt < updatedItems.length &&
            updatedItems[insertAt]?.status === destinationStatus
          ) {
            insertAt++;
          }
        }

        console.log(`Inserting item at index: ${insertAt}`);

        // Insert the item at the new position
        const updatedItem = {
          ...movedItem,
          status: destinationStatus,
          completedAt:
            destinationStatus === ItemStatus.Done ? Date.now() : undefined,
        };
        updatedItems.splice(insertAt, 0, updatedItem);

        try {
          const response = await fetch("/api/items", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: itemId,
              updates: {
                status: destinationStatus,
                completedAt:
                  destinationStatus === ItemStatus.Done
                    ? Date.now()
                    : undefined,
              },
            }),
          });

          if (!response.ok) throw new Error("Failed to reorder items");

          invalidateStatsCaches();

          set({ items: updatedItems });
          console.log("Items reordered successfully.");
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
        const { doneItems, doneItemsPage, searchQuery } = get();

        if (reset) {
          set({ doneItems: [], doneItemsPage: 0, hasMoreDoneItems: true });
        }

        const currentPage = reset ? 0 : doneItemsPage;
        const limit = 25;
        const offset = currentPage * limit;

        try {
          set({ isDoneLoading: true });
          let url = `/api/items?status=Done&includeDone=true&limit=${limit}&offset=${offset}`;
          if (searchQuery.trim()) {
             url += `&search=${encodeURIComponent(searchQuery)}`;
          }
          
          const response = await fetch(url);
          if (!response.ok) throw new Error("Failed to fetch done items");

          const newItems: Item[] = await response.json();
          const processedItems = newItems.map(ItemUtil.processItem);
          console.log("Loaded done items page:", currentPage, "Count:", newItems.length);

          set((state) => ({
            doneItems: reset
              ? processedItems
              : [...state.doneItems, ...processedItems],
            doneItemsPage: currentPage + 1,
            hasMoreDoneItems: newItems.length === limit,
            doneItemsLoaded: true,
            isDoneLoading: false,
          }));
        } catch (err) {
          console.error("Failed to load done items", err);
          set({ isDoneLoading: false });
        }
      },

      searchDoneItems: async (query: string) => {
          get().loadDoneItems(true);
      },

      removeDoneItems: () => {
        set({ doneItems: [], doneItemsLoaded: false });
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

      updateItemScheduleStatus: async (
        boardId: string,
        itemId: string,
        isScheduled: boolean
      ) => {
          // This seems to be related to other functionality, leave as is
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
if (typeof window !== "undefined") {
  useOrderStore
    .getState()
    .init()
    .catch((error) => {
      console.error("Failed to initialize order store", error);
    });
}

// Helper function for automatron rules
function applyAutomatronRules(
  item: Item,
  settings: Settings,
  changedField?: ColumnTitles
): Item {
  const updatedItem = { ...item };
  let statusChanged = false;

  const relevantRules =
    settings.automatronRules?.filter((rule) => rule.field === changedField) ||
    [];

  for (const rule of relevantRules) {
    // Map rule.field (ColumnTitle) to item key
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

    const key = fieldMap[rule.field];
    const value = key ? item[key] : undefined;

    if (value === rule.value && item.status !== rule.newStatus) {
      updatedItem.status = rule.newStatus as ItemStatus;
      statusChanged = true;
      break;
    }
  }

  if (statusChanged) {
    console.log(
      `Automatron applied: Item ${item.id} status updated to ${updatedItem.status}`
    );
  }

  return updatedItem;
}

function getColumnType(columnName: string): string {
  // Map column names to their types
  const columnTypes: Record<string, string> = {
    "Customer Name": "text",
    "Due Date": "date",
    Design: "dropdown",
    Size: "dropdown",
    Painted: "dropdown",
    Backboard: "dropdown",
    Glued: "dropdown",
    Packaging: "dropdown",
    Boxes: "dropdown",
    Notes: "text",
    Rating: "number",
    // Add other columns as needed
  };

  return columnTypes[columnName] || "text"; // Default to "text" if type is unknown
}
