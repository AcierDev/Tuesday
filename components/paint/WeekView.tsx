import { addDays, format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/utils/functions"
import { DAYS_OF_WEEK } from "@/utils/constants"

interface WeekViewProps {
  currentWeekStart: Date
  weeklySchedules: Record<string, any>
  selectedDates: Date[]
  toggleDateSelection: (date: Date) => void
  isMobile: boolean
}

const WeekView: React.FC<WeekViewProps> = ({
  currentWeekStart,
  weeklySchedules,
  selectedDates,
  toggleDateSelection,
  isMobile
}) => {
  const weekKey = format(currentWeekStart, 'yyyy-MM-dd')
  const currentWeekSchedule = weeklySchedules[weekKey] || {}

  const renderDayCard = (day: string, index: number) => {
    const date = addDays(currentWeekStart, index)
    const isSelected = selectedDates.some(d => format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
    const itemCount = currentWeekSchedule[day]?.length || 0

    return (
      <Card 
        key={day} 
        className={cn(
          "cursor-pointer transition-all",
          isSelected ? "ring-2 ring-primary" : "hover:bg-gray-50"
        )}
        onClick={() => toggleDateSelection(date)}
      >
        <CardContent className={cn(isMobile ? "p-2 text-center" : "p-4 text-center")}>
          <p className={cn("font-semibold", isMobile ? "text-sm" : "")}>
            {isMobile ? day.slice(0, 3) : day}
          </p>
          <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
            {format(date, "MMM d")}
          </p>
          <p className={cn("mt-1 font-bold", "text-lg")}>{itemCount}</p>
          {!isMobile && <p className="text-xs text-gray-600">items</p>}
        </CardContent>
      </Card>
    )
  }

  if (isMobile) {
    return (
      <ScrollArea className="w-full">
        <div className="flex space-x-2 p-2">
          {DAYS_OF_WEEK.map((day, index) => renderDayCard(day, index))}
        </div>
      </ScrollArea>
    )
  }

  return (
    <div className="grid grid-cols-7 gap-2 mb-6">
      {DAYS_OF_WEEK.map((day, index) => renderDayCard(day, index))}
    </div>
  )
}

export default WeekView
