import { addDays, format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from "@/components/ui/button"

interface WeekSelectorProps {
  currentWeekStart: Date
  onChangeWeek: (direction: 'prev' | 'next') => void
}

export function WeekSelector({ currentWeekStart, onChangeWeek }: WeekSelectorProps) {
  return (
    <div className="flex items-stretch w-full sm:w-auto">
      <Button
        size="icon"
        variant="outline"
        onClick={() => onChangeWeek('prev')}
        aria-label="Previous week"
        className="rounded-r-none border-r-0 px-2"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center justify-center flex-grow sm:flex-grow-0 sm:w-[280px] px-4 bg-background border-y border-input text-sm font-medium truncate">
        {format(currentWeekStart, "MMM d, yyyy")} - {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
      </div>
      <Button
        size="icon"
        variant="outline"
        onClick={() => onChangeWeek('next')}
        aria-label="Next week"
        className="rounded-l-none border-l-0 px-2"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}