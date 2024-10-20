// components/settings/GroupingSettings.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Eye, EyeOff, Layers } from 'lucide-react'
import { ItemStatus, ColumnTitles } from '@/typings/types'

interface GroupingSettingsProps {
  groupingField: string
  showCompletedOrders: boolean
  updateSettings: (updates: Partial<any>) => void
}

export const GroupingSettings = ({
  groupingField,
  showCompletedOrders,
  updateSettings
}: GroupingSettingsProps) => {

  return (
    <Card className="dark:bg-gray-900">
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
              value={groupingField}
              onValueChange={(value) => updateSettings({ groupingField: value })}
            >
              <SelectTrigger id="grouping-field"  className="dark:bg-gray-800">
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
          {groupingField !== 'Status' && (
            <div className="flex items-center space-x-2">
              <Switch
                checked={showCompletedOrders}
                id="show-completed-orders"
                onCheckedChange={(checked) => updateSettings({ showCompletedOrders: checked })}
              />
              <Label htmlFor="show-completed-orders">Show completed orders</Label>
            </div>
          )}
          <div className="flex items-center space-x-2">
            {showCompletedOrders ? (
              <Eye className="h-4 w-4 text-gray-500" />
            ) : (
              <EyeOff className="h-4 w-4 text-gray-500" />
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {showCompletedOrders
                ? "Completed orders are visible when grouping by fields other than Status."
                : "Completed orders are hidden when grouping by fields other than Status."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
