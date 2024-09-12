"use client"

import { useState, useCallback, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, Settings as SettingsIcon } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { Board, Group, Item, ItemStatus } from '../app/typings/types'
import { useRealmApp } from '../app/hooks/useRealmApp'
import { ColumnTitles } from '../app/typings/types'
import { ItemGroupSection } from './item-group-section'
import { boardConfig } from '@/app/config/boardconfig'
import { useOrderSettings } from './contexts-order-settings-context'
import { SettingsPanel } from './settings-panel'

export function OrderManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const { collection } = useRealmApp()
  const [board, setBoard] = useState<Board | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { settings } = useOrderSettings()

  useEffect(() => {
    if (collection) {
      loadBoard()
    }
  }, [collection])

  const loadBoard = useCallback(async () => {
    try {
      const loadedBoard = await collection.findOne({ /* query to find the board */ })
      setBoard(loadedBoard)
    } catch (err) {
      console.error("Failed to load board", err)
      toast.error("Failed to load board. Please refresh the page.", {
        style: { background: '#EF4444', color: 'white' }
      })
    }
  }, [collection])

  const applyAutomatronRules = useCallback(async (item: Item) => {
    console.log(settings.isAutomatronActive)
    if (!settings.isAutomatronActive) return item;
    console.log("Automatron is active")

    let updatedItem = { ...item };
    let statusChanged = false;

    for (const rule of settings.automatronRules) {
      const value = item.values.find(v => v.columnName === rule.field)?.text;
      if (value === rule.value && item.status !== rule.newStatus) {
        updatedItem.status = rule.newStatus as ItemStatus;
        statusChanged = true;
        break;
      }
    }
  

    if (statusChanged) {
      try {
        await collection.updateOne(
          { id: board!.id, "items_page.items.id": item.id },
          { $set: { "items_page.items.$.status": updatedItem.status } }
        );
        toast.success(`Item status updated to ${updatedItem.status}`, {
          style: { background: '#10B981', color: 'white' }
        });
      } catch (err) {
        console.error("Failed to update item status", err);
        toast.error("Failed to update item status. Please try again.", {
          style: { background: '#EF4444', color: 'white' }
        });
      }
    }

    return updatedItem;
  }, [settings.isAutomatronActive, settings.automatronRules, collection, board]);

  const updateItem = useCallback(async (itemId: string, columnName: string, newValue: string) => {
    if (!board) return;

    const updatedItems = await Promise.all(board.items_page.items.map(async (item) => {
      if (item.id === itemId) {
        const updatedItem = {
          ...item,
          values: item.values.map(value => 
            value.columnName === columnName ? { ...value, text: newValue } : value
          )
        };
        return await applyAutomatronRules(updatedItem);
      }
      return item;
    }));

    try {
      await collection.updateOne(
        { id: board.id },
        { $set: { "items_page.items": updatedItems } }
      );
      setBoard({ ...board, items_page: { ...board.items_page, items: updatedItems } });
    } catch (err) {
      console.error("Failed to update item", err);
      throw err;
    }
  }, [board, collection, applyAutomatronRules]);

  const addNewItem = useCallback(async () => {
    if (!board) return

    const newItem: Item = {
      id: Date.now().toString(),
      values: Object.values(ColumnTitles).map(title => ({
        columnName: title,
        type: boardConfig.columns[title].type,
        text: ''
      })),
      createdAt: Date.now(),
      status: ItemStatus.New
    }

    try {
      await collection.updateOne(
        { id: board.id },
        { $push: { "items_page.items": newItem } }
      )
      setBoard({
        ...board,
        items_page: {
          ...board.items_page,
          items: [...board.items_page.items, newItem]
        }
      })
      toast.success("New item added successfully", {
        style: { background: '#10B981', color: 'white' }
      })
    } catch (err) {
      console.error("Failed to add new item", err)
      toast.error("Failed to add new item. Please try again.", {
        style: { background: '#EF4444', color: 'white' }
      })
    }
  }, [board, collection])

  const deleteItem = useCallback(async (itemId: string) => {
    if (!board) return

    try {
      await collection.updateOne(
        { id: board.id },
        { $pull: { "items_page.items": { id: itemId } } }
      )
      setBoard({
        ...board,
        items_page: {
          ...board.items_page,
          items: board.items_page.items.filter(item => item.id !== itemId)
        }
      })
      toast.success("Item deleted d successfully", {
        style: { background: '#10B981', color: 'white' }
      })
    } catch (err) {
      console.error("Failed to delete item", err)
      toast.error("Failed to delete item. Please try again.", {
        style: { background: '#EF4444', color: 'white' }
      })
    }
  }, [board, collection])

  const shipItem = useCallback(async (itemId: string) => {
    // Implement shipping logic here
    toast.success("Item marked as shipped", {
      style: { background: '#10B981', color: 'white' }
    })
  }, [])

  const markItemCompleted = useCallback(async (itemId: string) => {
    // Implement completion logic here
    toast.success("Item marked as completed", {
      style: { background: '#10B981', color: 'white' }
    })
  }, [])

  const filteredGroups = board?.items_page.items.reduce((groups, item) => {
    const groupField = settings.groupingField === 'Status' ? item.status : item.values.find(v => v.columnName === settings.groupingField)?.text || 'Other'
    const group = groups.find(g => g.title === groupField) || { id: groupField, title: groupField, items: [] }
    if (!groups.some(g => g.id === group.id)) {
      groups.push(group)
    }
    if (item.values.some(value => {
      const valueText = String(value.text || '').toLowerCase();
      return valueText.includes(searchTerm.toLowerCase());
    })) {
      if (settings.groupingField !== 'Status' || settings.showCompletedOrders || item.status !== ItemStatus.Done) {
        group.items.push(item)
      }
    }
    return groups
  }, [] as Group[]) || []

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <Button onClick={() => setIsSettingsOpen(true)} variant="outline">
            <SettingsIcon className="mr-2 h-5 w-5" /> Settings
          </Button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Button onClick={addNewItem} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition duration-300 ease-in-out">
              <Plus className="mr-2 h-5 w-5" /> New Order
            </Button>
          </div>
        </div>
        {filteredGroups.map(group => (
          <ItemGroupSection
            key={group.id}
            group={group}
            board={board!}
            onUpdate={updateItem}
            onDelete={deleteItem}
            onShip={shipItem}
            onMarkCompleted={markItemCompleted}
          />
        ))}
      </div>
      {isSettingsOpen && <SettingsPanel onClose={() => setIsSettingsOpen(false)} />}
    </div>
  )
}