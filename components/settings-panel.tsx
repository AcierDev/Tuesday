"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Settings, Plus, Trash2, Sun, Moon, Clock, Palette, Layers, Eye, EyeOff, X } from 'lucide-react'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { useOrderSettings } from './contexts-order-settings-context'
import { AutomatronRule, ColumnTitles, ItemStatus } from '@/app/typings/types'

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

  const addRule = () => {
    const newRule = {
      id: Date.now().toString(),
      field: '',
      value: '',
      newStatus: ''
    }
    updateSettings({ automatronRules: [...settings.automatronRules, newRule] })
  }

  const updateRule = (id: string, field: keyof AutomatronRule, value: string) => {
    const updatedRules = settings.automatronRules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    )
    updateSettings({ automatronRules: updatedRules })
  }

  const deleteRule = (id: string) => {
    const updatedRules = settings.automatronRules.filter(rule => rule.id !== id)
    updateSettings({ automatronRules: updatedRules })
  }

  const toggleColumnVisibility = (group: string, field: string) => {
    updateColumnVisibility(group, field, !settings.columnVisibility[group][field])
  }

  const updateStatusColor = (status: string, color: string) => {
    const updatedColors = {
      ...settings.statusColors,
      [status]: color
    }
    updateSettings({ statusColors: updatedColors })
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
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Button onClick={onClose} variant="ghost" size="icon">
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
              <TabsTrigger value="status-colors">Status Colors</TabsTrigger>
              <TabsTrigger value="grouping">Grouping</TabsTrigger>
            </TabsList>
            <TabsContent value="automatron">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Automatron</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Automatically update item status based on field changes
                    </p>
                  </div>
                  <Switch
                    id="automatron-active"
                    checked={settings.isAutomatronActive}
                    onCheckedChange={(checked) => updateSettings({ isAutomatronActive: checked })}
                  />
                </div>
                <div className="space-y-4">
                  {settings.automatronRules.map((rule) => (
                    <Card key={rule.id}>
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label htmlFor={`field-${rule.id}`}>When this field</Label>
                            <Select
                              value={rule.field}
                              onValueChange={(value) => updateRule(rule.id, 'field', value)}
                            >
                              <SelectTrigger id={`field-${rule.id}`}>
                                <SelectValue placeholder="Select field" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.values(ColumnTitles).map((field) => (
                                  <SelectItem key={field} value={field}>
                                    {field}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor={`value-${rule.id}`}>Is set to</Label>
                            <Input
                              id={`value-${rule.id}`}
                              value={rule.value}
                              onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                              placeholder="Enter value"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`status-${rule.id}`}>Change status to</Label>
                            <Select
                              value={rule.newStatus}
                              onValueChange={(value) => updateRule(rule.id, 'newStatus', value)}
                            >
                              <SelectTrigger id={`status-${rule.id}`}>
                                <SelectValue placeholder="Select new status" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.values(ItemStatus).map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end">
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => deleteRule(rule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete rule</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button onClick={addRule} variant="outline" className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Add Rule
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="columns">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium">Column Visibility</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Control which columns are visible in each item group
                  </p>
                </div>
                {Object.values(ItemStatus).map((group) => (
                  <Card key={group}>
                    <CardHeader>
                      <CardTitle>{group} Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.values(ColumnTitles).map((field) => (
                          <div key={field} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${group}-${field}`}
                              checked={settings.columnVisibility[group][field]}
                              onCheckedChange={() => {
                                toggleColumnVisibility(group, field)
                              }}
                            />
                            <Label htmlFor={`${group}-${field}`}>{field}</Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="due-badge">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Due Badge Settings
                  </CardTitle>
                  <CardDescription>Set how many days in advance to show the "Due" badge</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="due-badge-days">Days before due date</Label>
                      <div className="flex items-center space-x-4">
                        <Slider
                          id="due-badge-days"
                          min={1}
                          max={14}
                          step={1}
                          value={[settings.dueBadgeDays]}
                          onValueChange={(value) => updateSettings({ dueBadgeDays: value[0] })}
                          className="w-[60%]"
                        />
                        <Input
                          type="number"
                          value={settings.dueBadgeDays}
                          onChange={(e) => updateSettings({ dueBadgeDays: Number(e.target.value) })}
                          className="w-20"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      The "Due" badge will appear {settings.dueBadgeDays} days before the due date.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="status-colors">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Palette className="mr-2 h-5 w-5" />
                    Status Color Settings
                  </CardTitle>
                  <CardDescription>Customize the background colors for different statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.values(ItemStatus).map((status) => (
                      <div key={status} className="flex items-center space-x-4">
                        <Label htmlFor={`color-${status}`} className="w-1/3">{status}</Label>
                        <Select
                          value={settings.statusColors[status] || ''}
                          onValueChange={(value) => updateStatusColor(status, value)}
                        >
                          <SelectTrigger id={`color-${status}`} className="w-2/3">
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bg-red-100">Red</SelectItem>
                            <SelectItem value="bg-yellow-100">Yellow</SelectItem>
                            <SelectItem value="bg-green-100">Green</SelectItem>
                            <SelectItem value="bg-blue-100">Blue</SelectItem>
                            <SelectItem value="bg-purple-100">Purple</SelectItem>
                            <SelectItem value="bg-gray-100">Gray</SelectItem>
                            <SelectItem value="bg-white">White</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className={`w-6 h-6 rounded ${settings.statusColors[status] || 'bg-white border'}`}></div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="grouping">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Layers className="mr-2 h-5 w-5" />
                    Order Grouping Settings
                  </CardTitle>
                  <CardDescription>Choose how to group orders and manage completed orders visibility</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="grouping-field">Group orders by</Label>
                      <Select
                        value={settings.groupingField}
                        onValueChange={(value) => updateSettings({ groupingField: value })}
                      >
                        <SelectTrigger id="grouping-field">
                          <SelectValue placeholder="Select grouping field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Status">Status</SelectItem>
                          {Object.values(ColumnTitles).map((field) => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {settings.groupingField !== 'Status' && (
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="show-completed-orders"
                          checked={settings.showCompletedOrders}
                          onCheckedChange={(checked) => updateSettings({ showCompletedOrders: checked })}
                        />
                        <Label htmlFor="show-completed-orders">Show completed orders</Label>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      {settings.showCompletedOrders ? (
                        <Eye className="h-4 w-4 text-gray-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {settings.showCompletedOrders
                          ? "Completed orders are visible when grouping by fields other than Status."
                          : "Completed orders are hidden when grouping by fields other than Status."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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