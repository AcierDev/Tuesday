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
import { WeeklySchedules, DayName, WeekSchedule } from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";
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
  weekStartsOn?: number;
} = {}): UseWeeklyScheduleReturn => {
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedules>({});
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn })
  );

  const { board } = useOrderStore();

  const updateScheduleInDb = useCallback(
    async (newSchedules: WeeklySchedules) => {
      if (!board) return;

      try {
        const updatedItems = board.items_page.items.map((item) => ({
          ...item,
          isScheduled: Object.values(newSchedules).some((weekSchedule) =>
            Object.values(weekSchedule).some((daySchedule) =>
              daySchedule.some((scheduledItem) => scheduledItem.id === item.id)
            )
          ),
        }));

        const response = await fetch("/api/boards", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: board.id,
            updates: {
              weekly_schedules: newSchedules,
              items_page: {
                ...board.items_page,
                items: updatedItems,
              },
            },
          }),
        });

        if (!response.ok) throw new Error("Failed to update schedule");
      } catch (error) {
        console.error("Failed to update schedule:", error);
        toast.error("Failed to update schedule");
        throw error;
      }
    },
    [board]
  );

  const debouncedUpdateSchedule = useRef(
    debounce(updateScheduleInDb, 1000)
  ).current;

  useEffect(() => {
    if (board) {
      setWeeklySchedules(board.weeklySchedules);
    }
  }, [board]);

  const changeWeek = useCallback((direction: "prev" | "next") => {
    setCurrentWeekStart((current) =>
      direction === "prev" ? subWeeks(current, 1) : addWeeks(current, 1)
    );
  }, []);

  const addItemToDay = useCallback(
    async (day: string, itemId: string, weekKey?: string) => {
      const targetWeekKey = weekKey || format(currentWeekStart, "yyyy-MM-dd");
      const item = board?.items_page.items.find((i) => i.id === itemId);
      if (!item) return;

      const newSchedules = { ...weeklySchedules };
      if (!newSchedules[targetWeekKey]) {
        newSchedules[targetWeekKey] = {};
      }
      if (!newSchedules[targetWeekKey][day]) {
        newSchedules[targetWeekKey][day] = [];
      }

      const scheduledItem = {
        id: itemId,
        values: item.values,
      };

      newSchedules[targetWeekKey][day].push(scheduledItem);
      setWeeklySchedules(newSchedules);
      await debouncedUpdateSchedule(newSchedules);
    },
    [weeklySchedules, currentWeekStart, board, debouncedUpdateSchedule]
  );

  const removeItemFromDay = useCallback(
    async (day: string, itemId: string) => {
      const weekKey = format(currentWeekStart, "yyyy-MM-dd");
      const newSchedules = { ...weeklySchedules };

      if (newSchedules[weekKey]?.[day]) {
        newSchedules[weekKey][day] = newSchedules[weekKey][day].filter(
          (item) => item.id !== itemId
        );
        setWeeklySchedules(newSchedules);
        await debouncedUpdateSchedule(newSchedules);
      }
    },
    [weeklySchedules, currentWeekStart, debouncedUpdateSchedule]
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

      if (!newSchedules[weekKey]) return;

      const sourceItems = newSchedules[weekKey][sourceDay] || [];
      const destItems = newSchedules[weekKey][destDay] || [];

      const itemToMove = sourceItems.find((item) => item.id === itemId);
      if (!itemToMove) return;

      // Remove from source
      newSchedules[weekKey][sourceDay] = sourceItems.filter(
        (item) => item.id !== itemId
      );

      // Add to destination
      if (!newSchedules[weekKey][destDay]) {
        newSchedules[weekKey][destDay] = [];
      }
      newSchedules[weekKey][destDay] = [
        ...destItems.slice(0, newIndex),
        itemToMove,
        ...destItems.slice(newIndex),
      ];

      setWeeklySchedules(newSchedules);
      await debouncedUpdateSchedule(newSchedules);
    },
    [weeklySchedules, currentWeekStart, debouncedUpdateSchedule]
  );

  const hasDataInPreviousWeek = useCallback(() => {
    const prevWeekStart = subWeeks(currentWeekStart, 1);
    const prevWeekKey = format(prevWeekStart, "yyyy-MM-dd");
    return Boolean(weeklySchedules[prevWeekKey]);
  }, [weeklySchedules, currentWeekStart]);

  const hasDataInNextWeek = useCallback(() => {
    const nextWeekStart = addWeeks(currentWeekStart, 1);
    const nextWeekKey = format(nextWeekStart, "yyyy-MM-dd");
    return Boolean(weeklySchedules[nextWeekKey]);
  }, [weeklySchedules, currentWeekStart]);

  const resetToCurrentWeek = useCallback(() => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn }));
  }, [weekStartsOn]);

  const isCurrentWeek = useCallback(() => {
    return isSameWeek(currentWeekStart, new Date(), { weekStartsOn });
  }, [currentWeekStart, weekStartsOn]);

  const removeItemsFromSchedule = useCallback(
    async (
      itemsToRemove: { day: DayName; itemId: string; weekKey?: string }[]
    ) => {
      const newSchedules = { ...weeklySchedules };

      itemsToRemove.forEach(({ day, itemId, weekKey: specificWeekKey }) => {
        const weekKey =
          specificWeekKey || format(currentWeekStart, "yyyy-MM-dd");
        if (newSchedules[weekKey]?.[day]) {
          newSchedules[weekKey][day] = newSchedules[weekKey][day].filter(
            (item) => item.id !== itemId
          );
        }
      });

      setWeeklySchedules(newSchedules);
      await debouncedUpdateSchedule(newSchedules);
    },
    [weeklySchedules, currentWeekStart, debouncedUpdateSchedule]
  );

  // Clean up debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedUpdateSchedule.cancel();
    };
  }, [debouncedUpdateSchedule]);

  return {
    weeklySchedules,
    currentWeekStart,
    changeWeek,
    addItemToDay,
    removeItemFromDay,
    moveItem,
    hasDataInPreviousWeek,
    hasDataInNextWeek,
    resetToCurrentWeek,
    isCurrentWeek,
    removeItemsFromSchedule,
  };
};
