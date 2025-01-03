import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Item,
  DayName,
  ColumnTitles,
  WeeklySchedules,
  DaySchedule,
} from "@/typings/types";
import { useAutoScheduleStore } from "../../stores/useAutoScheduleStore";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/utils/functions";
import { Check } from "lucide-react";

type WeekCheckStatus = {
  Sunday: boolean;
  Monday: boolean;
  Tuesday: boolean;
  Wednesday: boolean;
  Thursday: boolean;
};

interface SingleWeekAutoScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  getItemValue: (item: Item, columnName: ColumnTitles) => string;
  plannerCurrentWeek: Date;
  currentSchedule: DaySchedule;
  weeklySchedules: WeeklySchedules;
  onUpdateCheckStatus: (status: Record<string, WeekCheckStatus>) => void;
}

export function SingleWeekAutoScheduleDialog({
  isOpen,
  onClose,
  onConfirm,
  getItemValue,
  plannerCurrentWeek,
  currentSchedule,
  weeklySchedules,
  onUpdateCheckStatus,
}: SingleWeekAutoScheduleDialogProps) {
  const { proposedSchedule } = useAutoScheduleStore();
  const weekKey = format(plannerCurrentWeek, "yyyy-MM-dd");
  const currentWeekItems = proposedSchedule[weekKey] || [];

  const [activeDays, setActiveDays] = useState<Record<DayName, boolean>>({
    Sunday: true,
    Monday: true,
    Tuesday: true,
    Wednesday: true,
    Thursday: true,
    Friday: false,
    Saturday: false,
  });

  const daysOfWeek: DayName[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
  ];

  const calculateBlocks = (item: Item): number => {
    const sizeStr =
      item.values.find((v) => v.columnName === "Size")?.text || "";
    const dimensions = sizeStr.split("x").map((dim) => parseFloat(dim.trim()));
    const width = dimensions[0] || 0;
    const height = dimensions[1] || 0;
    return width * height;
  };

  const isNewItem = (day: DayName, itemId: string) => {
    const daySchedule = currentSchedule[day] || [];
    return !daySchedule.some((item) => item.id === itemId);
  };

  const hasNewItems = (day: DayName) => {
    const dayItems = currentWeekItems.filter((item) => item.day === day);
    return dayItems.some((scheduleItem) =>
      isNewItem(day, scheduleItem.item.id)
    );
  };

  const toggleDay = (day: DayName) => {
    setActiveDays((prev) => {
      const newActiveDays = {
        ...prev,
        [day]: !prev[day],
      };

      // Update parent component with new status
      const statusRecord = {
        [weekKey]: {
          Sunday: newActiveDays.Sunday,
          Monday: newActiveDays.Monday,
          Tuesday: newActiveDays.Tuesday,
          Wednesday: newActiveDays.Wednesday,
          Thursday: newActiveDays.Thursday,
        },
      };
      onUpdateCheckStatus(statusRecord);

      return newActiveDays;
    });
  };

  const areAllDaysActive = () =>
    Object.values(activeDays).every((isActive) => isActive);
  const areAllDaysInactive = () => {
    const daysWithNewItems = daysOfWeek.filter((day) => hasNewItems(day));
    if (daysWithNewItems.length === 0) return true;
    return daysWithNewItems.every((day) => !activeDays[day]);
  };

  useEffect(() => {
    if (isOpen) {
      // Reset active days when dialog opens
      setActiveDays({
        Sunday: true,
        Monday: true,
        Tuesday: true,
        Wednesday: true,
        Thursday: true,
        Friday: false,
        Saturday: false,
      });
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-y-auto dark:bg-gray-600">
        <DialogHeader className="space-y-4">
          <div>
            <DialogTitle>Auto Schedule Preview - This Week</DialogTitle>
            <div className="text-center">
              <DialogDescription className="text-sm text-gray-400 dark:text-gray-300 mt-1">
                Items will be scheduled for the current week only
              </DialogDescription>
            </div>
          </div>
          <div className="text-center border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              This Week
            </h3>
          </div>
          <div className="space-y-2">
            <div className="relative flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={areAllDaysActive()}
                onClick={() => {
                  const newActiveDays = {
                    Sunday: true,
                    Monday: true,
                    Tuesday: true,
                    Wednesday: true,
                    Thursday: true,
                    Friday: false,
                    Saturday: false,
                  };
                  setActiveDays(newActiveDays);
                  onUpdateCheckStatus({
                    [weekKey]: newActiveDays,
                  });
                }}
                className={cn(
                  "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/30 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20 dark:hover:border-blue-700/30",
                  areAllDaysActive() &&
                    "opacity-40 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500"
                )}
              >
                Restore week
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={areAllDaysInactive()}
                onClick={() => {
                  const newActiveDays = {
                    Sunday: false,
                    Monday: false,
                    Tuesday: false,
                    Wednesday: false,
                    Thursday: false,
                    Friday: false,
                    Saturday: false,
                  };
                  setActiveDays(newActiveDays);
                  onUpdateCheckStatus({
                    [weekKey]: newActiveDays,
                  });
                }}
                className={cn(
                  "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/30 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20 dark:hover:border-red-700/30",
                  areAllDaysInactive() &&
                    "opacity-40 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500"
                )}
              >
                Cancel week
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-5 gap-4 py-4">
          {daysOfWeek.map((day) => {
            const dayItems = currentWeekItems.filter(
              (item) => item.day === day
            );

            const totalBlocks = dayItems.reduce((total, { item }) => {
              return total + calculateBlocks(item);
            }, 0);

            return (
              <div key={day} className="flex flex-col">
                <div className="text-center border-b pb-2 mb-3">
                  <h3 className="font-semibold text-lg">{day}</h3>
                  <div className="relative">
                    <p className="text-sm text-muted-foreground">
                      Blocks: {totalBlocks}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!hasNewItems(day)}
                      className={cn(
                        "h-6 w-6 p-0 absolute right-0 top-1/2 -translate-y-1/2 border-0 transition-colors duration-200",
                        !hasNewItems(day)
                          ? "opacity-40 cursor-not-allowed bg-gray-100 dark:bg-gray-700"
                          : activeDays[day]
                          ? "bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/50"
                          : "bg-transparent hover:bg-gray-50/50 dark:hover:bg-gray-700/20"
                      )}
                      onClick={() => toggleDay(day)}
                    >
                      <Check
                        className={cn(
                          "h-3 w-3 stroke-2",
                          !hasNewItems(day)
                            ? "text-gray-400 dark:text-gray-600"
                            : activeDays[day]
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-300 dark:text-gray-800"
                        )}
                      />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  {dayItems.length > 0 ? (
                    dayItems.map(({ item }) => (
                      <div
                        key={item.id}
                        className={cn(
                          "text-sm rounded p-2 border transition-opacity duration-200",
                          isNewItem(day, item.id)
                            ? cn(
                                "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800",
                                !activeDays[day] && "opacity-40"
                              )
                            : "bg-muted/30 border-input"
                        )}
                      >
                        <div
                          className={cn(
                            "font-medium",
                            isNewItem(day, item.id) &&
                              !activeDays[day] &&
                              "text-gray-500 dark:text-gray-400"
                          )}
                        >
                          {getItemValue(item, ColumnTitles.Customer_Name)}
                        </div>
                        <div
                          className={cn(
                            "text-muted-foreground text-xs",
                            isNewItem(day, item.id) &&
                              !activeDays[day] &&
                              "text-gray-400 dark:text-gray-500"
                          )}
                        >
                          {getItemValue(item, ColumnTitles.Design)}
                          {" ("}
                          {getItemValue(item, ColumnTitles.Size)}
                          {")"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic text-center">
                      No items
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={areAllDaysInactive()}
            className={cn(
              areAllDaysInactive() &&
                "opacity-40 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent"
            )}
          >
            Confirm Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
