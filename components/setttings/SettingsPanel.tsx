"use client"

import { X, Moon, Sun, Settings, Columns, Clock, Group, Edit } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { AutomatronSettings } from './AutomatronSettings'
import { ColumnVisibilitySettings } from './ColumnVisibilitySettings'
import { DueBadgeSettings } from './DueBadgeSettings'
import { RecentEditsSettings } from './RecentEditsSettings'
import { GroupingSettings } from './GroupSettings'

import { useOrderSettings } from '../../contexts/OrderSettingsContext'

interface SettingsPanelProps {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background text-foreground rounded-lg shadow-lg w-full max-w-4xl h-[90vh] overflow-hidden flex dark:bg-gray-700">
        <Tabs defaultValue="automatron" className="flex h-full w-full">
          <TabsList className="h-full w-64 flex flex-col items-stretch space-y-1 rounded-l-lg border-r bg-muted p-4 dark:bg-gray-800">
            <div className="mb-6 px-2">
              <h2 className="text-lg font-semibold">Settings</h2>
              <p className="text-sm text-muted-foreground">Manage your preferences</p>
            </div>
            <TabsTrigger value="automatron" className="justify-start py-2 px-3 text-sm font-medium rounded-md transition-colors hover:bg-primary/10 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Settings className="w-4 h-4 mr-2" />
              Automatron
            </TabsTrigger>
            <TabsTrigger value="columns" className="justify-start py-2 px-3 text-sm font-medium rounded-md transition-colors hover:bg-primary/10 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Columns className="w-4 h-4 mr-2" />
              Column Visibility
            </TabsTrigger>
            <TabsTrigger value="due-badge" className="justify-start py-2 px-3 text-sm font-medium rounded-md transition-colors hover:bg-primary/10 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Clock className="w-4 h-4 mr-2" />
              Due Badge
            </TabsTrigger>
            <TabsTrigger value="grouping" className="justify-start py-2 px-3 text-sm font-medium rounded-md transition-colors hover:bg-primary/10 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Group className="w-4 h-4 mr-2" />
              Grouping
            </TabsTrigger>
            <TabsTrigger value="recent-edits" className="justify-start py-2 px-3 text-sm font-medium rounded-md transition-colors hover:bg-primary/10 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Edit className="w-4 h-4 mr-2" />
              Recent Edits
            </TabsTrigger>
          </TabsList>
          <div className="flex-grow overflow-y-auto p-6">
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
            <div className="mt-6">
              <Button onClick={saveSettings}>Save Settings</Button>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  )
}