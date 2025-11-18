"use client";

import { Board, DayName, Item, ColumnTitles } from "@/typings/types";
import { format, startOfWeek } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/functions";
import { Calendar } from "lucide-react";
import { useState } from "react";
import { formatDateSafely } from "@/utils/dateUtils";
import { useWeeklyScheduleStore } from "@/stores/useWeeklyScheduleStore";

interface TodaysScheduleProps {
  selectedEmployee: string | null;
}

export function TodaysSchedule({ selectedEmployee }: TodaysScheduleProps) {
  const [showDone, setShowDone] = useState(true);

  // Get today's date and determine the day name
  const today = new Date();
  const dayIndex = today.getDay();
  const dayNames: DayName[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
  ];
  const todayName = dayNames[dayIndex];

  // Get current week's key
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekKey = format(currentWeekStart, "yyyy-MM-dd");

  const { schedules } = useWeeklyScheduleStore();

  // Get today's schedule from the weekly schedules
  const todaysSchedule: { id: string; done: boolean }[] =
    schedules?.[weekKey]?.[todayName as keyof (typeof schedules)[string]] || [];

  // Helper function to get item value
  const getItemValue = (item: Item, columnName: ColumnTitles): string => {
    const fieldMap: Record<string, keyof Item> = {
        [ColumnTitles.Size]: "size",
        [ColumnTitles.Customer_Name]: "customerName",
        [ColumnTitles.Due]: "dueDate",
        [ColumnTitles.Design]: "design",
    };
    const key = fieldMap[columnName];
    return key ? (item[key] as string) || "" : "";
  };

  // Calculate blocks for an item
  const calculateBlocks = (item: Item): number => {
    const sizeStr = getItemValue(item, ColumnTitles.Size);
    const dimensions = sizeStr.split("x").map((dim) => parseFloat(dim.trim()));
    const width = dimensions[0] || 0;
    const height = dimensions[1] || 0;
    return width * height;
  };

  // Get the full items for today's schedule
  const scheduledItems = todaysSchedule
    .map((scheduleItem: { id: string; done: boolean }) => {
      const item = board.items_page.items.find(
        (i) => i.id === scheduleItem.id && !i.deleted
      );
      return item ? { item, done: scheduleItem.done } : null;
    })
    .filter((item): item is { item: Item; done: boolean } => item !== null);

  // Calculate total blocks for the day
  const totalBlocks = scheduledItems.reduce((total: number, { item }) => {
    return total + calculateBlocks(item);
  }, 0);

  // Calculate total blocks for completed items
  const completedBlocks = scheduledItems.reduce(
    (total: number, { item, done }) => {
      return done ? total + calculateBlocks(item) : total;
    },
    0
  );

  // Add helper function for due date
  const getFormattedDueDate = (item: Item): string => {
    const dueDate = getItemValue(item, ColumnTitles.Due);
    return formatDateSafely(dueDate);
  };

  if (scheduledItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No items scheduled for today
      </div>
    );
  }

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-3">
        <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div>
              Total:{" "}
              <Badge
                variant="secondary"
                className={cn(
                  "font-medium ml-1",
                  "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                )}
              >
                {totalBlocks} blocks
              </Badge>
            </div>

            <div>
              {showDone ? "Done:" : "Undone:"}
              <Badge
                variant="secondary"
                onClick={() => setShowDone(!showDone)}
                className={cn(
                  "font-medium ml-1",
                  "cursor-pointer transition-all duration-200",
                  showDone
                    ? "bg-green-100 hover:bg-green-200/90 dark:bg-green-800 dark:hover:bg-green-900 text-green-800 dark:text-green-300"
                    : "bg-red-100 hover:bg-red-200/90 dark:bg-red-800 dark:hover:bg-red-900 text-red-800 dark:text-red-300"
                )}
              >
                {showDone ? completedBlocks : totalBlocks - completedBlocks}{" "}
                blocks
              </Badge>
            </div>
          </div>
        </div>

        {scheduledItems.map(({ item, done }, index: number) => {
          const blocks = calculateBlocks(item);
          const dueDate = getFormattedDueDate(item);

          return (
            <div
              key={index}
              className={cn(
                "p-3 rounded-lg border transition-colors",
                done
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {getItemValue(item, ColumnTitles.Customer_Name)}
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center text-sm">
                    <Calendar className="h-3.5 w-3.5 mr-1 text-gray-600 dark:text-gray-400" />
                    <span
                      className={cn(
                        dueDate
                          ? "text-gray-600 dark:text-gray-400"
                          : "text-gray-800 dark:text-gray-600 italic"
                      )}
                    >
                      {dueDate ? dueDate : "No due date"}
                    </span>
                  </div>
                  <Badge variant="secondary">{blocks} blocks</Badge>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {getItemValue(item, ColumnTitles.Design)} -{" "}
                {getItemValue(item, ColumnTitles.Size)}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
