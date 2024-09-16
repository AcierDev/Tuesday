"use client"

import { useState, useCallback, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, Settings as SettingsIcon } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { Board, Group, Item, ItemStatus } from '../app/typings/types'
import { useRealmApp } from '../app/hooks/useRealmApp'
import { ColumnTitles } from '../app/typings/types'
import { ItemGroupSection } from './item-group-section'
import { useOrderSettings } from './contexts-order-settings-context'
import { SettingsPanel } from './settings-panel'
import { NewItemModal } from './components-new-item-modal'
import { ShippingDashboard } from './shipping-dashboard'
import { Dialog, DialogContent } from "@/components/ui/dialog"

export function OrderManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const { collection } = useRealmApp()
  const [board, setBoard] = useState<Board | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isNewItemModalOpen, setIsNewItemModalOpen] =useState(false)
  const { settings } = useOrderSettings()
  const [isLoading, setIsLoading] = useState(true)
  const [isShippingDashboardOpen, setIsShippingDashboardOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  useEffect(() => {
    setIsLoading(false)
  }, [settings])

  useEffect(() => {
    if (collection) {
      loadBoard()
    }
  }, [collection])

  // Debug: Log board updates
  useEffect(() => {
    console.log("Board updated:", board);
  }, [board]);

  const loadBoard = useCallback(async () => {
    try {
      const loadedBoard = await collection.findOne({ /* query to find the board */ })
      setBoard(loadedBoard)
      console.log("Board loaded:", loadedBoard);
    } catch (err) {
      console.error("Failed to load board", err)
      toast.error("Failed to load board. Please refresh the page.", {
        style: { background: '#EF4444', color: 'white' }
      })
    }
  }, [collection])

  const applyAutomatronRules = useCallback(async (item: Item) => {
    if (!settings.isAutomatronActive) return item;

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

    if (statusChanged && board) {
      try {
        await collection.updateOne(
          { id: board.id, "items_page.items.id": item.id },
          { $set: { "items_page.items.$.status": updatedItem.status } }
        );
        console.log(`Automatron applied: Item ${item.id} status updated to ${updatedItem.status}`);
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
    console.log(`Updating item: ${itemId}, column: ${columnName}, new value: ${newValue}`);

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

    console.log("Updated items:", updatedItems);

    try {
      await collection.updateOne(
        { id: board.id },
        { $set: { "items_page.items": updatedItems } }
      );
      console.log("Database update successful");
      setBoard({ ...board, items_page: { ...board.items_page, items: updatedItems } });
      console.log("Board state updated");
    } catch (err) {
      console.error("Failed to update item", err);
      throw err;
    }
  }, [board, collection, applyAutomatronRules]);

  const addNewItem = useCallback(async (newItem: Partial<Item>) => {
    if (!board) return

    const fullNewItem: Item = {
      id: Date.now().toString(),
      values: newItem.values || [],
      createdAt: Date.now(),
      status: ItemStatus.New
    }

    console.log("Adding new item:", fullNewItem);

    try {
      await collection.updateOne(
        { id: board.id },
        { $push: { "items_page.items": fullNewItem } }
      )
      setBoard({
        ...board,
        items_page: {
          ...board.items_page,
          items: [...board.items_page.items, fullNewItem]
        }
      })
      console.log("New item added successfully");
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

    console.log(`Deleting item: ${itemId}`);

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
      console.log("Item deleted successfully");
      toast.success("Item deleted successfully", {
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
    console.log(`Shipping item: ${itemId}`);
    toast.success("Item marked as shipped", {
      style: { background: '#10B981', color: 'white' }
    })
  }, [])

  const markItemCompleted = useCallback(async (itemId: string) => {
    console.log(`Marking item as completed: ${itemId}`);
    toast.success("Item marked as completed", {
      style: { background: '#10B981', color: 'white' }
    })
  }, [])

  const onGetLabel = useCallback((item: Item) => {
    console.log(`Getting label for item: ${item.id}`);
    setSelectedItem(item)
    setIsShippingDashboardOpen(true)
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

  const sortedGroups = [...filteredGroups].sort((a, b) => {
    const aIndex = Object.values(ItemStatus).indexOf(a.title as ItemStatus)
    const bIndex = Object.values(ItemStatus).indexOf(b.title as ItemStatus)
    if (aIndex === -1 && bIndex === -1) return 0
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-center" />
      <div className="sticky top-0 z-10 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between py-4 space-y-4 sm:space-y-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Order Management</h1>
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-2 w-full sm:w-auto">
                <Button onClick={() => setIsNewItemModalOpen(true)} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition duration-300 ease-in-out flex-grow sm:flex-grow-0">
                  <Plus className="mr-2 h-5 w-5" /> New Order
                </Button>
                <Button onClick={() => setIsSettingsOpen(true)} variant="outline" className="flex-grow sm:flex-grow-0">
                  <SettingsIcon className="mr-2 h-5 w-5" /> Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {sortedGroups.map(group => (
          <ItemGroupSection
            key={group.id}
            group={group}
            board={board!}
            onUpdate={updateItem}
            onDelete={deleteItem}
            onShip={shipItem}
            onMarkCompleted={markItemCompleted}
            onGetLabel={onGetLabel}
          />
        ))}
      </div>
      {isSettingsOpen && <SettingsPanel onClose={() => setIsSettingsOpen(false)} />}
      <NewItemModal
        isOpen={isNewItemModalOpen}
        onClose={() => setIsNewItemModalOpen(false)}
        onSubmit={addNewItem}
      />
      <Dialog open={isShippingDashboardOpen} onOpenChange={setIsShippingDashboardOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedItem && (
            <ShippingDashboard
              item={selectedItem}
              onClose={() => {
                setIsShippingDashboardOpen(false)
                setSelectedItem(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}