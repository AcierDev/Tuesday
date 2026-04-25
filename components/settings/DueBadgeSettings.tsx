// components/settings/DueBadgeSettings.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Clock } from "lucide-react"

const ON_DECK_MIN_SLIDER_MAX = 30

interface DueBadgeSettingsProps {
  dueBadgeDays: number
  onDeckMinCount: number
  updateSettings: (updates: Partial<any>) => void
}

export const DueBadgeSettings = ({
  dueBadgeDays,
  onDeckMinCount,
  updateSettings
}: DueBadgeSettingsProps) => {

  return (
    <Card className="dark:bg-gray-900">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          Due Badge Settings
        </CardTitle>
        <CardDescription>Configure due-date thresholds and the On Deck minimum (shared across all browsers)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="due-badge-days">Days before due date</Label>
            <div className="flex items-center space-x-4">
              <Slider
                className="w-[60%]"
                id="due-badge-days"
                max={14}
                min={1}
                step={1}
                value={[dueBadgeDays]}
                onValueChange={(value) => updateSettings({ dueBadgeDays: value[0] })}
              />
              <Input
                className="w-20 dark:bg-gray-800"
                type="number"
                value={dueBadgeDays}
                onChange={(e) => updateSettings({ dueBadgeDays: Number(e.target.value) })}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              The day-counter badge will turn yellow when an item is within {dueBadgeDays} days of its due date.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="on-deck-min-count">On Deck minimum</Label>
            <div className="flex items-center space-x-4">
              <Slider
                className="w-[60%]"
                id="on-deck-min-count"
                max={ON_DECK_MIN_SLIDER_MAX}
                min={0}
                step={1}
                value={[onDeckMinCount]}
                onValueChange={(value) => updateSettings({ onDeckMinCount: value[0] })}
              />
              <Input
                className="w-20 dark:bg-gray-800"
                type="number"
                value={onDeckMinCount}
                onChange={(e) => updateSettings({ onDeckMinCount: Number(e.target.value) })}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              On Deck will always hold at least {onDeckMinCount} items — yellow/red items get promoted first, then the closest-to-due items from New fill the rest.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
