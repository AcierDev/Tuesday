// components/settings/RecentEditsSettings.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Edit } from 'lucide-react'

interface RecentEditsSettingsProps {
  recentEditHours?: number
  updateSettings: (updates: Partial<any>) => void
}

export const RecentEditsSettings = ({
  recentEditHours,
  updateSettings
}: RecentEditsSettingsProps) => {

  const toggleRecentEdits = (checked: boolean) => {
    updateSettings({ recentEditHours: checked ? 24 : undefined })
  }

  return (
    <Card className="dark:bg-gray-900">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Edit className="mr-2 h-5 w-5" />
          Recent Edits Indicator
        </CardTitle>
        <CardDescription>Set how long to show the blue circle for recently edited items</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="recent-edits-toggle">Show recent edit indicator</Label>
            <Switch
              id="recent-edits-toggle"
              checked={recentEditHours !== undefined}
              onCheckedChange={toggleRecentEdits}
            />
          </div>
          {recentEditHours !== undefined && (
            <div>
              <Label htmlFor="recent-edits-hours">Hours to show recent edit indicator</Label>
              <div className="flex items-center space-x-4">
                <Slider
                  className="w-[60%]"
                  id="recent-edits-hours"
                  max={72}
                  min={1}
                  step={1}
                  value={[recentEditHours]}
                  onValueChange={(value) => updateSettings({ recentEditHours: value[0] })}
                />
                <Input
                  className="w-20 dark:bg-gray-800"
                  type="number"
                  value={recentEditHours}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    updateSettings({ recentEditHours: isNaN(value) ? undefined : value })
                  }}
                />
              </div>
            </div>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {recentEditHours === undefined
              ? "The recent edit indicator is turned off."
              : `The blue circle will appear for items edited within the last ${recentEditHours} hours.`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
