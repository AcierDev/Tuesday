"use client";

import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";

import {
  ColumnTitles,
  DayName,
  type Item,
  ItemStatus,
  WeeklySchedules,
  DaySchedule,
} from "@/typings/types";
import { ConfirmCompletionDialog } from "./ConfirmCompletionDialog";
import { AddItemDialog } from "./AddItemDialog";
import { DayColumn } from "./DayColumn";
import { WeekSelector } from "./WeekSelector";
import { calculateTotalSquares } from "@/utils/functions";
import { useOrderStore } from "@/stores/useOrderStore";

interface WeeklyScheduleProps {
  items: Item[];
  boardId: string;
}

const EMPTY_WEEK_SCHEDULE = {
  Sunday: [],
  Monday: [],
  Tuesday: [],
  Wednesday: [],
  Thursday: [],
  Friday: [],
  Saturday: [],
};

export function WeeklySchedule({ items, boardId }: WeeklyScheduleProps) {
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedules>({});
  const [currentWeekStart, setCurrentWeekStart] = useState<Date | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [currentDay, setCurrentDay] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDesign, setFilterDesign] = useState("all");
  const [filterSize, setFilterSize] = useState("all");
  const [confirmCompleteItem, setConfirmCompleteItem] = useState<Item | null>(
    null
  );
  const [localItems, setLocalItems] = useState<Item[]>(items);
  const { board, updateWeeklySchedules, updateItemScheduleStatus } =
    useOrderStore();

  useEffect(() => {
    setCurrentWeekStart(startOfWeek(new Date()));
  }, []);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const createNewWeek = useCallback((weekStart: Date) => {
    const adjustedWeekStart = startOfWeek(weekStart, { weekStartsOn: 0 });
    const weekKey = format(adjustedWeekStart, "yyyy-MM-dd");

    setWeeklySchedules((prev) => {
      if (prev[weekKey]) return prev;

      return {
        ...prev,
        [weekKey]: { ...EMPTY_WEEK_SCHEDULE },
      };
    });
  }, []);

  const loadData = useCallback(async () => {
    try {
      const currentWeekKey = format(currentWeekStart, "yyyy-MM-dd");

      if (board?.weeklySchedules) {
        setWeeklySchedules(board.weeklySchedules);

        if (!board.weeklySchedules[currentWeekKey]) {
          createNewWeek(currentWeekStart);
        }
      } else {
        createNewWeek(currentWeekStart);
      }
    } catch (err) {
      toast.error("Failed to load weekly schedules. Please refresh the page.");
    }
  }, [currentWeekStart, createNewWeek, board]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleScheduleUpdate = () => {
      loadData();
    };

    window.addEventListener("weeklyScheduleUpdate", handleScheduleUpdate);
    return () => {
      window.removeEventListener("weeklyScheduleUpdate", handleScheduleUpdate);
    };
  }, [loadData]);

  const handleAddItem = useCallback((day: string) => {
    setCurrentDay(day);
    setIsAddingItem(true);
  }, []);

  const handleQuickAdd = useCallback(
    async (day: DayName, itemId: string) => {
      const weekKey = format(currentWeekStart, "yyyy-MM-dd");
      const currentWeekSchedule =
        weeklySchedules[weekKey] || ({} as DaySchedule);

      const newSchedules: WeeklySchedules = {
        ...weeklySchedules,
        [weekKey]: {
          ...currentWeekSchedule,
          [day]: [
            ...(currentWeekSchedule[day] || []),
            { id: itemId, done: false },
          ],
        },
      };

      try {
        setWeeklySchedules(newSchedules);
        await updateWeeklySchedules(boardId, newSchedules);
        await updateItemScheduleStatus(boardId, itemId, true);

        setLocalItems((prevItems) =>
          prevItems.map((item) =>
            item.id === itemId ? { ...item, isScheduled: true } : item
          )
        );
      } catch (err) {
        toast.error("Failed to add item to schedule");
      }
    },
    [
      weeklySchedules,
      currentWeekStart,
      boardId,
      updateWeeklySchedules,
      updateItemScheduleStatus,
    ]
  );

  const handleRemoveItem = useCallback(
    async (day: DayName, itemId: string) => {
      const weekKey = format(currentWeekStart, "yyyy-MM-dd");
      const currentWeekSchedule =
        weeklySchedules[weekKey] || ({} as DaySchedule);
      const daySchedule = currentWeekSchedule[day] || [];

      const newSchedules: WeeklySchedules = {
        ...weeklySchedules,
        [weekKey]: {
          ...currentWeekSchedule,
          [day]: daySchedule.filter((item) => item.id !== itemId),
        },
      };

      try {
        setWeeklySchedules(newSchedules);
        await updateWeeklySchedules(boardId, newSchedules);
        await updateItemScheduleStatus(boardId, itemId, false);
      } catch (err) {
        toast.error("Failed to remove item from schedule");
      }
    },
    [
      weeklySchedules,
      currentWeekStart,
      updateWeeklySchedules,
      updateItemScheduleStatus,
      boardId,
    ]
  );

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination) return;

      const { source, destination } = result;
      const weekKey = format(currentWeekStart, "yyyy-MM-dd");
      const currentWeekSchedule =
        weeklySchedules[weekKey] || ({} as DaySchedule);
      const sourceSchedule =
        currentWeekSchedule[source.droppableId as DayName] || [];
      const destSchedule =
        currentWeekSchedule[destination.droppableId as DayName] || [];

      const [movedItem] = sourceSchedule.splice(source.index, 1);
      if (movedItem) {
        destSchedule.splice(destination.index, 0, movedItem);
      }

      const newSchedules: WeeklySchedules = {
        ...weeklySchedules,
        [weekKey]: {
          ...currentWeekSchedule,
          [source.droppableId]: sourceSchedule,
          [destination.droppableId]: destSchedule,
        },
      };

      try {
        setWeeklySchedules(newSchedules);
        await updateWeeklySchedules(boardId, newSchedules);
      } catch (err) {
        toast.error("Failed to update item position");
      }
    },
    [weeklySchedules, currentWeekStart, boardId, updateWeeklySchedules]
  );

  const handleMarkAsCompleted = useCallback(
    async (item: Item) => {
      try {
        const weekKey = format(currentWeekStart, "yyyy-MM-dd");
        const currentWeekSchedule = weeklySchedules[weekKey] as DaySchedule;
        if (!currentWeekSchedule) return;

        // Find the day and item to mark as done
        for (const [day, items] of Object.entries(currentWeekSchedule) as [
          DayName,
          { id: string; done: boolean }[]
        ][]) {
          const itemIndex = items.findIndex(
            (scheduleItem) => scheduleItem.id === item.id
          );
          if (itemIndex !== -1) {
            const newSchedules: WeeklySchedules = {
              ...weeklySchedules,
              [weekKey]: {
                ...currentWeekSchedule,
                [day]: items.map((scheduleItem, index) =>
                  index === itemIndex
                    ? { ...scheduleItem, done: true }
                    : scheduleItem
                ),
              },
            };

            await updateWeeklySchedules(boardId, newSchedules);
            setWeeklySchedules(newSchedules);
            toast.success("Item marked as completed");
            break;
          }
        }

        setConfirmCompleteItem(null);
      } catch (err) {
        toast.error("Failed to mark item as completed");
      }
    },
    [weeklySchedules, currentWeekStart, boardId, updateWeeklySchedules]
  );

  const getItemValue = useCallback(
    (item: Item, columnName: ColumnTitles): string => {
      return item.values.find((v) => v.columnName === columnName)?.text || "";
    },
    []
  );

  const designs = useMemo(
    () => [
      ...new Set(items.map((item) => getItemValue(item, ColumnTitles.Design))),
    ],
    [items, getItemValue]
  );
  const sizes = useMemo(
    () => [
      ...new Set(items.map((item) => getItemValue(item, ColumnTitles.Size))),
    ],
    [items, getItemValue]
  );

  const weekKey = format(currentWeekStart, "yyyy-MM-dd");
  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          !item.isScheduled &&
          item.status !== ItemStatus.Done &&
          item.status !== ItemStatus.Hidden &&
          !Object.values(weeklySchedules[weekKey] || {})
            .flat()
            .map((item) => item.id)
            .includes(item.id) &&
          getItemValue(item, ColumnTitles.Customer_Name)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) &&
          (filterDesign === "all" ||
            getItemValue(item, ColumnTitles.Design) === filterDesign) &&
          (filterSize === "all" ||
            getItemValue(item, ColumnTitles.Size) === filterSize)
      ),
    [
      items,
      weeklySchedules,
      weekKey,
      searchTerm,
      filterDesign,
      filterSize,
      getItemValue,
    ]
  );

  const changeWeek = useCallback(
    (direction: "prev" | "next") => {
      const newWeekStart =
        direction === "prev"
          ? subWeeks(currentWeekStart, 1)
          : addWeeks(currentWeekStart, 1);
      setCurrentWeekStart(newWeekStart);
      if (!weeklySchedules[format(newWeekStart, "yyyy-MM-dd")]) {
        createNewWeek(newWeekStart);
      }
    },
    [currentWeekStart, weeklySchedules, createNewWeek]
  );

  return (
    <div className="h-full overflow-y-auto no-scrollbar p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 text-gray-900 dark:text-gray-100 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Weekly Planner</h2>
        <WeekSelector
          bgColor="bg-white dark:bg-gray-700"
          currentWeekStart={currentWeekStart}
          onChangeWeek={changeWeek}
        />
      </div>
      <div className="rounded-lg">
        <div className="space-y-4">
          <DragDropContext onDragEnd={handleDragEnd}>
            {Object.entries(weeklySchedules[weekKey] || {}).map(
              ([day, dayItems]) => (
                <DayColumn
                  key={day}
                  day={day as DayName}
                  dayItemIds={dayItems}
                  items={localItems}
                  calculateTotalSquares={(dayItems) =>
                    calculateTotalSquares(dayItems, localItems, getItemValue)
                  }
                  handleAddItem={handleAddItem}
                  handleRemoveItem={handleRemoveItem}
                  setConfirmCompleteItem={setConfirmCompleteItem}
                  getItemValue={getItemValue}
                />
              )
            )}
          </DragDropContext>
        </div>
      </div>

      <AddItemDialog
        isOpen={isAddingItem}
        onClose={() => setIsAddingItem(false)}
        currentDay={currentDay}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterDesign={filterDesign}
        setFilterDesign={setFilterDesign}
        filterSize={filterSize}
        setFilterSize={setFilterSize}
        designs={designs}
        sizes={sizes}
        filteredItems={filteredItems}
        handleQuickAdd={handleQuickAdd}
        getItemValue={getItemValue}
      />

      <ConfirmCompletionDialog
        isOpen={!!confirmCompleteItem}
        onClose={() => setConfirmCompleteItem(null)}
        item={confirmCompleteItem}
        handleMarkAsCompleted={handleMarkAsCompleted}
        getItemValue={getItemValue}
      />
    </div>
  );
}
