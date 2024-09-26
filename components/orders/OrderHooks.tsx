import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { type Board, type Item, ItemStatus, Settings } from "@/typings/types"

export function useBoardOperations(initialBoard: Board | null, collection: any, settings: Settings) {
  const [board, setBoard] = useState<Board | null>(initialBoard)

  useEffect(() => {
    setBoard(initialBoard);
  }, [initialBoard]);

  const applyAutomatronRules = useCallback((item: Item) => {
    if (!settings.isAutomatronActive) return item

    const updatedItem = { ...item }
    let statusChanged = false

    for (const rule of settings.automatronRules) {
      const value = item.values.find(
        (v) => v.columnName === rule.field
      )?.text
      if (value === rule.value && item.status !== rule.newStatus) {
        updatedItem.status = rule.newStatus as ItemStatus
        statusChanged = true
        break
      }
    }

    if (statusChanged) {
      console.log(
        `Automatron applied: Item ${item.id} status updated to ${updatedItem.status}`
      )
      toast.success(`Item status updated to ${updatedItem.status}`, {
        style: { background: "#10B981", color: "white" },
      })
    }

    return updatedItem
  }, [settings.isAutomatronActive, settings.automatronRules])

  const updateItem = useCallback(async (updatedItem: Item) => {
    if (!board) return
    console.log(`Updating item: ${updatedItem.id}`)

    const updatedItems = board.items_page.items.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    )

    try {
      await collection.updateOne(
        { id: board.id },
        { $set: { "items_page.items": updatedItems } }
      )
      console.log("Database update successful")
      setBoard({
        ...board,
        items_page: { ...board.items_page, items: updatedItems },
      })
      console.log("Board state updated")

      const itemWithRulesApplied = applyAutomatronRules(updatedItem)
      if (itemWithRulesApplied.status !== updatedItem.status) {
        await updateItem(itemWithRulesApplied)
      }
    } catch (err) {
      console.error("Failed to update item", err)
      toast.error("Failed to update item. Please try again.", {
        style: { background: "#EF4444", color: "white" },
      })
      throw err
    }
  }, [board, collection, applyAutomatronRules])

  const addNewItem = useCallback(async (newItem: Partial<Item>) => {
    if (!board) return

    const fullNewItem: Item = {
      id: Date.now().toString(),
      values: newItem.values || [],
      createdAt: Date.now(),
      status: ItemStatus.New,
      vertical: newItem.vertical,
      visible: true,
      deleted: false,
    }

    console.log("Adding new item:", fullNewItem)

    try {
      await collection.updateOne(
        { id: board.id },
        { $push: { "items_page.items": fullNewItem } }
      )
      setBoard({
        ...board,
        items_page: {
          ...board.items_page,
          items: [...board.items_page.items, fullNewItem],
        },
      })
      console.log("New item added successfully")
      toast.success("New item added successfully", {
        style: { background: "#10B981", color: "white" },
      })
    } catch (err) {
      console.error("Failed to add new item", err)
      toast.error("Failed to add new item. Please try again.", {
        style: { background: "#EF4444", color: "white" },
      })
    }
  }, [board, collection])

  const deleteItem = useCallback(async (itemId: string) => {
    if (!board) return

    console.log(`Marking item as deleted: ${itemId}`)

    try {
      // Update the item in the database
      await collection.updateOne(
        { id: board.id, "items_page.items.id": itemId },
        { $set: { "items_page.items.$.deleted": true } }
      )

      // Update the local state
      setBoard({
        ...board,
        items_page: {
          ...board.items_page,
          items: board.items_page.items.map((item) =>
            item.id === itemId ? { ...item, deleted: true } : item
          ),
        },
      })

      console.log("Item marked as deleted successfully")
      toast.success("Item marked as deleted successfully", {
        style: { background: "#10B981", color: "white" },
      })
    } catch (err) {
      console.error("Failed to mark item as deleted", err)
      toast.error("Failed to delete item. Please try again.", {
        style: { background: "#EF4444", color: "white" },
      })
    }
  }, [board, collection, setBoard])

  return {
    board,
    setBoard,
    applyAutomatronRules,
    updateItem,
    addNewItem,
    deleteItem,
  }
}