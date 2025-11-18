"use client";

import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { useTheme } from "next-themes";
import { parseMinecraftColors } from "@/parseMinecraftColors";

import {
  ColumnTitles,
  DayName,
  type Item,
  ItemStatus,
  WeeklyScheduleData,
} from "@/typings/types";
import { ConfirmCompletionDialog } from "./ConfirmCompletionDialog";
import { AddItemDialog } from "./AddItemDialog";
import { DayColumn } from "./DayColumn";
import { WeekSelector } from "./WeekSelector";
import { calculateTotalSquares } from "@/utils/functions";
import { useOrderStore } from "@/stores/useOrderStore";
import { useWeeklyScheduleStore } from "@/stores/useWeeklyScheduleStore";

type BadgeStatus = {
  text: string;
  classes: string;
};

const getDueDateStatus = (
  dueDate: Date | null,
  useNumber: boolean,
  scheduledDate?: Date
): BadgeStatus => {
  if (!dueDate) {
    return {
      text: "?",
      classes: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    };
  }

  const referenceDate = scheduledDate || new Date();
  referenceDate.setHours(0, 0, 0, 0);
  const dueDateStart = new Date(dueDate);
  dueDateStart.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (dueDateStart.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return {
      text: useNumber
        ? diffDays.toString()
        : diffDays === -1
        ? "Yesterday"
        : diffDays === -2
        ? "2 days ago"
        : diffDays > -7 // Less than a week ago
        ? "3+ days ago"
        : diffDays > -30 // Less than a month ago
        ? "Week+ ago"
        : "Month+ ago",
      classes: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
  } else if (diffDays === 0) {
    return {
      text: useNumber ? "0" : "Today",
      classes:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
  } else if (diffDays === 1) {
    return {
      text: useNumber ? "+1" : "Tomorrow",
      classes:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
  } else if (diffDays === 2) {
    return {
      text: useNumber ? "+2" : "2 days",
      classes:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
  } else if (diffDays < 7) {
    return {
      text: useNumber ? `+${diffDays}` : "3+ days",
      classes:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
  } else if (diffDays < 30) {
    return {
      text: useNumber ? `+${diffDays}` : "Week+",
      classes:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
  } else {
    return {
      text: useNumber ? `+${diffDays}` : "Month+",
      classes:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
  }
};

export function WeeklySchedule() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [currentDay, setCurrentDay] = useState<DayName>("Monday");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDesign, setFilterDesign] = useState("all");
  const [filterSize, setFilterSize] = useState("all");
  const [useNumber, setUseNumber] = useState(true);
  const [confirmCompleteItem, setConfirmCompleteItem] = useState<Item | null>(
    null
  );

  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const { items } = useOrderStore();
  const {
    schedules,
    markDone,
    addItemToDay,
    removeItemFromDay,
    updateSchedule,
    createWeek,
  } = useWeeklyScheduleStore();

  useEffect(() => {
    setCurrentWeekStart(startOfWeek(new Date()));
  }, []);

  const handleAddItem = useCallback((day: DayName) => {
    setCurrentDay(day);
    setIsAddingItem(true);
  }, []);

  const handleQuickAdd = useCallback(
    async (item: Item, day: DayName) => {
      if (!currentWeekStart) return;
      const weekKey = format(currentWeekStart, "yyyy-MM-dd");
      try {
        await addItemToDay(weekKey, day, item.id);
      } catch (err) {
        toast.error("Failed to add item");
      }
    },
    [currentWeekStart, addItemToDay]
  );

  const handleRemoveItem = useCallback(
    async (day: DayName, itemId: string) => {
      if (!currentWeekStart) return;
      const weekKey = format(currentWeekStart, "yyyy-MM-dd");
      try {
        await removeItemFromDay(weekKey, day, itemId);
      } catch (err) {
        toast.error("Failed to remove item");
      }
    },
    [currentWeekStart, removeItemFromDay]
  );

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination || !currentWeekStart) return;
      const { source, destination } = result;
      const weekKey = format(currentWeekStart, "yyyy-MM-dd");

      const currentSchedule = schedules.find((s) => s.weekKey === weekKey);
      if (!currentSchedule) return;

      const newSchedule = { ...currentSchedule };
      const sourceItems = [
        ...(newSchedule.schedule[source.droppableId as DayName] || []),
      ];
      const destItems = [
        ...(newSchedule.schedule[destination.droppableId as DayName] || []),
      ];

      const [movedItem] = sourceItems.splice(source.index, 1);
      if (movedItem) {
        destItems.splice(destination.index, 0, movedItem);
      }

      newSchedule.schedule[source.droppableId as DayName] = sourceItems;
      newSchedule.schedule[destination.droppableId as DayName] = destItems;

      try {
        await updateSchedule(weekKey, newSchedule);
      } catch (err) {
        toast.error("Failed to update item position");
      }
    },
    [currentWeekStart, schedules, updateSchedule]
  );

  const getItemValue = useCallback(
    (item: Item, columnName: ColumnTitles): string => {
      const fieldMap: Record<string, keyof Item> = {
          [ColumnTitles.Size]: "size",
          [ColumnTitles.Customer_Name]: "customerName",
          [ColumnTitles.Due]: "dueDate",
          [ColumnTitles.Design]: "design",
      };
      const key = fieldMap[columnName];
      return key ? (item[key] as string) || "" : "";
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

  const weekKey = currentWeekStart
    ? format(currentWeekStart, "yyyy-MM-dd")
    : "";
  const currentSchedule = schedules.find((s) => s.weekKey === weekKey);

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          !item.isScheduled &&
          item.status !== ItemStatus.Done &&
          item.status !== ItemStatus.Hidden &&
          !(
            currentSchedule &&
            Object.values(currentSchedule.schedule)
              .flat()
              .some((scheduledItem) => scheduledItem.id === item.id)
          ) &&
          getItemValue(item, ColumnTitles.Customer_Name)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) &&
          (filterDesign === "all" ||
            getItemValue(item, ColumnTitles.Design) === filterDesign) &&
          (filterSize === "all" ||
            getItemValue(item, ColumnTitles.Size) === filterSize)
      ),
    [items, currentSchedule, searchTerm, filterDesign, filterSize, getItemValue]
  );

  const changeWeek = useCallback(
    (direction: "prev" | "next") => {
      if (!currentWeekStart) return;
      const newWeekStart =
        direction === "prev"
          ? subWeeks(currentWeekStart, 1)
          : addWeeks(currentWeekStart, 1);
      setCurrentWeekStart(newWeekStart);
      const newWeekKey = format(newWeekStart, "yyyy-MM-dd");
      if (!schedules.some((s) => s.weekKey === newWeekKey)) {
        createWeek(newWeekKey);
      }
    },
    [currentWeekStart, schedules, createWeek]
  );

  return (
    <div className="h-full overflow-y-auto no-scrollbar p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 text-gray-900 dark:text-gray-100 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Weekly Planner</h2>
        <WeekSelector
          bgColor="bg-white dark:bg-gray-700"
          currentWeekStart={currentWeekStart || new Date()}
          onChangeWeek={changeWeek}
        />
      </div>
      <div className="rounded-lg">
        <div className="space-y-4">
          <DragDropContext onDragEnd={handleDragEnd}>
            {currentSchedule &&
              Object.entries(currentSchedule.schedule).map(
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
                    currentWeekStart={currentWeekStart || new Date()}
                    useNumber={useNumber}
                    onBadgeClick={() => setUseNumber(!useNumber)}
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
        handleMarkAsCompleted={markDone}
        getItemValue={getItemValue}
        weekKey={weekKey}
      />
    </div>
  );
}
