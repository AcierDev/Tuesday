import { ColumnTitles, ItemStatus } from '@/typings/types'
import { useState, useEffect } from 'react'

export type AutomatronRule = {
  id: string
  field: string
  value: string
  newStatus: string
}

export type ColumnVisibility = {
  [key: string]: {
    [key: string]: boolean
  }
}

export type StatusColors = {
  [key: string]: string
}

export type OrderSettings = {
  automatronRules: AutomatronRule[]
  isAutomatronActive: boolean
  columnVisibility: ColumnVisibility
  dueBadgeDays: number
  statusColors: StatusColors
  groupingField: string
  showCompletedOrders: boolean
}


const defaultColumnVisibility: ColumnVisibility = {}
Object.values(ItemStatus).forEach(group => {
  defaultColumnVisibility[group] = {}
  Object.values(ColumnTitles).forEach(field => {
    defaultColumnVisibility[group][field] = true
  })
})

const defaultSettings: OrderSettings = {
  automatronRules: [],
  columnVisibility: defaultColumnVisibility,
  isAutomatronActive: false,
  dueBadgeDays: 3,
  statusColors: {
    'Done': 'bg-green-100',
    'Stuck': 'bg-red-100',
    'Working On It': 'bg-yellow-100',
    'New': 'bg-blue-100'
  },
  groupingField: 'Status',
  showCompletedOrders: true
}

export function useOrderSettings() {
  const [settings, setSettings] = useState<OrderSettings>(defaultSettings)

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('orderSettings')
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings)
      // Ensure all columns are present in the loaded settings
      Object.values(ItemStatus).forEach(group => {
        if (!parsedSettings.columnVisibility[group]) {
          parsedSettings.columnVisibility[group] = {}
        }
        Object.values(ColumnTitles).forEach(field => {
          if (parsedSettings.columnVisibility[group][field] === undefined) {
            parsedSettings.columnVisibility[group][field] = true
          }
        })
      })
      setSettings(parsedSettings)
    }
  }, [])

  const updateSettings = (newSettings: Partial<OrderSettings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)
    localStorage.setItem('orderSettings', JSON.stringify(updatedSettings))
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
    localStorage.removeItem('orderSettings')
  }

  return {
    settings,
    updateSettings,
    resetSettings,
  }
}