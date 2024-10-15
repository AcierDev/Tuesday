'use client'

import { useCallback, useEffect, useState } from "react"
import { useRealmApp } from "@/hooks/useRealmApp"
import { Toaster, toast } from "sonner"
import AddInventoryItemDialog from "@/components/inventory/AddInventoryItemDialog"
import SummaryCards from "@/components/inventory/SummaryCards"
import { CountFrequency, InventoryCategory, InventoryItem } from "@/typings/types"
import { useUser } from "@/contexts/UserContext"
import { SearchAndFilter } from "@/components/inventory/SearchAndFilter"
import { InventoryTable } from "@/components/inventory/InventoryTable"

export default function InventoryManagement() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [countFilter, setCountFilter] = useState<"All" | CountFrequency>("All")
  const [showAddItemDialog, setShowAddItemDialog] = useState(false)
  const { inventoryCollection, isLoading } = useRealmApp()

  const loadInventory = useCallback(async () => {
    if (!inventoryCollection) return

    try {
      const inventoryData = await inventoryCollection.find({})
      setInventory(inventoryData)
    } catch (err) {
      console.error("Failed to fetch inventory", err)
      toast.error("Failed to fetch inventory. Please refresh the page.", {
        style: { background: "#EF4444", color: "white" },
      })
    }
  }, [inventoryCollection])

  useEffect(() => {
    if (!isLoading && inventoryCollection) {
      loadInventory()
    }
  }, [isLoading, inventoryCollection, loadInventory])

  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (countFilter === "All" || item.countFrequency === countFilter)
  )

  const lowStockItems = inventory.filter(item => {
    const latestCount = item.countHistory[item.countHistory.length - 1]
    return latestCount && latestCount.quantity <= item.restockQuantity
  })

  const addItem = async (newItem: InventoryItem) => {
    try {
      const result = await inventoryCollection!.insertOne(newItem)
      if (result.insertedId) {
        setInventory([...inventory, { ...newItem, _id: result.insertedId }])
        setShowAddItemDialog(false)
        toast.success("Item added successfully")
      }
    } catch (err) {
      console.error("Failed to add item", err)
      toast.error("Failed to add item. Please try again.", {
        style: { background: "#EF4444", color: "white" },
      })
    }
  }

  const updateItem = async (itemId: number, field: string, value: string | number) => {
    try {
      const updatedItem = inventory.find(item => item._id == itemId)
      if (!updatedItem) return

      let updateData: any = { [field]: value }

      if (field === 'quantity') {
        const newQuantity = Number(value)
        const lastCount = updatedItem.countHistory[updatedItem.countHistory.length - 1]
        if (lastCount && newQuantity !== lastCount.quantity) {
          const newCountHistory = [
            ...updatedItem.countHistory,
            { quantity: newQuantity, timestamp: new Date() }
          ]
          updateData = { countHistory: newCountHistory }
        } else {
          return
        }
      }

      const result = await inventoryCollection!.updateOne(
        { _id: itemId },
        { $set: updateData }
      )

      if (result.modifiedCount > 0) {
        setInventory(inventory.map(item => 
          item._id == itemId 
            ? { ...item, ...updateData } 
            : item
        ))
        toast.success(`${field} updated successfully`)
      }
    } catch (err) {
      console.error(`Failed to update ${field}`, err)
      toast.error(`Failed to update ${field}. Please try again.`, {
        style: { background: "#EF4444", color: "white" },
      })
    }
  }

  const deleteItem = async (itemId: number) => {
    try {
      const result = await inventoryCollection!.deleteOne({ _id: itemId })
      if (result.deletedCount > 0) {
        setInventory(inventory.filter(item => item._id !== itemId))
        toast.success("Item deleted successfully")
      }
    } catch (err) {
      console.error("Failed to delete item", err)
      toast.error("Failed to delete item. Please try again.", {
        style: { background: "#EF4444", color: "white" },
      })
    }
  }

  const handleCountFilterChange = (filter: "All" | CountFrequency) => {
    setCountFilter(prevFilter => prevFilter === filter ? "All" : filter)
  }

  const categoriesWithItems = Object.values(InventoryCategory).filter(category =>
    filteredInventory.some(item => item.category === category)
  )

  const uncategorizedItems = filteredInventory.filter(item => !item.category || !Object.values(InventoryCategory).includes(item.category))

  return (
    <div className="p-8 bg-background text-foreground dark:bg-gray-900">
      <Toaster position="top-center"/>
      <h1 className="text-3xl font-bold mb-6">Inventory Management</h1>

      <SummaryCards
        inventory={inventory}
        lowStockItems={lowStockItems}
        countFilter={countFilter}
        handleCountFilterChange={handleCountFilterChange}
      />

      <SearchAndFilter
        countFilter={countFilter}
        handleCountFilterChange={handleCountFilterChange}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setShowAddItemDialog={setShowAddItemDialog}
      />

      <AddInventoryItemDialog
        showAddItemDialog={showAddItemDialog}
        setShowAddItemDialog={setShowAddItemDialog}
        addItem={addItem}
      />

      {categoriesWithItems.map(category => (
        <div key={category} className="mt-8">
          <h2 className="text-2xl font-semibold mb-4 sticky top-0 dark:bg-gray-900 z-10 pt-3 pb-2">{category}</h2>
          <InventoryTable
            filteredInventory={filteredInventory.filter(item => item.category === category)}
            updateItem={updateItem}
            deleteItem={deleteItem}
          />
        </div>
      ))}

      {uncategorizedItems.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Uncategorized</h2>
          <InventoryTable
            filteredInventory={uncategorizedItems}
            updateItem={updateItem}
            deleteItem={deleteItem}
          />
        </div>
      )}
    </div>
  )
}