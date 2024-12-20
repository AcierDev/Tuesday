"use client";

import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";

import { useRealmApp } from "@/hooks/useRealmApp";
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

interface WeeklyScheduleProps {
  items: Item[];
  boardId: string;
}

export function WeeklySchedule({ items, boardId }: WeeklyScheduleProps) {
  const { boardCollection: collection } = useRealmApp();
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedules>({});
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [currentDay, setCurrentDay] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDesign, setFilterDesign] = useState("all");
  const [filterSize, setFilterSize] = useState("all");
  const [confirmCompleteItem, setConfirmCompleteItem] = useState<Item | null>(
    null
  );

  const loadSchedules = useCallback(async () => {
    if (!collection) return;

    try {
      const board = await collection.findOne({ id: boardId });
      if (board?.weeklySchedules) {
        setWeeklySchedules(board.weeklySchedules);
        const currentWeekKey = format(currentWeekStart, "yyyy-MM-dd");
        if (!board.weeklySchedules[currentWeekKey]) {
          createNewWeek(currentWeekStart);
        }
      } else {
        createNewWeek(currentWeekStart);
      }
    } catch (err) {
      console.error("Failed to load weekly schedules", err);
      toast.error("Failed to load weekly schedules. Please refresh the page.");
    }
  }, [collection, boardId, currentWeekStart]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const createNewWeek = useCallback((weekStart: Date) => {
    const adjustedWeekStart = startOfWeek(weekStart, { weekStartsOn: 0 });
    const weekKey = format(adjustedWeekStart, "yyyy-MM-dd");
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
    setCurrentWeekStart(adjustedWeekStart);
  }, []);

  const saveSchedules = useCallback(
    async (newSchedules: WeeklySchedules) => {
      if (!collection) return;

      try {
        await collection.updateOne(
          { id: boardId },
          { $set: { weeklySchedules: newSchedules } }
        );
        console.log("Weekly schedules saved successfully");
      } catch (err) {
        console.error("Failed to save weekly schedules", err);
        toast.error("Failed to save weekly schedules. Please try again.");
      }
    },
    [collection, boardId]
  );

  const handleAddItem = useCallback((day: string) => {
    setCurrentDay(day);
    setIsAddingItem(true);
  }, []);

  const handleQuickAdd = useCallback(
    async (day: DayName, item: Item) => {
      const weekKey = format(currentWeekStart, "yyyy-MM-dd");
      const currentWeekSchedule =
        weeklySchedules[weekKey] || ({} as DaySchedule);

      const newSchedules: WeeklySchedules = {
        ...weeklySchedules,
        [weekKey]: {
          ...currentWeekSchedule,
          [day]: [
            ...(currentWeekSchedule[day] || []),
            { id: item.id, done: false },
          ],
        },
      };

      setWeeklySchedules(newSchedules);
      await saveSchedules(newSchedules);

      if (collection) {
        await collection.updateOne(
          { id: boardId },
          { $set: { "items_page.items.$[elem].isScheduled": true } },
          { arrayFilters: [{ "elem.id": item.id }] }
        );
      }
    },
    [weeklySchedules, currentWeekStart, saveSchedules, collection, boardId]
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
      setWeeklySchedules(newSchedules);
      await saveSchedules(newSchedules);

      if (collection) {
        await collection.updateOne(
          { id: boardId },
          { $set: { "items_page.items.$[elem].isScheduled": false } },
          { arrayFilters: [{ "elem.id": itemId }] }
        );
      }
    },
    [weeklySchedules, currentWeekStart, saveSchedules, collection, boardId]
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

      setWeeklySchedules(newSchedules);
      await saveSchedules(newSchedules);
    },
    [weeklySchedules, currentWeekStart, saveSchedules]
  );

  const handleMarkAsCompleted = useCallback(
    async (item: Item) => {
      if (!collection) return;

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

          setWeeklySchedules(newSchedules);
          await saveSchedules(newSchedules);
          toast.success("Item marked as completed");
          break;
        }
      }

      setConfirmCompleteItem(null);
    },
    [collection, weeklySchedules, currentWeekStart, saveSchedules]
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
    <div className="h-full overflow-y-auto no-scrollbar p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Weekly Planner</h2>
        <WeekSelector
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
                  items={items}
                  calculateTotalSquares={(dayItems) =>
                    calculateTotalSquares(dayItems, items, getItemValue)
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
