import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { toast } from "sonner";
import {
  Board,
  Item,
  ColumnTitles,
  ItemStatus,
  Settings,
  WeeklySchedules,
} from "@/typings/types";

interface OrderState {
  board: Board | null;
  lastFetched: number | null;
  isLoading: boolean;
  settings: Settings | null;
  eventSource: EventSource | null;

  // Actions
  loadBoard: () => Promise<void>;
  loadSettings: () => Promise<void>;
  updateItem: (updatedItem: Item, changedField?: ColumnTitles) => Promise<void>;
  addNewItem: (newItem: Partial<Item>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
  startWatchingChanges: () => void;
  stopWatchingChanges: () => void;
  reorderItems: (
    itemId: string,
    sourceStatus: ItemStatus,
    destinationStatus: ItemStatus,
    destinationIndex: number
  ) => Promise<void>;
  updateWeeklySchedules: (
    boardId: string,
    newSchedules: WeeklySchedules
  ) => Promise<void>;
  updateItemScheduleStatus: (
    boardId: string,
    itemId: string,
    isScheduled: boolean
  ) => Promise<void>;
  init: () => Promise<void>;
  checkDuplicate: (item: Item) => boolean;
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
      board: null,
      lastFetched: null,
      isLoading: false,
      settings: null,
      eventSource: null,

      loadBoard: async () => {
        try {
          set({ isLoading: true });
          const response = await fetch("/api/boards");
          if (!response.ok) throw new Error("Failed to fetch board");

          const board = await response.json();
          set({ board, lastFetched: Date.now(), isLoading: false });

          // Start watching for changes after initial load
          get().startWatchingChanges();
        } catch (err) {
          console.error("Failed to load board", err);
          toast.error("Failed to load board. Please try again.");
          set({ isLoading: false });
        }
      },

      startWatchingChanges: () => {
        // Clean up existing connection if any
        get().stopWatchingChanges();

        const eventSource = new EventSource("/api/boards/changes");

        eventSource.onmessage = (event) => {
          try {
            const change = JSON.parse(event.data);
            const { board } = get();

            if (change.type === "update" && board?.id === change.boardId) {
              set({ board: change.board });
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

      loadSettings: async () => {
        try {
          const response = await fetch("/api/settings");
          if (!response.ok) throw new Error("Failed to fetch settings");

          const settings = await response.json();
          set({ settings });
        } catch (err) {
          console.error("Failed to load settings", err);
          toast.error("Failed to load settings");
        }
      },

      updateItem: async (updatedItem, changedField) => {
        const { board, settings } = get();
        if (!board) return;

        const currentTimestamp = Date.now();

        // Get all possible column names from other items to ensure we have a complete list
        const allColumnNames = new Set<string>();
        board.items_page.items.forEach((item) => {
          item.values.forEach((value) => {
            allColumnNames.add(value.columnName);
          });
        });

        // Ensure all columns exist in the item's values array
        const existingColumns = new Set(
          updatedItem.values.map((v) => v.columnName)
        );
        const updatedValues = [...updatedItem.values];

        // Add missing columns with empty values
        allColumnNames.forEach((columnName) => {
          if (!existingColumns.has(columnName as ColumnTitles)) {
            updatedValues.push({
              columnName: columnName as ColumnTitles,
              type: getColumnType(columnName), // Helper function to determine type
              text: "",
            });
          }
        });

        // Update the timestamp for the changed field
        const finalValues = updatedValues.map((value) =>
          value.columnName === changedField
            ? { ...value, lastModifiedTimestamp: currentTimestamp }
            : value
        );

        let itemToUpdate = {
          ...updatedItem,
          values: finalValues,
        };

        // Apply automatron rules if active
        if (settings?.isAutomatronActive) {
          itemToUpdate = applyAutomatronRules(
            itemToUpdate,
            settings,
            changedField
          );
        }

        try {
          const updatedItems = board.items_page.items.map((item) =>
            item.id === updatedItem.id ? itemToUpdate : item
          );

          const updates = {
            items_page: {
              ...board.items_page,
              items: updatedItems,
            },
          };

          const response = await fetch("/api/boards", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: board.id,
              updates,
            }),
          });

          if (!response.ok) throw new Error("Failed to update item");

          set({
            board: {
              ...board,
              items_page: {
                ...board.items_page,
                items: updatedItems,
              },
            },
          });
        } catch (err) {
          console.error("Failed to update item", err);
          toast.error("Failed to update item. Please try again.");
          throw err;
        }
      },

      updateSettings: async (newSettings) => {
        try {
          const response = await fetch("/api/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newSettings),
          });

          if (!response.ok) throw new Error("Failed to update settings");
          set({ settings: newSettings });
          toast.success("Settings updated successfully");
        } catch (err) {
          console.error("Failed to update settings", err);
          toast.error("Failed to update settings");
        }
      },

      addNewItem: async (newItem) => {
        const { board } = get();
        if (!board) return;

        const fullNewItem: Item = {
          id: Date.now().toString(),
          values: newItem.values || [],
          createdAt: Date.now(),
          status: ItemStatus.New,
          vertical: newItem.vertical,
          visible: true,
          deleted: false,
          isScheduled: false,
        };

        try {
          const updates = {
            items_page: {
              ...board.items_page,
              items: [...board.items_page.items, fullNewItem],
            },
          };

          const response = await fetch("/api/boards", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: board.id,
              updates,
            }),
          });

