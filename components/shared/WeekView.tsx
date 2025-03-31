import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { addDays, format } from "date-fns";
import { cn } from "@/utils/functions";
import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { Item, DayName, ColumnTitles } from "@/typings/types";
import { Button } from "@/components/ui/button";
import { WORK_DAYS } from "@/typings/constants";

type WeeklySchedules = Record<
  string,
  Record<string, { id: string; done: boolean }[]>
>;

type WeekViewProps = {
  currentWeekStart: Date;
  selectedDates: Date[];
  schedule: WeeklySchedules;
  toggleDateSelection: (date: Date) => void;
  isMobile: boolean;
  items: Item[];
};

export function WeekView({
  currentWeekStart,
  selectedDates,
  schedule,
  toggleDateSelection,
  isMobile,
  items = [],
}: WeekViewProps) {
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Add this effect to collapse all chevrons when week changes
  useEffect(() => {
    setExpandedDays({}); // Reset all expanded states when week changes
  }, [currentWeekStart]);

  const toggleDay = (day: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  const getItemDetails = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      console.log(`Item not found: ${itemId}`);
      return null;
    }

    const customerName =
      item.values.find((v) => v.columnName === ColumnTitles.Customer_Name)
        ?.text || "";
    const design =
      item.values.find((v) => v.columnName === ColumnTitles.Design)?.text || "";
    const size =
      item.values.find((v) => v.columnName === ColumnTitles.Size)?.text || "";

    return {
      customerName,
      design,
      size,
    };
  };

  const getCurrentWeekSelectedDates = () => {
    const weekDates = WORK_DAYS.map((_, index) =>
      format(addDays(currentWeekStart, index), "yyyy-MM-dd")
    );
    return selectedDates.filter((date) =>
      weekDates.includes(format(date, "yyyy-MM-dd"))
    );
  };

  const selectAllDays = () => {
    const allDates = WORK_DAYS.map((_, index) =>
      addDays(currentWeekStart, index)
    );
    // If all days in current week are selected, deselect all. Otherwise, select all.
    const currentWeekSelected = getCurrentWeekSelectedDates();
    const shouldSelect = currentWeekSelected.length < WORK_DAYS.length;

    allDates.forEach((date) => {
      const dateString = format(date, "yyyy-MM-dd");
      const isDateSelected = selectedDates.some(
        (selectedDate) => format(selectedDate, "yyyy-MM-dd") === dateString
      );

      if (shouldSelect !== isDateSelected) {
        toggleDateSelection(date);
      }
    });
  };

  const WeekViewContent = () => (
    <ScrollArea className="w-full">
      <div className="flex flex-col space-y-2 p-2">
        <Button
          variant="outline"
          onClick={selectAllDays}
          className="w-full dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          {getCurrentWeekSelectedDates().length === WORK_DAYS.length
            ? "Deselect All"
            : "Select All"}
        </Button>
        <div className="flex space-x-2">
          {WORK_DAYS.slice(0, 5).map((day, index) => {
            const date = addDays(currentWeekStart, index);
            const isSelected = selectedDates.some(
              (d) => format(d, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
            );
            const itemCount = schedule[day]?.length || 0;
            return (
              <Card
                key={day}
                className={cn(
                  "flex-shrink-0 w-20 cursor-pointer transition-all dark:bg-gray-800 dark:text-gray-200",
                  isSelected
                    ? "ring-2 ring-primary dark:ring-blue-400"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700"
                )}
                onClick={() => toggleDateSelection(date)}
              >
                <CardContent className="p-2 text-center">
                  <p className="font-semibold text-sm">{day.slice(0, 3)}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {format(date, "MMM d")}
                  </p>
                  <p className="mt-1 text-lg font-bold">{itemCount}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );

  if (isMobile) {
    return <WeekViewContent />;
  }

  return (
    <div className="flex flex-col space-y-2 mb-6">
      <Button
        variant="outline"
        onClick={selectAllDays}
        className="w-full dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        {getCurrentWeekSelectedDates().length === WORK_DAYS.length
          ? "Deselect All"
          : "Select All"}
      </Button>
      <div className="grid grid-cols-5 gap-2">
        {WORK_DAYS.slice(0, 5).map((day, index) => {
          const date = addDays(currentWeekStart, index);
          const isSelected = selectedDates.some(
            (d) => format(d, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
          );
          const daySchedule = schedule[day] || [];
          const itemCount = daySchedule.length;
          const isExpanded = expandedDays[day];

          return (
            <div key={day} className="relative">
              <Card
                className={cn(
                  "cursor-pointer transition-all dark:bg-gray-800 dark:text-gray-200",
                  isSelected
                    ? "ring-2 ring-primary dark:ring-blue-400"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700"
                )}
                onClick={() => toggleDateSelection(date)}
              >
                <CardContent className="p-4 relative pb-8">
                  <div>
                    <p className="font-semibold">{day}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {format(date, "MMM d")}
                    </p>
                    <p className="mt-2 text-lg font-bold">{itemCount}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      items
                    </p>
                  </div>
                  <div className="absolute bottom-2 right-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDay(day);
                      }}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-transform duration-200"
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          isExpanded && "transform rotate-180"
                        )}
                      />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {isExpanded && (
                <div
                  className="absolute left-0 right-0 z-50 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                  style={{ minWidth: "200px" }}
                >
                  <div className="p-3 space-y-2">
                    {daySchedule.length > 0 ? (
                      daySchedule.map((scheduleItem) => {
                        const details = getItemDetails(scheduleItem.id);

                        if (!details) return null;

                        return (
                          <div
                            key={scheduleItem.id}
                            className={cn(
                              "text-sm p-2 rounded",
                              scheduleItem.done
                                ? "bg-green-50 dark:bg-green-900/20"
                                : "bg-gray-50 dark:bg-gray-700"
                            )}
                          >
                            <div className="font-medium">
                              {details.customerName}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {details.design} - {details.size}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                        No items scheduled
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
