import { useCallback, useState, useEffect } from "react";
import { toast } from "sonner";
import { UpdateFilter } from "mongodb";
import { Board, Item, ItemStatus, ColumnTitles } from "@/typings/types";
import { useBoardWatch } from "./useBoardWatch";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";

type BoardUpdateData = UpdateFilter<Board> & {
  arrayFilters?: Array<Record<string, any>>;
};

type UseBoardOperationsReturn = {
  board: Board | null;
  setBoard: (board: Board | null) => void;
  isLoading: boolean;
  isError: boolean;
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  applyAutomatronRules: (item: Item, changedField: ColumnTitles) => Item;
  updateItem: (updatedItem: Item, changedField: ColumnTitles) => Promise<void>;
  addNewItem: (newItem: Partial<Item>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  refreshBoard: () => Promise<void>;
  updateBoardInDb: (
    boardId: string,
    updateData: BoardUpdateData
  ) => Promise<any>;
};

export function useBoardOperations(
  initialBoard?: Board | null
): UseBoardOperationsReturn {
  const [board, setBoard] = useState<Board | null>(initialBoard ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "reconnecting"
  >("disconnected");

  const { settings } = useOrderSettings();

  useBoardWatch(board?.id, {
    onBoardUpdate: setBoard,
    onConnectionChange: setConnectionStatus,
    maxReconnectAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
  });

  const loadBoard = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await fetch("/api/board");
      if (!response.ok) throw new Error("Failed to load board");
      const { data } = await response.json();
      setBoard(data);
      console.log("Board loaded:", data);
    } catch (err) {
      console.error("Failed to load board", err);
      setIsError(true);
      toast.error("Failed to load board. Please refresh the page.", {
        style: { background: "#EF4444", color: "white" },
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const updateBoardInDb = async (
    boardId: string,
    updateData: BoardUpdateData
  ) => {
    const response = await fetch("/api/board", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        boardId,
        updateData,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update board");
    }

    return response.json();
  };

  const applyAutomatronRules = useCallback(
    (item: Item, changedField: ColumnTitles) => {
      if (!settings.isAutomatronActive) return item;

      const updatedItem = { ...item };
      let statusChanged = false;

      const relevantRules = settings.automatronRules.filter(
        (rule) => rule.field === changedField
      );

      for (const rule of relevantRules) {
        const value = item.values.find(
          (v) => v.columnName === rule.field
        )?.text;
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
        toast.success(`Item status updated to ${updatedItem.status}`, {
          style: { background: "#10B981", color: "white" },
        });
      }

      return updatedItem;
    },
    [settings.isAutomatronActive, settings.automatronRules]
  );

  const updateItem = useCallback(
    async (updatedItem: Item, changedField: ColumnTitles) => {
      if (!board) {
        console.warn("Attempted to update item while board is null");
        return;
      }

      console.log(
        `Updating item: ${updatedItem.id}, Changed field: ${changedField}`
      );

      const currentTimestamp = Date.now();

      const updatedValues = updatedItem.values.map((value) =>
        value.columnName === changedField
          ? { ...value, lastModifiedTimestamp: currentTimestamp }
          : value
      );

      const itemWithUpdatedTimestamp = {
        ...updatedItem,
        values: updatedValues,
      };

      try {
        await updateBoardInDb(board.id, {
          $set: {
            [`items_page.items.$[elem]`]: itemWithUpdatedTimestamp,
          },
          arrayFilters: [{ "elem.id": itemWithUpdatedTimestamp.id }],
        });

        const updatedItems = board.items_page.items.map((item) =>
          item.id === itemWithUpdatedTimestamp.id
            ? itemWithUpdatedTimestamp
            : item
        );

        setBoard({
          ...board,
          items_page: { ...board.items_page, items: updatedItems },
        });

        const itemWithRulesApplied = applyAutomatronRules(
          itemWithUpdatedTimestamp,
          changedField
        );

        if (itemWithRulesApplied.status !== itemWithUpdatedTimestamp.status) {
          await updateItem(itemWithRulesApplied, changedField);
        }
      } catch (err) {
        console.error("Failed to update item", err);
        toast.error("Failed to update item. Please try again.", {
          style: { background: "#EF4444", color: "white" },
        });
        throw err;
      }
    },
    [board, applyAutomatronRules]
  );

  const addNewItem = useCallback(
    async (newItem: Partial<Item>) => {
      if (!board) {
        console.warn("Attempted to add new item while board is null");
        return;
      }

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
        await updateBoardInDb(board.id, {
          $push: { "items_page.items": fullNewItem },
        });

        setBoard({
          ...board,
          items_page: {
            ...board.items_page,
            items: [...board.items_page.items, fullNewItem],
          },
        });

        toast.success("New item added successfully", {
          style: { background: "#10B981", color: "white" },
        });
      } catch (err) {
        console.error("Failed to add new item", err);
        toast.error("Failed to add new item. Please try again.", {
          style: { background: "#EF4444", color: "white" },
        });
      }
    },
    [board]
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      if (!board) {
        console.warn("Attempted to delete item while board is null");
        return;
      }

      try {
        await updateBoardInDb(board.id, {
          $set: {
            "items_page.items.$[elem].deleted": true,
          },
          arrayFilters: [{ "elem.id": itemId }],
        });

        setBoard({
          ...board,
          items_page: {
            ...board.items_page,
            items: board.items_page.items.map((item) =>
              item.id === itemId ? { ...item, deleted: true } : item
            ),
          },
        });

        toast.success("Item marked as deleted successfully", {
          style: { background: "#10B981", color: "white" },
        });
      } catch (err) {
        console.error("Failed to mark item as deleted", err);
        toast.error("Failed to delete item. Please try again.", {
          style: { background: "#EF4444", color: "white" },
        });
      }
    },
    [board]
  );

  return {
    board,
    setBoard,
    isLoading,
    isError,
    connectionStatus,
    applyAutomatronRules,
    updateItem,
    addNewItem,
    deleteItem,
    refreshBoard: loadBoard,
    updateBoardInDb,
  };
}
