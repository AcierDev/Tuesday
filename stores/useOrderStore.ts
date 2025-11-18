import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { toast } from "sonner";
import { Item, ColumnTitles, ItemStatus, Settings } from "@/typings/types";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";
import { useWeeklyScheduleStore } from "./useWeeklyScheduleStore";
import { ITEM_DEFAULT_VALUES } from "@/typings/constants";
import { ItemUtil } from "@/utils/ItemUtil";

interface OrderState {
  lastFetched: number | null;
  isLoading: boolean;
  eventSource: EventSource | null;
  doneItemsLoaded: boolean;
  hiddenItemsLoaded: boolean;
  items: Item[];
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
  loadDoneItems: () => Promise<void>;
  removeDoneItems: () => void;
  loadHiddenItems: () => Promise<void>;
  removeHiddenItems: () => void;
  markCompleted: (item: Item) => Promise<void>;
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
      lastFetched: null,
      isLoading: false,
      settings: null,
      eventSource: null,
      doneItemsLoaded: false,
      hiddenItemsLoaded: false,
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
            "/api/items?includeDone=true&includeHidden=true"
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
            hiddenItemsLoaded: false,
          });

          // Start watching for changes after initial load
          get().startWatchingChanges();

          // Recalculate `isScheduled` if schedules are loaded
          const { schedules } = useWeeklyScheduleStore.getState();
          if (schedules.length > 0) get().updateIsScheduled();
        } catch (err) {
          console.error("Failed to load orders", err);
          toast.error("Failed to load orders. Please try again.");
          set({ isLoading: false });
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
        // Clean up existing connection if any
        get().stopWatchingChanges();

        const eventSource = new EventSource("/api/items/changes");

        eventSource.onmessage = (event) => {
          try {
            const change = JSON.parse(event.data);
            const { items, doneItemsLoaded, hiddenItemsLoaded } = get();

            if (change.type === "update") {
              const updatedItem = ItemUtil.processItem(change.item);
              const updatedItems = items.map((item) =>
                item.id === updatedItem.id ? updatedItem : item
              );
              set({ items: updatedItems });
            }
          } catch (error) {
            console.error("Failed to process change:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.error("EventSource failed:", error);
          get().stopWatchingChanges();

          // Try to reconnect after a delay
          setTimeout(() => {
            get().startWatchingChanges();
          }, 5000);
        };

        set({ eventSource });
      },

      stopWatchingChanges: () => {
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
          [ColumnTitles.Rating]: "rating",
          [ColumnTitles.Shipping]: "shipping",
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

          // Update local state
          const updatedItems = items.map((item) =>
            item.id === updatedItem.id
              ? ItemUtil.processItem(itemToUpdate)
              : item
          );

          set({ items: updatedItems });
        } catch (err) {
          console.error("Failed to update item", err);
          toast.error("Failed to update item. Please try again.");
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
          rating: "",
          shipping: "",
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
            isDifficultCustomer: newItem.tags?.isDifficultCustomer,
          },
        };

        try {
          const response = await fetch("/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fullNewItem),
          });

          if (!response.ok) throw new Error("Failed to add item");

          set({ items: [...items, ItemUtil.processItem(fullNewItem)] });

          toast.success("New item added successfully");
          return fullNewItem;
        } catch (err) {
          console.error("Failed to add new item", err);
          toast.error("Failed to add new item. Please try again.");
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

          // Update local state
          const updatedItems = items.map((item) =>
            item.id === itemId ? { ...item, deleted: true } : item
          );

          set({ items: updatedItems });

          toast.success("Item marked as deleted successfully");
        } catch (err) {
          console.error("Failed to mark item as deleted", err);
          toast.error("Failed to delete item. Please try again.");
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

          set({ items: updatedItems });
          console.log("Items reordered successfully.");
        } catch (err) {
          console.error("Failed to reorder items:", err);
          toast.error("Failed to reorder items. Please try again.");
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

      loadDoneItems: async () => {
        const { items } = get();

        try {
          set({ isLoading: true });
          const response = await fetch(
            "/api/items?status=Done&includeHidden=false&includeDone=true"
          );
          if (!response.ok) throw new Error("Failed to fetch done items");

          const doneItems: Item[] = await response.json();
          const processedDoneItems = doneItems.map(ItemUtil.processItem);
          console.log("Done items:", items.length, doneItems.length);

          // Remove board structure assumption
          set({
            items: items.concat(processedDoneItems),
            doneItemsLoaded: true,
            isLoading: false,
          });
          return items.concat(processedDoneItems);
        } catch (err) {
          console.error("Failed to load done items", err);
          toast.error("Failed to load done items. Please try again.");
          set({ isLoading: false });
        }
      },

      removeDoneItems: () => {
        const { items } = get();
        if (!items) return;

        // Filter out done items
        const activeItems = items.filter(
          (item) => item.status !== ItemStatus.Done
        );

        set({ items: activeItems, doneItemsLoaded: false });
      },

      loadHiddenItems: () => {
        const { allItems, items } = get();
        const hiddenItems = allItems.filter(
          (item) => item.status === ItemStatus.Hidden
        );
        set({ items: [...items, ...hiddenItems], hiddenItemsLoaded: true });
      },

      removeHiddenItems: () => {
        const { allItems } = get();
        const activeItems = allItems.filter(
          (item) => item.status !== ItemStatus.Hidden
        );
        set({ items: activeItems, hiddenItemsLoaded: false });
      },

      setSearchQuery: (
        query: string,
        columns?: ColumnTitles[] | ColumnTitles,
        searchAllItems?: boolean
      ) => {
        set({ searchQuery: query });
        get().searchItems(query, columns, searchAllItems);
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
            // Map mapped columns to flat keys
            const fieldMap: Record<ColumnTitles, keyof Item> = {
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
              [ColumnTitles.Rating]: "rating",
              [ColumnTitles.Shipping]: "shipping",
              [ColumnTitles.Labels]: "labels",
            };

            return (searchColumns as ColumnTitles[]).some((colTitle) => {
              const key = fieldMap[colTitle as ColumnTitles];
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

// Initialize the store after creation
useOrderStore.getState().init().catch(console.error);

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
      [ColumnTitles.Rating]: "rating",
      [ColumnTitles.Shipping]: "shipping",
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
    toast.success(`Item status updated to ${updatedItem.status}`);
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
