"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  addDays,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/functions";

type WeeklySchedules = Record<
  string,
  Record<string, { id: string; done: boolean }[]>
>;

type CalendarViewProps = {
  currentDate: Date;
  selectedDates: Date[];
  schedule: WeeklySchedules;
  toggleDateSelection: (date: Date) => void;
};

export function CalendarView({
  currentDate,
  selectedDates,
  schedule,
  toggleDateSelection,
}: CalendarViewProps) {
  const [month, setMonth] = useState(currentDate);

  const firstDayOfMonth = startOfMonth(month);
  const lastDayOfMonth = endOfMonth(month);
  const startDate = addDays(firstDayOfMonth, -firstDayOfMonth.getDay());
  const endDate = addDays(lastDayOfMonth, 6 - lastDayOfMonth.getDay());

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const changeMonth = (direction: "prev" | "next") => {
    setMonth((prevMonth) => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() + (direction === "next" ? 1 : -1));
      return newMonth;
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-card dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-none">
        <h2 className="text-2xl font-semibold text-foreground dark:text-gray-200">
          {format(month, "MMMM yyyy")}
        </h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => changeMonth("prev")}
            className="text-foreground dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => changeMonth("next")}
            className="text-foreground dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center font-medium text-sm text-muted-foreground dark:text-gray-400"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayOfWeek = format(day, "EEEE");
            const isSelected = selectedDates.some((d) => isSameDay(d, day));
            const itemCount = schedule[dayOfWeek]?.length || 0;
            return (
              <Button
                key={day.toString()}
                variant="outline"
                className={cn(
                  "h-24 w-full p-1 flex flex-col items-start justify-start",
                  !isSameMonth(day, month) &&
                    "text-muted-foreground dark:text-gray-500 opacity-50",
                  isToday(day) && "border-primary dark:border-blue-400",
                  isSelected &&
                    "bg-primary dark:bg-blue-600 text-primary-foreground dark:text-white",
                  "dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                )}
                onClick={() => toggleDateSelection(day)}
              >
                <span
                  className={cn(
                    "text-sm font-semibold",
                    isToday(day) &&
                      "bg-primary dark:bg-blue-400 text-primary-foreground dark:text-gray-900 rounded-full w-6 h-6 flex items-center justify-center"
                  )}
                >
                  {format(day, "d")}
                </span>
                {itemCount > 0 && (
                  <div
                    className={cn(
                      "mt-1 px-1 rounded text-xs",
                      isSelected
                        ? "bg-primary-foreground dark:bg-gray-200 text-primary dark:text-gray-900"
                        : "bg-muted dark:bg-gray-600 text-muted-foreground dark:text-gray-300"
                    )}
                  >
                    {itemCount} item{itemCount > 1 ? "s" : ""}
                  </div>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
