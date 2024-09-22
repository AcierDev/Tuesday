import { addDays, format, startOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { cn } from '@/utils/functions'

interface WeekSelectorProps {
  currentWeekStart: Date
  onChangeWeek: (direction: 'prev' | 'next') => void
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  hasDataInPreviousWeek?: boolean
  hasDataInNextWeek?: boolean
}

export function WeekSelector({ 
  currentWeekStart, 
  onChangeWeek, 
  weekStartsOn = 0,
  hasDataInPreviousWeek = false,
  hasDataInNextWeek = false
}: WeekSelectorProps) {
  const currentDate = new Date()
  const currentWeekStartDate = startOfWeek(currentDate, { weekStartsOn })
  const isCurrentWeek = currentWeekStart.getTime() === currentWeekStartDate.getTime()

  return (
    <div className="flex items-stretch w-full sm:w-auto">
      <Button
        size="icon"
        variant="outline"
        onClick={() => onChangeWeek('prev')}
        aria-label="Previous week"
        className={cn(
          "rounded-r-none border-r-0 px-2",
          hasDataInPreviousWeek && "bg-blue-100 hover:bg-blue-200"
        )}
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
        className={cn(
          "rounded-l-none border-l-0 px-2",
          hasDataInNextWeek && "bg-blue-100 hover:bg-blue-200"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}