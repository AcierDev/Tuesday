// components/settings/OnDeckSettings.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ListTodo } from "lucide-react"
import { SETTINGS_SLIDER_CLASSES, useSliderDraft } from "@/components/settings/settingsSlider"

const ON_DECK_MIN_SLIDER_MAX = 30

const ReadoutBubble = ({ value }: { value: number }) => (
  <div className="inline-flex h-8 min-w-[3.5rem] items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm">
    {value}
  </div>
)

interface OnDeckSettingsProps {
  onDeckMinCount: number
  updateSettings: (updates: Partial<any>) => void
}

export const OnDeckSettings = ({
  onDeckMinCount,
  updateSettings
}: OnDeckSettingsProps) => {
  const { draft, handleValueChange, handleValueCommit } = useSliderDraft(
    onDeckMinCount,
    (v) => updateSettings({ onDeckMinCount: v })
  )

  return (
    <Card className="dark:bg-gray-900">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-semibold flex items-center">
          <ListTodo className="mr-2 h-4 w-4" />
          On Deck Queue
        </CardTitle>
        <CardDescription className="text-xs">
          Minimum number of items kept on deck (shared across all browsers)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-2">
          <Label htmlFor="on-deck-min-count" className="text-sm">On Deck minimum</Label>
          <div className="flex items-center space-x-3">
            <Slider
              className={SETTINGS_SLIDER_CLASSES}
              id="on-deck-min-count"
              max={ON_DECK_MIN_SLIDER_MAX}
              min={0}
              step={1}
              value={[draft]}
              onValueChange={handleValueChange}
              onValueCommit={handleValueCommit}
            />
            <ReadoutBubble value={draft} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            On Deck will always hold at least {draft} items — yellow/red items get promoted first, then the closest-to-due items from New fill the rest.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
