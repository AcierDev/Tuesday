// components/settings/SettingsPanel.tsx

"use client"

import { X, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { AutomatronSettings } from './AutomatronSettings'
import { ColumnVisibilitySettings } from './ColumnVisibilitySettings'
import { DueBadgeSettings } from './DueBadgeSettings'
import { RecentEditsSettings } from './RecentEditsSettings'

import { useOrderSettings } from '../../contexts/OrderSettingsContext'
import { GroupingSettings } from './GroupSettings'

interface SettingsPanelProps {
  onClose: () => void
}

export const SettingsPanel = ({ onClose }: SettingsPanelProps) => {
  const { settings, updateSettings, updateColumnVisibility } = useOrderSettings()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const saveSettings = () => {
    toast.success('Settings saved successfully')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Settings</h2>
            <div className="flex items-center space-x-4">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Button size="icon" variant="ghost" onClick={onClose}>
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>
          <Tabs defaultValue="automatron">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="automatron">Automatron</TabsTrigger>
              <TabsTrigger value="columns">Column Visibility</TabsTrigger>
              <TabsTrigger value="due-badge">Due Badge</TabsTrigger>
              <TabsTrigger value="grouping">Grouping</TabsTrigger>
              <TabsTrigger value="recent-edits">Recent Edits</TabsTrigger>
            </TabsList>
            <TabsContent value="automatron">
              <AutomatronSettings
                automatronRules={settings.automatronRules}
                isAutomatronActive={settings.isAutomatronActive}
                updateSettings={updateSettings}
              />
            </TabsContent>
            <TabsContent value="columns">
              <ColumnVisibilitySettings
                columnVisibility={settings.columnVisibility}
                showSortingIcons={settings.showSortingIcons ?? true}
                updateSettings={updateSettings}
                updateColumnVisibility={updateColumnVisibility}
              />
            </TabsContent>
            <TabsContent value="due-badge">
              <DueBadgeSettings
                dueBadgeDays={settings.dueBadgeDays}
                updateSettings={updateSettings}
              />
            </TabsContent>
            <TabsContent value="grouping">
              <GroupingSettings
                groupingField={settings.groupingField}
                showCompletedOrders={settings.showCompletedOrders}
                updateSettings={updateSettings}
              />
            </TabsContent>
            <TabsContent value="recent-edits">
              <RecentEditsSettings
                recentEditHours={settings.recentEditHours}
                updateSettings={updateSettings}
              />
            </TabsContent>
          </Tabs>
          <div className="mt-6">
            <Button onClick={saveSettings}>Save Settings</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
