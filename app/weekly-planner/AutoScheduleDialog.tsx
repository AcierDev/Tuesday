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
import { useAutoScheduleStore } from "./stores/useAutoScheduleStore";
import { DialogWeekSelector } from "./DialogWeekSelector";
import { useState, useEffect } from "react";
import { startOfWeek, format } from "date-fns";
import { cn } from "@/utils/functions";
import { Check } from "lucide-react";

interface AutoSchedulePreview {
  [key: string]: {
    day: DayName;
    item: Item;
  }[];
}

interface AutoScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  getItemValue: (item: Item, columnName: ColumnTitles) => string;
  plannerCurrentWeek: Date;
  currentSchedule: DaySchedule;
  weeklySchedules: WeeklySchedules;
  onUpdateCheckStatus: (status: Record<string, WeekCheckStatus>) => void;
}

type WeekCheckStatus = {
  Sunday: boolean;
  Monday: boolean;
  Tuesday: boolean;
  Wednesday: boolean;
  Thursday: boolean;
};

export function AutoScheduleDialog({
  isOpen,
  onClose,
  onConfirm,
  getItemValue,
  plannerCurrentWeek,
  currentSchedule,
  weeklySchedules,
  onUpdateCheckStatus,
}: AutoScheduleDialogProps) {
  const { proposedSchedule, setProposedSchedule } = useAutoScheduleStore();
  const [selectedWeekStart, setSelectedWeekStart] = useState(() =>
    startOfWeek(plannerCurrentWeek, { weekStartsOn: 0 })
  );

  const [weeklyActiveDays, setWeeklyActiveDays] = useState<
    Record<string, Record<DayName, boolean>>
  >({});

  const [weeklyCheckStatus, setWeeklyCheckStatus] = useState<WeekCheckStatus[]>(
    []
  );

  // Reset weeklyActiveDays and selectedWeekStart when dialog opens
  useEffect(() => {
    if (isOpen) {
      setWeeklyActiveDays({});
      setSelectedWeekStart(
        startOfWeek(plannerCurrentWeek, { weekStartsOn: 0 })
      );
    }
  }, [isOpen, plannerCurrentWeek]);

  // Update weeklyCheckStatus when dialog opens or proposed schedule changes
  useEffect(() => {
    if (isOpen) {
      const weekKeys = Object.keys(proposedSchedule).sort();
      const initialStatus = weekKeys.reduce((acc, weekKey) => {
        acc[weekKey] = {
          Sunday: true,
          Monday: true,
          Tuesday: true,
          Wednesday: true,
          Thursday: true,
        };
        return acc;
      }, {} as Record<string, WeekCheckStatus>);

      // Only set the initial status once when the dialog opens
      if (weeklyCheckStatus.length === 0) {
        setWeeklyCheckStatus(Object.values(initialStatus));
        onUpdateCheckStatus(initialStatus);
      }
    } else {
      // Reset the status when dialog closes
      setWeeklyCheckStatus([]);
    }
  }, [isOpen, proposedSchedule]); // Remove onUpdateCheckStatus from dependencies

  // Initialize active days for a new week
  const getDefaultActiveDays = (): Record<DayName, boolean> => ({
    Sunday: true,
    Monday: true,
    Tuesday: true,
    Wednesday: true,
    Thursday: true,
    Friday: true,
    Saturday: true,
  });

  // Get active days for the current week
  const getCurrentWeekActiveDays = () => {
    const weekKey = format(selectedWeekStart, "yyyy-MM-dd");
    return weeklyActiveDays[weekKey] || getDefaultActiveDays();
  };

  const toggleDay = (day: DayName) => {
    const weekKey = format(selectedWeekStart, "yyyy-MM-dd");
    const weekKeys = Object.keys(proposedSchedule).sort();
    const weekIndex = weekKeys.indexOf(weekKey);

    if (weekIndex === -1) return;

    setWeeklyActiveDays((prev) => {
      const newActiveDays = {
        ...prev,
        [weekKey]: {
          ...(prev[weekKey] || getDefaultActiveDays()),
          [day]: !(prev[weekKey]?.[day] ?? true),
        },
      };
      return newActiveDays;
    });

    setWeeklyCheckStatus((prev) => {
      const newStatus = prev.map((weekStatus, index) =>
        index === weekIndex
          ? {
              ...weekStatus,
              //@ts-ignore
              [day]: !(prev[weekIndex]?.[day] ?? true),
            }
          : weekStatus
      );

      // Convert array to record for parent component
      const statusRecord = weekKeys.reduce((acc, key, index) => {
        acc[key] = newStatus[index] as WeekCheckStatus;
        return acc;
      }, {} as Record<string, WeekCheckStatus>);

      // Update parent component after state is settled
      setTimeout(() => onUpdateCheckStatus(statusRecord), 0);

      return newStatus;
    });
  };

  // Get items for the selected week
  const selectedWeekKey = format(selectedWeekStart, "yyyy-MM-dd");
  const currentWeekItems = proposedSchedule[selectedWeekKey] || [];
  const activeDays = getCurrentWeekActiveDays();

  const daysOfWeek: DayName[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
  ];

  const handleWeekChange = (direction: "prev" | "next") => {
    setSelectedWeekStart((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() + 7);
      }
      return startOfWeek(newDate, { weekStartsOn: 0 });
    });
  };

  const calculateBlocks = (item: Item): number => {
    const sizeStr =
      item.values.find((v) => v.columnName === "Size")?.text || "";
    const dimensions = sizeStr.split("x").map((dim) => parseFloat(dim.trim()));
    const width = dimensions[0] || 0;
    const height = dimensions[1] || 0;
    return width * height;
  };

  // Function to check if an item is new (not in original schedule)
  const isNewItem = (day: DayName, itemId: string) => {
    const weekExistingSchedule: DaySchedule =
      selectedWeekKey === format(plannerCurrentWeek, "yyyy-MM-dd")
        ? currentSchedule
        : weeklySchedules[selectedWeekKey] || {
            Sunday: [],
            Monday: [],
            Tuesday: [],
            Wednesday: [],
            Thursday: [],
            Friday: [],
            Saturday: [],
          };

    const daySchedule = weekExistingSchedule[day] || [];
    return !daySchedule.some((item) => item.id === itemId);
  };

  // Update the helper function to only check days with new items
  const areAllDaysInactive = (weekKey: string) => {
    const weekDays = weeklyActiveDays[weekKey] || getDefaultActiveDays();

    // Only check days that have new items
    const daysWithNewItems = daysOfWeek.filter((day) => hasNewItems(day));

    // If no days have new items, consider it inactive
    if (daysWithNewItems.length === 0) return true;

    // Check if all days that have new items are inactive
    return daysWithNewItems.every((day) => !weekDays[day]);
  };

  // Add helper function to check if all days are active
  const areAllDaysActive = (weekKey: string) => {
    const weekDays = weeklyActiveDays[weekKey] || getDefaultActiveDays();
    return Object.values(weekDays).every((isActive) => isActive);
  };

  // Add helper function to check if a day has any new items
  const hasNewItems = (day: DayName) => {
    const dayItems = currentWeekItems.filter(
      (scheduleItem) => scheduleItem.day === day
    );
    return dayItems.some((scheduleItem) =>
      isNewItem(day, scheduleItem.item.id)
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-y-auto dark:bg-gray-600">
        <DialogHeader className="space-y-4">
          <div>
            <DialogTitle>Auto Schedule Preview</DialogTitle>
            <div className="text-center">
              <DialogDescription className="text-sm text-gray-400 dark:text-gray-300 mt-1">
                Items will be scheduled starting from your selected week in the
                planner
              </DialogDescription>
            </div>
          </div>
          <div className="space-y-2">
            <div className="relative flex justify-center">
              <DialogWeekSelector
                currentWeekStart={selectedWeekStart}
                onChangeWeek={handleWeekChange}
                referenceWeek={plannerCurrentWeek}
                weekStartsOn={0}
              />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={areAllDaysActive(selectedWeekKey)}
                  onClick={() => {
                    const weekKey = format(selectedWeekStart, "yyyy-MM-dd");
                    const weekKeys = Object.keys(proposedSchedule).sort();
                    const weekIndex = weekKeys.indexOf(weekKey);

                    // Update local active days state
                    setWeeklyActiveDays((prev) => ({
                      ...prev,
                      [weekKey]: {
                        Sunday: true,
                        Monday: true,
                        Tuesday: true,
                        Wednesday: true,
                        Thursday: true,
                        Friday: true,
                        Saturday: true,
                      },
                    }));

                    // Update check status state
                    setWeeklyCheckStatus((prev) => {
                      const newStatus = prev.map((weekStatus, index) =>
                        index === weekIndex
                          ? {
                              Sunday: true,
                              Monday: true,
                              Tuesday: true,
                              Wednesday: true,
                              Thursday: true,
                            }
                          : weekStatus
                      );

                      // Convert array to record for parent component
                      const statusRecord = weekKeys.reduce(
                        (acc, key, index) => {
                          acc[key] = newStatus[index] as WeekCheckStatus;
                          return acc;
                        },
                        {} as Record<string, WeekCheckStatus>
                      );

                      // Update parent component
                      setTimeout(() => onUpdateCheckStatus(statusRecord), 0);

                      return newStatus;
                    });
                  }}
                  className={cn(
                    "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/30 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20 dark:hover:border-blue-700/30",
                    areAllDaysActive(selectedWeekKey) &&
                      "opacity-40 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500"
                  )}
                >
                  Restore week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={areAllDaysInactive(selectedWeekKey)}
                  onClick={() => {
                    const weekKey = format(selectedWeekStart, "yyyy-MM-dd");
                    const weekKeys = Object.keys(proposedSchedule).sort();
                    const weekIndex = weekKeys.indexOf(weekKey);

                    // Update local active days state
                    setWeeklyActiveDays((prev) => ({
                      ...prev,
                      [weekKey]: {
                        Sunday: false,
                        Monday: false,
                        Tuesday: false,
                        Wednesday: false,
                        Thursday: false,
                        Friday: false,
                        Saturday: false,
                      },
                    }));

                    // Update check status state
                    setWeeklyCheckStatus((prev) => {
                      const newStatus = prev.map((weekStatus, index) =>
                        index === weekIndex
                          ? {
                              Sunday: false,
                              Monday: false,
                              Tuesday: false,
                              Wednesday: false,
                              Thursday: false,
                            }
                          : weekStatus
                      );

                      // Convert array to record for parent component
                      const statusRecord = weekKeys.reduce(
                        (acc, key, index) => {
                          acc[key] = newStatus[index] as WeekCheckStatus;
                          return acc;
                        },
                        {} as Record<string, WeekCheckStatus>
                      );

                      // Update parent component
                      setTimeout(() => onUpdateCheckStatus(statusRecord), 0);

                      return newStatus;
                    });
                  }}
                  className={cn(
                    "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/30 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20 dark:hover:border-red-700/30",
                    areAllDaysInactive(selectedWeekKey) &&
                      "opacity-40 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500"
                  )}
                >
                  Cancel week
                </Button>
              </div>
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
            onClick={() => {
              console.log(weeklyCheckStatus);
              onConfirm();
            }}
          >
            Confirm Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
