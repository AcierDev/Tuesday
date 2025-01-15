import { addDays, format, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/functions";
import * as React from "react";

interface WeekSelectorProps {
  currentWeekStart: Date;
  onChangeWeek: (direction: "prev" | "next") => void;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  hasDataInPreviousWeek?: boolean;
  hasDataInNextWeek?: boolean;
  bgColor?: string;
}

export function WeekSelector({
  currentWeekStart,
  onChangeWeek,
  weekStartsOn = 0,
  hasDataInPreviousWeek = false,
  hasDataInNextWeek = false,
  bgColor = "bg-white dark:bg-gray-800",
}: WeekSelectorProps) {
  const currentWeekStartDate = React.useMemo(() => {
    const currentDate = new Date();
    return startOfWeek(currentDate, { weekStartsOn });
  }, [weekStartsOn]);

  const isCurrentWeek =
    currentWeekStart.getTime() === currentWeekStartDate.getTime();

  return (
    <div className="flex items-stretch w-full sm:w-auto">
      <Button
        size="icon"
        variant="outline"
        onClick={() => onChangeWeek("prev")}
        aria-label="Previous week"
        className={cn(
          "rounded-r-none border-r-0 px-2 h-[38px] dark:border-gray-700",
          bgColor,
          hasDataInPreviousWeek &&
            "bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div
        className={cn(
          "flex items-center justify-center flex-grow sm:flex-grow-0 sm:w-[280px] px-4 h-[38px] border-y border-input dark:border-gray-700 text-sm font-medium truncate text-foreground dark:text-gray-200",
          bgColor
        )}
      >
        {format(currentWeekStart, "MMM d, yyyy")} -{" "}
        {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
      </div>
      <Button
        size="icon"
        variant="outline"
        onClick={() => onChangeWeek("next")}
        aria-label="Next week"
        className={cn(
          "rounded-l-none border-l-0 px-2 h-[38px] dark:border-gray-700",
          bgColor,
          "dark:hover:bg-gray-700 dark:hover:text-white",
          hasDataInNextWeek &&
            "bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
