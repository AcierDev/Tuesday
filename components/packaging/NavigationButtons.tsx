// components/packaging/NavigationButtons.tsx
'use client'

import { addDays, format } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

interface NavigationButtonsProps {
  currentWeekStart: Date
  changeWeek: (direction: 'prev' | 'next') => void
}

const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  currentWeekStart,
  changeWeek
}) => {
  return (
    <div className="mb-4 flex items-center justify-between">
      <Button size="icon" variant="outline" onClick={() => changeWeek('prev')}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="font-semibold text-sm">
        {format(currentWeekStart, "MMM d")} - {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
      </span>
      <Button size="icon" variant="outline" onClick={() => changeWeek('next')}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default NavigationButtons
