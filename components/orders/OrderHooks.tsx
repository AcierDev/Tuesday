import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useActivities } from "@/hooks/useActivities";

import {
  type Board,
  type Item,
  ItemStatus,
  OrderSettings,
  ColumnTitles,
  AutomatronRule,
} from "@/typings/types";

export function useBoardOperations(
  initialBoard: Board | null,
  collection: any,
  settings: OrderSettings
) {
  const [board, setBoard] = useState<Board | null>(initialBoard);
  const { logActivity } = useActivities();

  useEffect(() => {
    setBoard(initialBoard);
  }, [initialBoard]);

  const applyAutomatronRules = useCallback(
    (item: Item, changedField: ColumnTitles) => {
      if (!settings.isAutomatronActive) return item;

      const updatedItem = { ...item };
      let statusChanged = false;

      const relevantRules: AutomatronRule[] = settings.automatronRules.filter(
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
        toast.success(`Item status updated to ${updatedItem.status}`, {
          style: { background: "#10B981", color: "white" },
        });
      }

      return updatedItem;
    },
    [settings.isAutomatronActive, settings.automatronRules]
  );

  const updateItem = useCallback(
    async (
      updatedItem: Item,
      changedField: ColumnTitles | "status",
      skipActivityLog?: boolean
    ) => {
      if (!board) return;

      const currentTimestamp = Date.now();
      const originalItem = board.items_page.items.find(
        (item) => item.id === updatedItem.id
      );

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
        await collection.updateOne(
          { id: board.id, "items_page.items.id": itemWithUpdatedTimestamp.id },
          {
            $set: {
              "items_page.items.$": itemWithUpdatedTimestamp,
            },
          }
        );

        if (!skipActivityLog && changedField !== "status") {
          const originalValue = originalItem?.values.find(
            (v) => v.columnName === changedField
          )?.text;
          const newValue = updatedItem.values.find(
            (v) => v.columnName === changedField
          )?.text;

          if (originalValue !== newValue) {
            await logActivity(
              updatedItem.id,
              "update",
              [
                {
                  field: changedField,
                  oldValue: originalValue || "",
                  newValue: newValue || "",
                },
              ],
              {
                customerName: updatedItem.values.find(
                  (v) => v.columnName === ColumnTitles.Customer_Name
                )?.text,
                design: updatedItem.values.find(
                  (v) => v.columnName === ColumnTitles.Design
                )?.text,
                size: updatedItem.values.find(
                  (v) => v.columnName === ColumnTitles.Size
                )?.text,
              }
            );
          }
        }

        setBoard({
          ...board,
          items_page: {
            ...board.items_page,
            items: board.items_page.items.map((item) =>
              item.id === itemWithUpdatedTimestamp.id
                ? itemWithUpdatedTimestamp
                : item
            ),
          },
        });

        const itemWithRulesApplied = applyAutomatronRules(
          itemWithUpdatedTimestamp,
          changedField as ColumnTitles
        );
        if (itemWithRulesApplied.status !== itemWithUpdatedTimestamp.status) {
          await updateItem(itemWithRulesApplied, changedField);
        }
      } catch (err) {
        toast.error("Failed to update item. Please try again.", {
          style: { background: "#EF4444", color: "white" },
        });
        throw err;
      }
    },
    [board, collection, applyAutomatronRules, logActivity]
  );

  const addNewItem = useCallback(
    async (newItem: Partial<Item>) => {
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
        await collection.updateOne(
          { id: board.id },
          { $push: { "items_page.items": fullNewItem } }
        );

        await logActivity(fullNewItem.id, "create", [], {
          customerName: fullNewItem.values.find(
            (v) => v.columnName === ColumnTitles.Customer_Name
          )?.text,
          design: fullNewItem.values.find(
            (v) => v.columnName === ColumnTitles.Design
          )?.text,
          size: fullNewItem.values.find(
            (v) => v.columnName === ColumnTitles.Size
          )?.text,
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
        toast.error("Failed to add new item. Please try again.", {
          style: { background: "#EF4444", color: "white" },
        });
      }
    },
    [board, collection, logActivity]
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      if (!board) return;

      try {
        const itemToDelete = board.items_page.items.find(
          (item) => item.id === itemId
        );
        if (!itemToDelete) {
          return;
        }

        await collection.updateOne(
          { id: board.id, "items_page.items.id": itemId },
          { $set: { "items_page.items.$.deleted": true } }
        );

        setBoard({
          ...board,
          items_page: {
            ...board.items_page,
            items: board.items_page.items.map((item) =>
              item.id === itemId ? { ...item, deleted: true } : item
            ),
          },
        });

        await logActivity(itemId, "delete", [], {
          customerName: itemToDelete.values.find(
            (v) => v.columnName === ColumnTitles.Customer_Name
          )?.text,
          design: itemToDelete.values.find(
            (v) => v.columnName === ColumnTitles.Design
          )?.text,
          size: itemToDelete.values.find(
            (v) => v.columnName === ColumnTitles.Size
          )?.text,
        });

        toast.success("Item marked as deleted successfully", {
          style: { background: "#10B981", color: "white" },
        });
      } catch (err) {
        toast.error("Failed to delete item. Please try again.", {
          style: { background: "#EF4444", color: "white" },
        });
      }
    },
    [board, collection, setBoard, logActivity]
  );

  return {
    board,
    setBoard,
    applyAutomatronRules,
    updateItem,
    addNewItem,
    deleteItem,
  };
}
