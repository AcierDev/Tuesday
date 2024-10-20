// components/settings/AutomatronSettings.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Plus, Trash2 } from 'lucide-react'
import { AutomatronRule, ColumnTitles, ItemStatus } from '@/typings/types'
import { getInputTypeForField } from '@/utils/functions'
import { boardConfig } from "@/config/boardconfig"

interface AutomatronSettingsProps {
  automatronRules: AutomatronRule[]
  isAutomatronActive: boolean
  updateSettings: (updates: Partial<any>) => void
}

export const AutomatronSettings = ({
  automatronRules,
  isAutomatronActive,
  updateSettings
}: AutomatronSettingsProps) => {

  const addRule = () => {
    const newRule: AutomatronRule = {
      id: Date.now().toString(),
      field: '',
      value: '',
      newStatus: ''
    }
    updateSettings({ automatronRules: [...automatronRules, newRule] })
  }

  const updateRule = (id: string, field: keyof AutomatronRule, value: string) => {
    const updatedRules = automatronRules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    )
    updateSettings({ automatronRules: updatedRules })
  }

  const deleteRule = (id: string) => {
    const updatedRules = automatronRules.filter(rule => rule.id !== id)
    updateSettings({ automatronRules: updatedRules })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Automatron</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Automatically update item status based on field changes
          </p>
        </div>
        <Switch
          checked={isAutomatronActive}
          id="automatron-active"
          onCheckedChange={(checked) => updateSettings({ isAutomatronActive: checked })}
        />
      </div>
      <div className="space-y-4">
        {automatronRules.map((rule) => (
          <Card key={rule.id} className="dark:bg-gray-900">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor={`field-${rule.id}`}>When this field</Label>
                  <Select
                    value={rule.field}
                    onValueChange={(value) => updateRule(rule.id, 'field', value)}
                  >
                    <SelectTrigger id={`field-${rule.id}`} className="dark:bg-gray-800">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ColumnTitles).filter(title => getInputTypeForField(title) === 'select').map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`value-${rule.id}`}>Is set to</Label>
                  {getInputTypeForField(rule.field) === 'select' ? (
                    <Select
                      value={rule.value}
                      onValueChange={(value) => updateRule(rule.id, 'value', value)}
                    >
                      <SelectTrigger id={`value-${rule.id}`} className="dark:bg-gray-800">
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent>
                        {(boardConfig.columns[rule.field as ColumnTitles].options || []).map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={`value-${rule.id}`}
                      placeholder="Enter value"
                      type={getInputTypeForField(rule.field)}
                      value={rule.value}
                      onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                       className="dark:bg-gray-800"
                    />
                  )}
                </div>
                <div>
                  <Label htmlFor={`status-${rule.id}`}>Change status to</Label>
                  <Select
                    value={rule.newStatus}
                    onValueChange={(value) => updateRule(rule.id, 'newStatus', value)}
                  >
                    <SelectTrigger id={`status-${rule.id}`} className="dark:bg-gray-800">
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
                    size="icon"
                    variant="destructive"
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
        <Button className="w-full dark:bg-gray-900" variant="outline" onClick={addRule}>
          <Plus className="mr-2 h-4 w-4" /> Add Rule
        </Button>
      </div>
    </div>
  )
}
