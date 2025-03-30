import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Calendar, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { addWeeks, format, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isSameDay, addDays } from "date-fns";
import { cn } from "@/utils/functions";
import { toast } from "sonner";
import { DayName, ExtendedItem, WeeklyScheduleData } from "@/typings/types";

interface DueDateTooltipProps {
  onSelectDay: (date: Date) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  item: ExtendedItem;
  schedules: WeeklyScheduleData[];
  onAddToSchedule?: (
    weekKey: string,
    day: DayName,
    itemId: string
  ) => Promise<void>;
  onScheduleUpdate?: () => void;
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

export function DueDateTooltip({
  onMouseEnter,
  onMouseLeave,
  item,
  schedules,
  onAddToSchedule,
  onScheduleUpdate,
}: DueDateTooltipProps) {
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date | null>(null);

  useEffect(() => {
    setSelectedWeekStart(startOfWeek(new Date()));
  }, []);

  const handleWeekChange = (direction: "prev" | "next") => {
    if (!selectedWeekStart) return;
    setSelectedWeekStart(
      direction === "next"
        ? addWeeks(selectedWeekStart, 1)
        : addWeeks(selectedWeekStart, -1)
    );
  };

  if (!selectedWeekStart) {
    return null;
  }

  const getScheduledDayAndWeek = () => {
    for (const schedule of schedules) {
      for (const [day, daySchedule] of Object.entries(schedule.schedule)) {
        if (
          daySchedule?.some((scheduledItem) => scheduledItem.id === item.id)
        ) {
          return {
            day,
            week: format(new Date(schedule.weekKey), "MMM d"),
          };
        }
      }
    }
    return null;
  };

  const handleDayClick = async (date: Date, day: (typeof DAYS)[number]) => {
    if (!onAddToSchedule) return;

    try {
      await onAddToSchedule(
        format(selectedWeekStart, "YYYY-MM-DD"),
        day as DayName,
        item.id
      );

      if (onScheduleUpdate) {
        onScheduleUpdate();
      }

      toast.success(`Added to schedule for ${day}`, {
        style: { background: "#10B981", color: "white" },
      });
    } catch (error) {
      toast.error("Failed to add item to schedule", {
        style: { background: "#EF4444", color: "white" },
      });
    }
  };

  const scheduledInfo = getScheduledDayAndWeek();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "relative",
        zIndex: 9999,
      }}
      className="ml-2"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Card className="p-3 bg-white/95 dark:bg-gray-800/95 shadow-xl rounded-xl border-2 border-gray-200 dark:border-gray-700 backdrop-blur-sm w-[280px]">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Schedule Item
          </span>
        </div>

        {item.isScheduled ? (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Item Already Scheduled
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  This item is scheduled for {scheduledInfo?.day} (Week of{" "}
                  {scheduledInfo?.week})
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <div className="flex items-stretch w-full">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleWeekChange("prev")}
                  className="rounded-r-none border-r-0 px-2 h-8 dark:bg-gray-800 dark:border-gray-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center justify-center flex-grow px-4 bg-background dark:bg-gray-800 border-y border-input dark:border-gray-700 text-sm font-medium truncate text-foreground dark:text-gray-200 h-8">
                  {format(selectedWeekStart, "MMM d")} -{" "}
                  {format(addDays(selectedWeekStart, 6), "MMM d")}
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleWeekChange("next")}
                  className="rounded-l-none border-l-0 px-2 h-8 dark:bg-gray-800 dark:border-gray-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-1">
              {DAYS.map((day, index) => {
                const date = addDays(selectedWeekStart, index);
                const isToday = isSameDay(new Date(), date);

                return (
                  <Button
                    key={day}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start px-2 py-1.5 h-8",
                      "hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-400",
                      "text-gray-700 dark:text-gray-200",
                      isToday && "border border-blue-500"
                    )}
                    onClick={() => handleDayClick(date, day)}
                  >
                    <span className="flex items-center justify-between w-full">
                      <span className="min-w-[100px] font-medium">{day}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {format(date, "MMM d")}
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </motion.div>
  );
}