          if (!response.ok) throw new Error("Failed to add item");

          set({
            board: {
              ...board,
              items_page: {
                ...board.items_page,
                items: [...board.items_page.items, fullNewItem],
              },
            },
          });

          toast.success("New item added successfully");
          return fullNewItem;
        } catch (err) {
          console.error("Failed to add new item", err);
          toast.error("Failed to add new item. Please try again.");
          throw err;
        }
      },

      deleteItem: async (itemId) => {
        const { board } = get();
        if (!board) return;

        try {
          const updatedItems = board.items_page.items.map((item) =>
            item.id === itemId ? { ...item, deleted: true } : item
          );

          const updates = {
            items_page: {
              ...board.items_page,
              items: updatedItems,
            },
          };

          const response = await fetch("/api/boards", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: board.id,
              updates,
            }),
          });

          if (!response.ok) throw new Error("Failed to delete item");

          set({
            board: {
              ...board,
              items_page: {
                ...board.items_page,
                items: updatedItems,
              },
            },
          });

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
        const { board } = get();
        if (!board) return;

        // Find the item to move
        const movedItem = board.items_page.items.find(
          (item) => item.id === itemId
        );
        if (!movedItem) return;

        // Create a copy of all items
        const updatedItems = [...board.items_page.items];

        // Remove the item from its current position
        const currentIndex = updatedItems.findIndex(
          (item) => item.id === itemId
        );
        updatedItems.splice(currentIndex, 1);

        // Calculate the new position
        let insertAt = 0;
        let currentStatusCount = 0;

        // Count items until we reach the destination status
        for (const item of updatedItems) {
          if (item.status === destinationStatus) {
            currentStatusCount++;
            if (currentStatusCount === destinationIndex) {
              break;
            }
          }
          insertAt++;
        }

        // If we're adding to the end of a status group
        if (currentStatusCount < destinationIndex) {
          while (
            insertAt < updatedItems.length &&
            updatedItems[insertAt].status === destinationStatus
          ) {
            insertAt++;
          }
        }

        // Insert the item at the new position
        const updatedItem = {
          ...movedItem,
          status: destinationStatus,
          completedAt:
            destinationStatus === ItemStatus.Done ? Date.now() : undefined,
        };
        updatedItems.splice(insertAt, 0, updatedItem);

        try {
          const response = await fetch("/api/boards", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: board.id,
              updates: {
                items_page: {
                  ...board.items_page,
                  items: updatedItems,
                },
              },
            }),
          });

          if (!response.ok) throw new Error("Failed to reorder items");

          set({
            board: {
              ...board,
              items_page: {
                ...board.items_page,
                items: updatedItems,
              },
            },
          });
        } catch (err) {
          console.error("Failed to reorder items:", err);
          toast.error("Failed to reorder items. Please try again.");
          throw err;
        }
      },

      updateWeeklySchedules: async (
        boardId: string,
        newSchedules: WeeklySchedules
      ) => {
        const { board } = get();
        if (!board) return;

        try {
          const response = await fetch("/api/boards", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: boardId,
              updates: { weeklySchedules: newSchedules },
            }),
          });

          if (!response.ok) throw new Error("Failed to update schedules");

          set({
            board: {
              ...board,
              weeklySchedules: newSchedules,
            },
          });
        } catch (err) {
          console.error("Failed to save weekly schedules", err);
          toast.error("Failed to save weekly schedules. Please try again.");
          throw err;
        }
      },

      updateItemScheduleStatus: async (
        boardId: string,
        itemId: string,
        isScheduled: boolean
      ) => {
        const { board } = get();
        if (!board) return;

        try {
          const response = await fetch("/api/boards", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: boardId,
              updates: {
                "items_page.items.$[elem].isScheduled": isScheduled,
              },
              arrayFilters: [{ "elem.id": itemId }],
            }),
          });

          if (!response.ok)
            throw new Error("Failed to update item schedule status");

          const updatedItems = board.items_page.items.map((item) =>
            item.id === itemId ? { ...item, isScheduled } : item
          );

          set({
            board: {
              ...board,
              items_page: {
                ...board.items_page,
                items: updatedItems,
              },
            },
          });
        } catch (err) {
          console.error("Failed to update item schedule status", err);
          toast.error(
            "Failed to update item schedule status. Please try again."
          );
          throw err;
        }
      },

      init: async () => {
        const store = get();
        await store.loadBoard();
        await store.loadSettings();
      },

      checkDuplicate: (item: Item): boolean => {
        const { board } = get();
        if (!board) return false;

        return hasDuplicateFirstValue(item, board.items_page.items);
      },
    };
  }),
  { name: "order-store" }
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
