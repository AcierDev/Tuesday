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
import { DialogWeekSelector } from "./DialogWeekSelector";
import { useState, useEffect } from "react";
import { startOfWeek, format } from "date-fns";
import { cn } from "@/utils/functions";
import { Check } from "lucide-react";
import { BaseConfirmDialog } from "../BaseConfirmDialog";
import { sortItems } from "../../AutoScheduling";
import { toast } from "sonner";

interface AutoSchedulePreview {
  [key: string]: {
    day: DayName;
    item: Item;
  }[];
}

interface AutoScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  getItemValue: (item: Item, columnName: ColumnTitles) => string;
  plannerCurrentWeek: Date;
  currentSchedule: DaySchedule;
  weeklySchedules: WeeklySchedules;
  onUpdateCheckStatus: (status: Record<string, WeekCheckStatus>) => void;
  mode: "single" | "multi";
  items: Item[];
  blockLimits: Record<string, Record<DayName, number>>;
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
  mode,
  items,
  blockLimits,
}: AutoScheduleDialogProps) {
  const {
    proposedSchedule,
    setProposedSchedule,
    clearProposedSchedule,
    excludeDay,
    clearExcludedDays,
    removeExcludedDay,
  } = useAutoScheduleStore();
  const [selectedWeekStart, setSelectedWeekStart] = useState(() =>
    startOfWeek(plannerCurrentWeek, { weekStartsOn: 0 })
  );

  const [weeklyActiveDays, setWeeklyActiveDays] = useState<
    Record<string, Record<DayName, boolean>>
  >({});

  const [weeklyCheckStatus, setWeeklyCheckStatus] = useState<WeekCheckStatus[]>(
    []
  );

  const [dayToReschedule, setDayToReschedule] = useState<DayName | null>(null);

  // Add new state for week rescheduling
  const [showWeekReschedule, setShowWeekReschedule] = useState(false);

  // Add new state for re-including a day
  const [dayToReinclude, setDayToReinclude] = useState<DayName | null>(null);

  // Add new state for restore week dialog
  const [showRestoreWeekDialog, setShowRestoreWeekDialog] = useState(false);

  // Modify the useEffect for dialog open/close
  useEffect(() => {
    if (isOpen) {
      setWeeklyActiveDays({});
      setSelectedWeekStart(
        startOfWeek(plannerCurrentWeek, { weekStartsOn: 0 })
      );
      clearExcludedDays(); // Clear when opening
    } else {
      // Clear when closing
      clearExcludedDays();
      setWeeklyActiveDays({});
      setWeeklyCheckStatus([]);
    }
  }, [isOpen, plannerCurrentWeek, clearExcludedDays]);

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
    const { excludedDays } = useAutoScheduleStore.getState();
    const isExcludedDay = excludedDays[weekKey]?.has(day);

    if (activeDays[day]) {
      // Uncheck the day first
      setWeeklyActiveDays((prev) => ({
        ...prev,
        [weekKey]: {
          ...(prev[weekKey] || getDefaultActiveDays()),
          [day]: false,
        },
      }));

      setWeeklyCheckStatus((prev) => {
        const newStatus = prev.map((weekStatus, index) =>
          index === weekIndex
            ? {
                ...weekStatus,
                [day]: false,
              }
            : weekStatus
        );

        const statusRecord = weekKeys.reduce((acc, key, index) => {
          acc[key] = newStatus[index] as WeekCheckStatus;
          return acc;
        }, {} as Record<string, WeekCheckStatus>);

        setTimeout(() => onUpdateCheckStatus(statusRecord), 0);

        return newStatus;
      });

      // Then show the reschedule dialog
      setDayToReschedule(day);
      return;
    } else if (isExcludedDay) {
      // If trying to check an excluded day, show reinclude dialog
      setDayToReinclude(day);
      return;
    }

    // Original logic for checking a day
    setWeeklyActiveDays((prev) => ({
      ...prev,
      [weekKey]: {
        ...(prev[weekKey] || getDefaultActiveDays()),
        [day]: true,
      },
    }));

    setWeeklyCheckStatus((prev) => {
      const newStatus = prev.map((weekStatus, index) =>
        index === weekIndex
          ? {
              ...weekStatus,
              [day]: true,
            }
          : weekStatus
      );

      const statusRecord = weekKeys.reduce((acc, key, index) => {
        acc[key] = newStatus[index] as WeekCheckStatus;
        return acc;
      }, {} as Record<string, WeekCheckStatus>);

      setTimeout(() => onUpdateCheckStatus(statusRecord), 0);

      return newStatus;
    });
  };

  const handleConfirmReschedule = (day: DayName) => {
    const weekKey = format(selectedWeekStart, "yyyy-MM-dd");

    // Add the day to excluded days
    excludeDay(weekKey, day);

    // Get all excluded days for this week from the store
    const { excludedDays } = useAutoScheduleStore.getState();

    // Recalculate schedule starting from planner's current week
    const newSchedule = sortItems({
      items,
      currentSchedule,
      targetWeek: plannerCurrentWeek, // Use planner's week instead of selectedWeekStart
      weeklySchedules,
      blockLimits,
      excludedDays,
    });

    // Update the proposed schedule
    Object.entries(newSchedule.schedule).forEach(([weekKey, schedule]) => {
      setProposedSchedule(weekKey, schedule);
    });

    setDayToReschedule(null);
  };

  const daysOfWeek: DayName[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
  ];

  // Get current week's key and items (move this up before it's used)
  const weekKey = format(selectedWeekStart, "yyyy-MM-dd");
  const currentWeekItems = proposedSchedule[weekKey] || [];
  const activeDays = getCurrentWeekActiveDays();

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
      weekKey === format(plannerCurrentWeek, "yyyy-MM-dd")
        ? currentSchedule
        : weeklySchedules[weekKey] || {
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

  // Modify the hasNewItems function to check excluded days
  const hasNewItems = (day: DayName) => {
    const weekKey = format(selectedWeekStart, "yyyy-MM-dd");
    const { excludedDays } = useAutoScheduleStore.getState();
    const isExcludedDay = excludedDays[weekKey]?.has(day);

    const dayItems = currentWeekItems.filter(
      (scheduleItem) => scheduleItem.day === day
    );

    // If there are items, return true
    if (dayItems.some((scheduleItem) => isNewItem(day, scheduleItem.item.id))) {
      return true;
    }

    // If no items but day is excluded, return true
    if (dayItems.length === 0 && isExcludedDay) {
      return true;
    }

    return false;
  };

  // Determine if we're showing week selector based on mode
  const showWeekSelector = mode === "multi";

  // Modify the "Cancel week" button click handler
  const handleCancelWeek = () => {
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

      const statusRecord = weekKeys.reduce((acc, key, index) => {
        acc[key] = newStatus[index] as WeekCheckStatus;
        return acc;
      }, {} as Record<string, WeekCheckStatus>);

      setTimeout(() => onUpdateCheckStatus(statusRecord), 0);

      return newStatus;
    });

    // Show reschedule dialog
    setShowWeekReschedule(true);
  };

  // Add new function to handle the week rescheduling confirmation
  const handleConfirmWeekReschedule = () => {
    const weekKey = format(selectedWeekStart, "yyyy-MM-dd");
    const isCurrentWeek = weekKey === format(plannerCurrentWeek, "yyyy-MM-dd");

    // Get current day index (0-6) if we're in current week
    const today = new Date();
    const currentDayIndex = today.getDay();

    // Add all days to excluded days, with special handling for current week
    daysOfWeek.forEach((day) => {
      // If it's the current week, only exclude days from today onwards
      if (isCurrentWeek) {
        const dayIndex = daysOfWeek.indexOf(day);
        if (dayIndex >= currentDayIndex) {
          excludeDay(weekKey, day);
        }
      } else {
        // For future weeks, exclude all days
        excludeDay(weekKey, day);
      }
    });

    // Get all excluded days from the store
    const { excludedDays } = useAutoScheduleStore.getState();

    // Recalculate schedule starting from planner's current week
    const newSchedule = sortItems({
      items,
      currentSchedule,
      targetWeek: plannerCurrentWeek,
      weeklySchedules,
      blockLimits,
      excludedDays,
    });

    // Update the proposed schedule
    Object.entries(newSchedule.schedule).forEach(([weekKey, schedule]) => {
      setProposedSchedule(weekKey, schedule);
    });

    setShowWeekReschedule(false);
  };

  // First, add a helper function to check if a day is excluded
  const isDayExcluded = (day: DayName) => {
    const weekKey = format(selectedWeekStart, "yyyy-MM-dd");
    const { excludedDays } = useAutoScheduleStore.getState();
    return excludedDays[weekKey]?.has(day) || false;
  };

  // Add handler for re-including a day
  const handleConfirmReinclude = (day: DayName) => {
    const weekKey = format(selectedWeekStart, "yyyy-MM-dd");
    const weekKeys = Object.keys(proposedSchedule).sort();
    const weekIndex = weekKeys.indexOf(weekKey);

    // Remove the day from excluded days
    removeExcludedDay(weekKey, day);

    // Get updated excluded days from the store
    const { excludedDays } = useAutoScheduleStore.getState();

    // Recalculate schedule with updated exclusions
    const newSchedule = sortItems({
      items,
      currentSchedule,
      targetWeek: plannerCurrentWeek,
      weeklySchedules,
      blockLimits,
      excludedDays,
    });

    // Update the proposed schedule
    Object.entries(newSchedule.schedule).forEach(([weekKey, schedule]) => {
      setProposedSchedule(weekKey, schedule);
    });

    // Check the day after re-including it
    setWeeklyActiveDays((prev) => ({
      ...prev,
      [weekKey]: {
        ...(prev[weekKey] || getDefaultActiveDays()),
        [day]: true,
      },
    }));

    // Update check status
    setWeeklyCheckStatus((prev) => {
      const newStatus = prev.map((weekStatus, index) =>
        index === weekIndex
          ? {
              ...weekStatus,
              [day]: true,
            }
          : weekStatus
      );

      const statusRecord = weekKeys.reduce((acc, key, index) => {
        acc[key] = newStatus[index] as WeekCheckStatus;
        return acc;
      }, {} as Record<string, WeekCheckStatus>);

      setTimeout(() => onUpdateCheckStatus(statusRecord), 0);

      return newStatus;
    });

    setDayToReinclude(null);
  };

  // Add helper to check if any days in the week are excluded
  const hasExcludedDaysInWeek = () => {
    const weekKey = format(selectedWeekStart, "yyyy-MM-dd");
    return daysOfWeek.some((day) => isDayExcluded(day));
  };

  // Modify the handleRestoreWeek function
  const handleRestoreWeek = () => {
    const weekKey = format(selectedWeekStart, "yyyy-MM-dd");
    const weekKeys = Object.keys(proposedSchedule).sort();
    const weekIndex = weekKeys.indexOf(weekKey);

    // Update local active days state, but only for non-excluded days
    setWeeklyActiveDays((prev) => ({
      ...prev,
      [weekKey]: {
        ...daysOfWeek.reduce((acc, day) => {
          acc[day] = !isDayExcluded(day);
          return acc;
        }, {} as Record<DayName, boolean>),
      },
    }));

    // Update check status state
    setWeeklyCheckStatus((prev) => {
      const newStatus = prev.map((weekStatus, index) =>
        index === weekIndex
          ? {
              ...daysOfWeek.reduce((acc, day) => {
                if (day in weekStatus) {
                  acc[day as keyof WeekCheckStatus] = !isDayExcluded(day);
                }
                return acc;
              }, {} as WeekCheckStatus),
            }
          : weekStatus
      );

      const statusRecord = weekKeys.reduce((acc, key, index) => {
        acc[key] = newStatus[index] as WeekCheckStatus;
        return acc;
      }, {} as Record<string, WeekCheckStatus>);

      setTimeout(() => onUpdateCheckStatus(statusRecord), 0);

      return newStatus;
    });

    // Check if there are any excluded days and show dialog if there are
    if (hasExcludedDaysInWeek()) {
      setShowRestoreWeekDialog(true);
    }
  };

  // Add handler for restoring all days in a week
  const handleConfirmRestoreWeek = () => {
    const weekKey = format(selectedWeekStart, "yyyy-MM-dd");

    // Remove all days in this week from excluded days
    daysOfWeek.forEach((day) => {
      if (isDayExcluded(day)) {
        removeExcludedDay(weekKey, day);
      }
    });

    // Get updated excluded days from the store
    const { excludedDays } = useAutoScheduleStore.getState();

    // Recalculate schedule with updated exclusions
    const newSchedule = sortItems({
      items,
      currentSchedule,
      targetWeek: plannerCurrentWeek,
      weeklySchedules,
      blockLimits,
      excludedDays,
    });

    // Update the proposed schedule
    Object.entries(newSchedule.schedule).forEach(([weekKey, schedule]) => {
      setProposedSchedule(weekKey, schedule);
    });

    // Check all days in this week
    setWeeklyActiveDays((prev) => ({
      ...prev,
      [weekKey]: {
        ...daysOfWeek.reduce((acc, day) => {
          acc[day] = true;
          return acc;
        }, {} as Record<DayName, boolean>),
      },
    }));

    // Update check status
    const weekKeys = Object.keys(proposedSchedule).sort();
    const weekIndex = weekKeys.indexOf(weekKey);

    setWeeklyCheckStatus((prev) => {
      const newStatus = prev.map((weekStatus, index) =>
        index === weekIndex
          ? {
              ...daysOfWeek.reduce((acc, day) => {
                if (day in weekStatus) {
                  acc[day as keyof WeekCheckStatus] = true;
                }
                return acc;
              }, {} as WeekCheckStatus),
            }
          : weekStatus
      );

      const statusRecord = weekKeys.reduce((acc, key, index) => {
        acc[key] = newStatus[index] as WeekCheckStatus;
        return acc;
      }, {} as Record<string, WeekCheckStatus>);

      setTimeout(() => onUpdateCheckStatus(statusRecord), 0);

      return newStatus;
    });

    setShowRestoreWeekDialog(false);
  };

  const handleConfirmSchedule = async () => {
    console.log("Starting scheduling process...");

    // Show loading toast immediately before any async operations
    const loadingMessage =
      mode === "single"
        ? "Scheduling items for this week..."
        : "Scheduling items across weeks...";

    console.log("Showing loading toast:", loadingMessage);
    const loadingId = toast.loading(loadingMessage);

    // Close the dialog immediately to prevent double-clicks
    onClose();

    // Add a small delay to ensure the loading toast is visible
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      console.log("Calling onConfirm...");
      await onConfirm();

      if (mode === "single") {
        console.log("Single mode - clearing proposed schedule");
        clearProposedSchedule();
      }

      // Handle success - dismiss loading and show success together
      console.log("Scheduling complete - showing success");
      Promise.all([
        toast.dismiss(loadingId),
        toast.success(
          mode === "single"
            ? "Items scheduled for this week"
            : "Items scheduled across weeks"
        ),
      ]);
    } catch (error) {
      console.error("Failed to schedule items:", error);

      // Handle error - dismiss loading and show error together
      console.log("Scheduling failed - showing error");
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to schedule items. Please try again.";

      Promise.all([toast.dismiss(loadingId), toast.error(errorMessage)]);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          clearExcludedDays();
          setWeeklyActiveDays({});
          setWeeklyCheckStatus([]);
        }
        onClose();
      }}
    >
      <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-y-auto dark:bg-gray-600">
        <DialogHeader className="space-y-4">
          <div>
            <DialogTitle>
              Auto Schedule Preview {mode === "single" ? "- This Week" : ""}
            </DialogTitle>
            <div className="text-center">
              <DialogDescription className="text-sm text-gray-400 dark:text-gray-300 mt-1">
                {mode === "single"
                  ? "Items will be scheduled for the current week only"
                  : "Items will be scheduled starting from your selected week in the planner"}
              </DialogDescription>
            </div>
          </div>
          <div className="space-y-2">
            <div className="relative flex justify-center">
              {showWeekSelector ? (
                <DialogWeekSelector
                  currentWeekStart={selectedWeekStart}
                  onChangeWeek={handleWeekChange}
                  referenceWeek={plannerCurrentWeek}
                  weekStartsOn={0}
                />
              ) : (
                <div className="text-center border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    This Week
                  </h3>
                </div>
              )}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={areAllDaysActive(weekKey)}
                  onClick={handleRestoreWeek}
                  className={cn(
                    "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/30 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20 dark:hover:border-blue-700/30",
                    areAllDaysActive(weekKey) &&
                      "opacity-40 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500"
                  )}
                >
                  Restore week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={areAllDaysInactive(weekKey)}
                  onClick={handleCancelWeek}
                  className={cn(
                    "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/30 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20 dark:hover:border-red-700/30",
                    areAllDaysInactive(weekKey) &&
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
                          : isDayExcluded(day)
                          ? "bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:hover:bg-yellow-800/50"
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
                            : isDayExcluded(day)
                            ? "text-yellow-600 dark:text-yellow-400"
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
            onClick={handleConfirmSchedule}
            disabled={mode === "single" && areAllDaysInactive(weekKey)}
            className={cn(
              mode === "single" &&
                areAllDaysInactive(weekKey) &&
                "opacity-40 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent"
            )}
          >
            Confirm Schedule
          </Button>
        </DialogFooter>

        <BaseConfirmDialog
          isOpen={dayToReschedule !== null}
          onClose={() => setDayToReschedule(null)}
          onConfirm={() => {
            if (dayToReschedule) {
              handleConfirmReschedule(dayToReschedule);
            }
            setDayToReschedule(null);
          }}
          title="Reschedule Day"
          description={`Would you like to reschedule the items from ${
            dayToReschedule || "this day"
          } to other available days?`}
          confirmText="Reschedule"
          confirmVariant="default"
          confirmClassName="bg-blue-600 hover:bg-blue-700"
        />

        <BaseConfirmDialog
          isOpen={showWeekReschedule}
          onClose={() => setShowWeekReschedule(false)}
          onConfirm={handleConfirmWeekReschedule}
          title="Reschedule Week"
          description={`Would you like to reschedule the items from this week to other available weeks?`}
          confirmText="Reschedule"
          confirmVariant="default"
          confirmClassName="bg-blue-600 hover:bg-blue-700"
        />

        <BaseConfirmDialog
          isOpen={dayToReinclude !== null}
          onClose={() => setDayToReinclude(null)}
          onConfirm={() => {
            if (dayToReinclude) {
              handleConfirmReinclude(dayToReinclude);
            }
          }}
          title="Include Day"
          description={`Would you like to include ${
            dayToReinclude || "this day"
          } in the scheduling again?`}
          confirmText="Include"
          confirmVariant="default"
          confirmClassName="bg-green-600 hover:bg-green-700"
        />

        <BaseConfirmDialog
          isOpen={showRestoreWeekDialog}
          onClose={() => setShowRestoreWeekDialog(false)}
          onConfirm={handleConfirmRestoreWeek}
          title="Restore Week"
          description="Would you like to reschedule with all days in this week included?"
          confirmText="Restore"
          confirmVariant="default"
          confirmClassName="bg-green-600 hover:bg-green-700"
        />
      </DialogContent>
    </Dialog>
  );
}
