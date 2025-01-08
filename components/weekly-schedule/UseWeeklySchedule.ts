import { useState, useCallback, useEffect, useRef } from "react";
import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
  isBefore,
  endOfWeek,
  isSameWeek,
} from "date-fns";
import { toast } from "sonner";
import { useRealmApp } from "@/hooks/useRealmApp";
import { WeeklySchedules, DayName, DaySchedule } from "@/typings/types";
import debounce from "lodash/debounce";

export interface UseWeeklyScheduleReturn {
  weeklySchedules: WeeklySchedules;
  currentWeekStart: Date;
  changeWeek: (direction: "prev" | "next") => void;
  addItemToDay: (
    day: string,
    itemId: string,
    weekKey?: string
  ) => Promise<void>;
  removeItemFromDay: (day: string, itemId: string) => Promise<void>;
  moveItem: (
    sourceDay: string,
    destDay: string,
    itemId: string,
    newIndex: number
  ) => Promise<void>;
  hasDataInPreviousWeek: () => boolean;
  hasDataInNextWeek: () => boolean;
  resetToCurrentWeek: () => void;
  isCurrentWeek: () => boolean;
  removeItemsFromSchedule: (
    itemsToRemove: { day: DayName; itemId: string; weekKey?: string }[]
  ) => Promise<void>;
}

