import { addDays, format, startOfWeek, isSameWeek, addWeeks } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/functions";

interface DialogWeekSelectorProps {
  currentWeekStart: Date;
  onChangeWeek: (direction: "prev" | "next") => void;
  referenceWeek: Date;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function DialogWeekSelector({
  currentWeekStart,
  onChangeWeek,
  referenceWeek,
  weekStartsOn = 0,
}: DialogWeekSelectorProps) {
  const referenceWeekStart = startOfWeek(referenceWeek, { weekStartsOn });
  const nextWeekStart = addWeeks(referenceWeekStart, 1);

  const isReferenceWeek = isSameWeek(currentWeekStart, referenceWeek, {
    weekStartsOn,
  });
  const isNextWeek = isSameWeek(currentWeekStart, nextWeekStart, {
    weekStartsOn,
  });

  const getWeekLabel = () => {
    if (isReferenceWeek) {
      return "This Week";
    }
    if (isNextWeek) {
      return "Next Week";
    }
    return `${format(currentWeekStart, "MMM d, yyyy")} - ${format(
      addDays(currentWeekStart, 6),
      "MMM d, yyyy"
    )}`;
  };

  return (
    <div className="flex items-stretch w-full sm:w-auto">
      {!isReferenceWeek && (
        <Button
          size="icon"
          variant="outline"
          onClick={() => onChangeWeek("prev")}
          aria-label="Previous week"
          className={cn(
            "rounded-r-none border-r-0 px-2",
            "dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700",
            "dark:hover:bg-gray-700 dark:hover:text-white"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      <div
        className={cn(
          "flex items-center justify-center flex-grow sm:flex-grow-0 sm:w-[280px] px-4 bg-background dark:bg-gray-800 border-y border-input dark:border-gray-700 text-sm font-medium truncate text-foreground dark:text-gray-200",
          // Add border-l and rounded-l when on reference week (no prev button)
          isReferenceWeek && "rounded-l-md border-l"
        )}
      >
        {getWeekLabel()}
      </div>
      <Button
        size="icon"
        variant="outline"
        onClick={() => onChangeWeek("next")}
        aria-label="Next week"
        className={cn(
          "rounded-l-none border-l-0 px-2",
          "dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700",
          "dark:hover:bg-gray-700 dark:hover:text-white"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
