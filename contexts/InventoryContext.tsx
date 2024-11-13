'use client'

import React, { createContext, useContext } from 'react'
import { useInventory } from '@/hooks/useInventory'
import { InventoryItem, CountFrequency } from '@/typings/types'

type InventoryContextType = {
  inventory: InventoryItem[]
  isLoading: boolean
  addItem: (newItem: InventoryItem) => Promise<boolean>
  updateItem: (itemId: number, field: string, value: string | number) => Promise<boolean>
  deleteItem: (itemId: number) => Promise<boolean>
  getLowStockItems: () => InventoryItem[]
  getFilteredInventory: (searchTerm: string, countFilter: "All" | CountFrequency) => InventoryItem[]
  getItemByName: (name: string) => InventoryItem | undefined
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined)

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const inventoryHook = useInventory()

  return (
    <InventoryContext.Provider value={inventoryHook}>
      {children}
    </InventoryContext.Provider>
  )
}

export const useInventoryContext = () => {
  const context = useContext(InventoryContext)
  if (context === undefined) {
    throw new Error('useInventoryContext must be used within an InventoryProvider')
  }
  return context
}