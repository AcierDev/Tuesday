import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { toast } from "sonner";
import {
  Item,
  ColumnTitles,
  ItemStatus,
  Settings,
  ExtendedItem,
} from "@/typings/types";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";
import { useWeeklyScheduleStore } from "./useWeeklyScheduleStore";
import { ITEM_DEFAULT_VALUES } from "@/typings/constants";

interface OrderState {
  lastFetched: number | null;
  isLoading: boolean;
  eventSource: EventSource | null;
  doneItemsLoaded: boolean;
  hiddenItemsLoaded: boolean;
  items: ExtendedItem[];
  allItems: ExtendedItem[];
  searchQuery: string;
  searchResults: ExtendedItem[];
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

// Add this helper function before the store creation
function hasDuplicateFirstValue(item: Item, items: Item[]): boolean {
  // Get the first value's text from the current item
  const firstValue = item.values[0]?.text;
  if (!firstValue) return false;

  // Check if any other item has the same first value
  return items.some(
    (otherItem) =>
      otherItem.id !== item.id && // Don't compare with self
      otherItem.values[0]?.text?.includes(firstValue) && // Compare first values
      !otherItem.deleted // Don't compare with deleted items
  );
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
          set({ isLoading: true });
          const response = await fetch(
            "/api/items?includeDone=true&includeHidden=true"
          );
          if (!response.ok) throw new Error("Failed to fetch orders");

          const allItems = await response.json();
          set({
            allItems,
            items: allItems.filter(
              (item: ExtendedItem) =>
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
              const updatedItem = change.item;
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

        // Ensure all default values are present by spreading ITEM_DEFAULT_VALUES
        const completeValues = Object.values(ColumnTitles).map(
          (columnTitle) => {
            const existingValue = updatedItem.values.find(
              (v) => v.columnName === columnTitle
            );
            return existingValue || ITEM_DEFAULT_VALUES[columnTitle];
          }
        );

        // Update the timestamp for the changed field
        const finalValues = completeValues.map((value) =>
          value.columnName === changedField
            ? { ...value, lastModifiedTimestamp: currentTimestamp }
            : value
        );

        let itemToUpdate = {
          ...updatedItem,
          values: finalValues,
        };

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
            item.id === updatedItem.id ? itemToUpdate : item
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

        const fullNewItem: Item = {
          id: Date.now().toString(),
          index: items.filter((item) => item.status === ItemStatus.New).length,
          values: newItem.values || [],
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

          set({ items: [...items, fullNewItem] });

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
        if (!items) return false;

        return hasDuplicateFirstValue(item, items);
      },

      loadDoneItems: () => {
        const { allItems, items } = get();
        const doneItems = allItems.filter(
          (item) => item.status === ItemStatus.Done
        );
        set({ items: [...items, ...doneItems], doneItemsLoaded: true });
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
          : Object.values(ColumnTitles);

        const results = itemsToSearch.filter((item) => {
          // If searching specific columns
          if (searchColumns.length > 0) {
            return item.values.some(
              (value) =>
                // Only search in specified columns
                searchColumns.includes(value.columnName) &&
                value.text?.toLowerCase().includes(normalizedQuery)
            );
          }

          // If no columns specified, search all values and tags
          return (
            item.values.some((value) =>
              value.text?.toLowerCase().includes(normalizedQuery)
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
    const value = item.values.find((v) => v.columnName === rule.field)?.text;
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
