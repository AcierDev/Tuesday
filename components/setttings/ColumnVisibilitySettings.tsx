// components/settings/ColumnVisibilitySettings.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ItemStatus, ColumnTitles } from '@/typings/types'

interface ColumnVisibilitySettingsProps {
  columnVisibility: Record<string, Record<string, boolean>>
  showSortingIcons: boolean
  updateSettings: (updates: Partial<any>) => void
  updateColumnVisibility: (group: string, field: string, visible: boolean) => void
}

export const ColumnVisibilitySettings = ({
  columnVisibility,
  showSortingIcons,
  updateSettings,
  updateColumnVisibility
}: ColumnVisibilitySettingsProps) => {

  const toggleColumnVisibility = (group: string, field: string) => {
    updateColumnVisibility(group, field, !columnVisibility[group]![field])
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sorting Icons</CardTitle>
          <CardDescription>Control the visibility of sorting icons in the table headers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              checked={showSortingIcons}
              id="show-sorting-icons"
              onCheckedChange={(checked) => {
                updateSettings({ showSortingIcons: checked })
              }}
            />
            <Label htmlFor="show-sorting-icons">Show sorting icons</Label>
          </div>
        </CardContent>
      </Card>
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
                    checked={columnVisibility[group]?.[field]}
                    id={`${group}-${field}`}
                    onCheckedChange={() => toggleColumnVisibility(group, field)}
                  />
                  <Label htmlFor={`${group}-${field}`}>{field}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
