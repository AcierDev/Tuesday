// components/settings/DueBadgeSettings.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Clock } from "lucide-react"
import { SETTINGS_SLIDER_CLASSES, useSliderDraft } from "@/components/settings/settingsSlider"

const ReadoutBubble = ({ value }: { value: number }) => (
  <div className="inline-flex h-8 min-w-[3.5rem] items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm">
    {value}
  </div>
)

interface DueBadgeSettingsProps {
  dueBadgeDays: number
  updateSettings: (updates: Partial<any>) => void
}

export const DueBadgeSettings = ({
  dueBadgeDays,
  updateSettings
}: DueBadgeSettingsProps) => {
  const { draft, handleValueChange, handleValueCommit } = useSliderDraft(
    dueBadgeDays,
    (v) => updateSettings({ dueBadgeDays: v })
  )

  return (
    <Card className="dark:bg-gray-900">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-semibold flex items-center">
          <Clock className="mr-2 h-4 w-4" />
          Due Badge
        </CardTitle>
        <CardDescription className="text-xs">
          When the day-counter badge should turn yellow
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-2">
          <Label htmlFor="due-badge-days" className="text-sm">Days before due date</Label>
          <div className="flex items-center space-x-3">
            <Slider
              className={SETTINGS_SLIDER_CLASSES}
              id="due-badge-days"
              max={14}
              min={1}
              step={1}
              value={[draft]}
              onValueChange={handleValueChange}
              onValueCommit={handleValueCommit}
            />
            <ReadoutBubble value={draft} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The day-counter badge will turn yellow when an item is within {draft} days of its due date.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