export const useWeeklySchedule = ({
  weekStartsOn = 0,
}: {
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}): UseWeeklyScheduleReturn => {
  const { boardCollection: collection } = useRealmApp();
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedules>({});
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn })
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const pendingUpdates = useRef<WeeklySchedules | null>(null);

  const loadSchedules = useCallback(async () => {
    if (!collection) return;

    try {
      const board = await collection.findOne({});
      if (board?.weeklySchedules) {
        setWeeklySchedules(board.weeklySchedules);
      }

      // Always set to the current week, regardless of database content
      const nowWeekStart = startOfWeek(new Date(), { weekStartsOn });
      setCurrentWeekStart(nowWeekStart);

      if (
        !board?.weeklySchedules ||
        !board.weeklySchedules[format(nowWeekStart, "yyyy-MM-dd")]
      ) {
        createNewWeek(nowWeekStart);
      }
    } catch (err) {
      console.error("Failed to load weekly schedules", err);
      toast.error("Failed to load weekly schedules. Please refresh the page.", {
        style: { background: "#EF4444", color: "white" },
      });
    }
  }, [collection, weekStartsOn]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const createNewWeek = (weekStart: Date) => {
    const weekKey = format(weekStart, "yyyy-MM-dd");
    setWeeklySchedules((prev) => ({
      ...prev,
      [weekKey]: {
        Sunday: [],
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
      },
    }));
  };

  const debouncedSave = useCallback(
    debounce(async (newSchedules: WeeklySchedules) => {
      if (!collection) return;
      setIsUpdating(true);

      try {
        await collection.updateOne(
          {},
          { $set: { weeklySchedules: newSchedules } },
          { upsert: true }
        );

        // After successful save, apply any pending updates
        if (pendingUpdates.current) {
          setWeeklySchedules(pendingUpdates.current);
          pendingUpdates.current = null;
        }
      } catch (err) {
        console.error("Failed to save weekly schedules", err);
        toast.error("Failed to save weekly schedules. Please try again.", {
          style: { background: "#EF4444", color: "white" },
        });
      } finally {
        setIsUpdating(false);
      }
    }, 1000),
    [collection]
  );

  const saveSchedules = async (newSchedules: WeeklySchedules) => {
    if (isUpdating) {
      // If there's already an update in progress, store this update for later
      pendingUpdates.current = newSchedules;
      return;
    }

    // Trigger the debounced save
    debouncedSave(newSchedules);
  };

  const changeWeek = useCallback(
    (direction: "prev" | "next") => {
      setCurrentWeekStart((prevWeekStart) => {
        const newWeekStart =
          direction === "prev"
            ? subWeeks(prevWeekStart, 1)
            : addWeeks(prevWeekStart, 1);
        const adjustedWeekStart = startOfWeek(newWeekStart, { weekStartsOn });

        if (!weeklySchedules[format(adjustedWeekStart, "yyyy-MM-dd")]) {
          createNewWeek(adjustedWeekStart);
        }
        return adjustedWeekStart;
      });
    },
    [weekStartsOn, weeklySchedules]
  );

  const addItemToDay = useCallback(
    async (day: string, itemId: string, weekKey?: string) => {
      const targetWeekKey = weekKey || format(currentWeekStart, "yyyy-MM-dd");

      setWeeklySchedules((prev) => {
        // Ensure the week exists with proper structure
        const targetWeek = prev[targetWeekKey] || {
          Sunday: [],
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: [],
          Saturday: [],
        };

        const newSchedules = {
          ...prev,
          [targetWeekKey]: {
            ...targetWeek,
            [day]: [...(targetWeek[day] || []), { id: itemId, done: false }],
          },
        };

        // Save in background
        saveSchedules(newSchedules);
        return newSchedules;
      });
    },
    [currentWeekStart, saveSchedules]
  );

  type ScheduleItem = { id: string; done: boolean };

  const removeItemFromDay = useCallback(
    async (day: string, itemId: string) => {
      const weekKey = format(currentWeekStart, "yyyy-MM-dd");
      const emptySchedule: DaySchedule = {
        Sunday: [],
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
      };
      const currentWeekSchedule = weeklySchedules[weekKey] || emptySchedule;
      const typedDay = day as DayName;

      const newSchedules: WeeklySchedules = {
        ...weeklySchedules,
        [weekKey]: {
          ...currentWeekSchedule,
          [typedDay]: (currentWeekSchedule[typedDay] || []).filter(
            (item: ScheduleItem) => item.id !== itemId
          ),
        } as DaySchedule,
      };
      setWeeklySchedules(newSchedules);

      // Update the item's isScheduled field
      if (collection) {
        await collection.updateOne(
          {},
          {
            $set: {
              weeklySchedules: newSchedules,
              "items_page.items.$[item].isScheduled": false,
            },
          },
          {
            arrayFilters: [{ "item.id": itemId }],
            upsert: true,
          }
        );
      }
    },
    [weeklySchedules, currentWeekStart, collection]
  );

  const moveItem = useCallback(
    async (
      sourceDay: string,
      destDay: string,
      itemId: string,
      newIndex: number
    ) => {
      const weekKey = format(currentWeekStart, "yyyy-MM-dd");
      const newSchedules = { ...weeklySchedules };

      const sourceItems = newSchedules[weekKey]?.[sourceDay] || [];
      const destItems = newSchedules[weekKey]?.[destDay] || [];

      const movedItem = sourceItems.find((item) => item.id === itemId);
      if (!movedItem) return;

      // Remove from source
      const sourceIndex = sourceItems.findIndex((item) => item.id === itemId);
      if (sourceIndex > -1) {
        sourceItems.splice(sourceIndex, 1);
        // Insert into destination
        destItems.splice(newIndex, 0, movedItem);

        newSchedules[weekKey] = {
          ...newSchedules[weekKey],
          [sourceDay]: sourceItems,
          [destDay]: destItems,
        };
      }

      setWeeklySchedules(newSchedules);
      await saveSchedules(newSchedules);
    },
    [weeklySchedules, currentWeekStart, saveSchedules]
  );

  const hasDataInNextWeek = useCallback(() => {
    const nextWeekStart = addWeeks(currentWeekStart, 1);
    const nextWeekKey = format(nextWeekStart, "yyyy-MM-dd");
    const currentDate = new Date();
    const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn });

    // Check if the current week is in the past
    const isCurrentWeekPast = isBefore(currentWeekEnd, currentDate);

    // Check if there's data in the next week
    const hasData =
      !!weeklySchedules[nextWeekKey] &&
      Object.values(weeklySchedules[nextWeekKey]).some((day) => day.length > 0);

    return isCurrentWeekPast && hasData;
  }, [weeklySchedules, currentWeekStart, weekStartsOn]);

  const hasDataInPreviousWeek = useCallback(() => {
    const prevWeekStart = subWeeks(currentWeekStart, 1);
    const prevWeekKey = format(prevWeekStart, "yyyy-MM-dd");
    return (
      !!weeklySchedules[prevWeekKey] &&
      Object.values(weeklySchedules[prevWeekKey]).some((day) => day.length > 0)
    );
  }, [weeklySchedules, currentWeekStart]);

  const resetToCurrentWeek = useCallback(() => {
    const currentDate = new Date();
    const newWeekStart = startOfWeek(currentDate, { weekStartsOn });
    setCurrentWeekStart(newWeekStart);

    if (!weeklySchedules[format(newWeekStart, "yyyy-MM-dd")]) {
      createNewWeek(newWeekStart);
    }
  }, [weekStartsOn, weeklySchedules]);

  const isCurrentWeek = useCallback(() => {
    const today = new Date();
    return isSameWeek(currentWeekStart, today, { weekStartsOn });
  }, [currentWeekStart, weekStartsOn]);

  const removeItemsFromSchedule = useCallback(
    async (
      itemsToRemove: Array<{
        day: DayName;
        itemId: string;
        weekKey?: string;
      }>
    ) => {
      const groupedByWeek = itemsToRemove.reduce((acc, item) => {
        const weekKey = item.weekKey || format(currentWeekStart, "yyyy-MM-dd");
        if (!acc[weekKey]) {
          acc[weekKey] = [];
        }
        acc[weekKey].push({ day: item.day, itemId: item.itemId });
        return acc;
      }, {} as Record<string, { day: DayName; itemId: string }[]>);

      const newSchedules: WeeklySchedules = { ...weeklySchedules };
      const emptySchedule: DaySchedule = {
        Sunday: [],
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
      };

      Object.entries(groupedByWeek).forEach(([weekKey, items]) => {
        const baseSchedule = newSchedules[weekKey] || emptySchedule;
        const currentSchedule = { ...baseSchedule };

        items.forEach(({ day, itemId }) => {
          const typedDay = day as keyof DaySchedule;
          const daySchedule = currentSchedule[typedDay];
          if (daySchedule) {
            currentSchedule[typedDay] = daySchedule.filter(
              (item: ScheduleItem) => item.id !== itemId
            );
          }
        });

        newSchedules[weekKey] = currentSchedule as DaySchedule;
      });

      setWeeklySchedules(newSchedules);

      // Update the items' isScheduled fields
      if (collection) {
        const itemIds = itemsToRemove.map((item) => item.itemId);
        await collection.updateOne(
          {},
          {
            $set: {
              weeklySchedules: newSchedules,
              "items_page.items.$[item].isScheduled": false,
            },
          },
          {
            arrayFilters: [{ "item.id": { $in: itemIds } }],
            upsert: true,
          }
        );
      }
    },
    [weeklySchedules, currentWeekStart, collection]
  );

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return {
    weeklySchedules,
    currentWeekStart,
    hasDataInPreviousWeek,
    hasDataInNextWeek,
    changeWeek,
    addItemToDay,
    removeItemFromDay,
    moveItem,
    resetToCurrentWeek,
    isCurrentWeek,
    removeItemsFromSchedule,
  };
};
