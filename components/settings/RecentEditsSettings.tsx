// components/settings/RecentEditsSettings.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Edit } from 'lucide-react'
import { SETTINGS_SLIDER_CLASSES, useSliderDraft } from "@/components/settings/settingsSlider"

interface RecentEditsSettingsProps {
  recentEditHours?: number
  updateSettings: (updates: Partial<any>) => void
}

export const RecentEditsSettings = ({
  recentEditHours,
  updateSettings
}: RecentEditsSettingsProps) => {
  const { draft, setDraft, handleValueChange, handleValueCommit } = useSliderDraft(
    recentEditHours ?? 24,
    (v) => updateSettings({ recentEditHours: v })
  )

  const toggleRecentEdits = (checked: boolean) => {
    updateSettings({ recentEditHours: checked ? 24 : undefined })
  }

  return (
    <Card className="dark:bg-gray-900">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-semibold flex items-center">
          <Edit className="mr-2 h-4 w-4" />
          Recent Edits Indicator
        </CardTitle>
        <CardDescription className="text-xs">
          Set how long the blue circle shows on recently edited items
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="recent-edits-toggle" className="text-sm">Show recent edit indicator</Label>
            <Switch
              id="recent-edits-toggle"
              checked={recentEditHours !== undefined}
              onCheckedChange={toggleRecentEdits}
            />
          </div>
          {recentEditHours !== undefined && (
            <div className="space-y-2">
              <Label htmlFor="recent-edits-hours" className="text-sm">Hours to show indicator</Label>
              <div className="flex items-center space-x-3">
                <Slider
                  className={`w-[60%] ${SETTINGS_SLIDER_CLASSES}`}
                  id="recent-edits-hours"
                  max={72}
                  min={1}
                  step={1}
                  value={[draft]}
                  onValueChange={handleValueChange}
                  onValueCommit={handleValueCommit}
                />
                <Input
                  className="w-20 h-8 dark:bg-gray-800"
                  type="number"
                  value={draft}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (isNaN(value)) {
                      updateSettings({ recentEditHours: undefined })
                    } else {
                      setDraft(value)
                      updateSettings({ recentEditHours: value })
                    }
                  }}
                />
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {recentEditHours === undefined
              ? "The recent edit indicator is turned off."
              : `The blue circle will appear for items edited within the last ${draft} hours.`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
