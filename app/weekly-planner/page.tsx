"use client";

import React, { useState } from "react";
import { useWeeklySchedule } from "@/components/weekly-schedule/UseWeeklySchedule";
import { format, isToday, isSameDay, startOfDay } from "date-fns";
import { ColumnTitles, Item, DayName, DaySchedule } from "@/typings/types";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Check, RotateCcw, Wand2, Trash2 } from "lucide-react";
import { AddItemDialog } from "@/components/weekly-schedule/AddItemDialog";
import { sortItems } from "./AutoScheduling";
import { AutoScheduleDialog, BaseConfirmDialog } from "./dialogs";
import { useAutoScheduleStore } from "./stores/useAutoScheduleStore";
import { toast } from "sonner";
import { WeekSelector } from "@/components/weekly-schedule/WeekSelector";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/utils/functions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { HighBlockWarningDialog } from "./dialogs/auto-schedule/HighBlockWarningDialog";
import { HighBlockItem } from "./types";
import { useOrderStore } from "@/stores/useOrderStore";

type BadgeStatus = {
  text: string;
  classes: string;
};

type WeekCheckStatus = {
  Sunday: boolean;
  Monday: boolean;
  Tuesday: boolean;
  Wednesday: boolean;
  Thursday: boolean;
};

interface WeekSchedule {
  [day: string]: { id: string; item: Item }[];
}

interface DayItemToRemove {
  day: DayName;
  itemId: string;
  weekKey?: string;
}

interface WeeklyScheduleHooks {
  weeklySchedules: Record<string, DaySchedule>;
  currentWeekStart: Date;
  addItemToDay: (
    day: DayName,
    itemId: string,
    weekKey?: string
  ) => Promise<void>;
  removeItemFromDay: (day: DayName, itemId: string) => void;
  removeItemsFromSchedule: (items: DayItemToRemove[]) => Promise<void>;
  changeWeek: (direction: "prev" | "next") => void;
}

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentDay: DayName;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterDesign: string;
  setFilterDesign: (design: string) => void;
  filterSize: string;
  setFilterSize: (size: string) => void;
  designs: string[];
  sizes: string[];
  filteredItems: Item[];
  handleQuickAdd: (day: DayName, item: Item) => Promise<void>;
  getItemValue: (item: Item, columnName: ColumnTitles) => string;
}

interface DayScheduleItem {
  id: string;
  done: boolean;
  item: Item;
}

interface DayCardProps {
  day: DayName;
  isCurrentDay: boolean;
  daySchedule: DayScheduleItem[];
  totalBlocks: number;
  blockLimit: number;
  onBlockLimitChange: (day: DayName, value: number) => void;
  onAddItem: (day: DayName) => void;
  onClearDay: (day: DayName) => void;
  onCompleteItem: (item: Item) => void;
  onResetItem: (item: Item) => void;
  onRemoveItem: (day: DayName, itemId: string, item: Item) => void;
  getItemValue: (item: Item, columnName: ColumnTitles) => string;
  useNumber: boolean;
  weekKey: string;
  items: Item[];
  onBadgeClick: () => void;
}

interface ScheduleItem {
  day: DayName;
  item: Item;
}

const getDueDateStatus = (
  dueDate: Date | null,
  useNumber: boolean
): BadgeStatus => {
  if (!dueDate) {
    return {
      text: "?",
      classes: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dueDateStart = new Date(dueDate);
  dueDateStart.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (dueDateStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
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

const isPastWorkWeek = (weekStart: Date): boolean => {
  const today = new Date();
  const currentWeekStart = startOfDay(new Date(today));
  // Move to the most recent Sunday (week start)
  currentWeekStart.setDate(
    currentWeekStart.getDate() - currentWeekStart.getDay()
  );

  // If it's a past week, disable
  if (weekStart < currentWeekStart) return true;

  // If it's the current week and today is Friday or Saturday, disable
  if (isSameDay(weekStart, currentWeekStart)) {
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6) return true; // 5 = Friday, 6 = Saturday
  }

  return false;
};

const isWeekDisabled = (weekStart: Date): boolean => {
  const today = new Date();
  const currentWeekStart = startOfDay(new Date(today));
  // Move to the most recent Sunday (week start)
  currentWeekStart.setDate(
    currentWeekStart.getDate() - currentWeekStart.getDay()
  );

  // If it's a past week, disable
  if (weekStart < currentWeekStart) return true;

  // If it's the current week and today is Friday or Saturday, disable
  if (isSameDay(weekStart, currentWeekStart)) {
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6) return true; // 5 = Friday, 6 = Saturday
  }

  return false;
};

const DayCard = ({
  day,
  isCurrentDay,
  daySchedule,
  totalBlocks,
  blockLimit,
  onBlockLimitChange,
  onAddItem,
  onClearDay,
  onCompleteItem,
  onResetItem,
  onRemoveItem,
  getItemValue,
  useNumber,
  weekKey,
  items,
  onBadgeClick,
}: DayCardProps) => {
  const [showDone, setShowDone] = useState(true);
  const toggleShowDone = () => setShowDone(!showDone);

  // Add the calculateBlocks helper function
  const calculateBlocks = (item: Item): number => {
    const sizeStr = getItemValue(item, ColumnTitles.Size);
    const dimensions = sizeStr.split("x").map((dim) => parseFloat(dim.trim()));
    const width = dimensions[0] || 0;
    const height = dimensions[1] || 0;
    return width * height;
  };

  // Calculate total blocks for completed items
  const doneBlocks = daySchedule.reduce((total, scheduleItem) => {
    if (scheduleItem.done || scheduleItem.item.status === "Done") {
      return total + calculateBlocks(scheduleItem.item);
    }
    return total;
  }, 0);

  return (
    <div className="relative group h-full">
      {isCurrentDay && (
        <div className="absolute inset-0 rounded-xl border-2 border-blue-400 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-500/10 pointer-events-none z-10 animate-pulse" />
      )}

      <Card
        className={cn(
          "transition-all duration-300 group-hover:shadow-xl h-full flex flex-col",
          "bg-white/90 dark:bg-gray-900/90",
          "border border-gray-200/50 dark:border-gray-800/50",
          "backdrop-blur-sm rounded-xl"
        )}
      >
        <CardHeader
          className={cn(
            "bg-gradient-to-b from-white/50 to-gray-50/50 dark:from-gray-900/50 dark:to-gray-800/50",
            "rounded-t-xl space-y-3 border-b border-gray-100/50 dark:border-gray-800/50",
            "flex-none"
          )}
        >
          <CardTitle className="text-center text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {day}
          </CardTitle>
          <div className="flex justify-center gap-2">
            <Badge
              variant={totalBlocks > blockLimit ? "destructive" : "secondary"}
              className={cn(
                totalBlocks > blockLimit ? "animate-pulse" : "",
                "dark:bg-gray-800/90 dark:text-gray-100",
                "cursor-pointer hover:opacity-80 transition-opacity"
              )}
              onClick={onBadgeClick}
            >
              Blocks: {totalBlocks}
            </Badge>
            {showDone ? (
              <Badge
                variant="outline"
                className={cn(
                  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                  "border-green-200 dark:border-green-800",
                  "cursor-pointer hover:opacity-80 transition-opacity"
                )}
                onClick={toggleShowDone}
              >
                Done: {doneBlocks}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className={cn(
                  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                  "border-red-200 dark:border-red-800",
                  "cursor-pointer hover:opacity-80 transition-opacity"
                )}
                onClick={toggleShowDone}
              >
                Undone: {totalBlocks - doneBlocks}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 flex-1 flex flex-col space-y-3 overflow-y-auto min-h-0 custom-scrollbar">
          {daySchedule.map((scheduleItem: DayScheduleItem, index: number) => {
            const item = scheduleItem.item;
            if (!item) return null;

            const dueDate = new Date(getItemValue(item, ColumnTitles.Due));
            const badgeStatus = getDueDateStatus(
              isNaN(dueDate.getTime()) ? null : dueDate,
              useNumber
            );

            return (
              <div
                key={`${day}-${scheduleItem.id}-${index}`}
                className={cn(
                  "relative transition-all duration-200 hover:shadow-md p-3 rounded-lg group/item",
                  scheduleItem.done || item.status === "Done"
                    ? "bg-gradient-to-r from-green-100/90 to-green-50/80 dark:from-green-800/30 dark:to-green-900/20 border border-green-200/50 dark:border-green-800/30"
                    : "bg-gradient-to-r from-gray-50/80 to-gray-100/30 dark:from-gray-800/30 dark:to-gray-700/20"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium tracking-tight text-gray-900 dark:text-gray-100">
                      {getItemValue(item, ColumnTitles.Customer_Name)}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "transition-all duration-200",
                        badgeStatus.classes,
                        "dark:border-gray-700/50",
                        "cursor-pointer hover:opacity-80"
                      )}
                      onClick={onBadgeClick}
                    >
                      {badgeStatus.text}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {getItemValue(item, ColumnTitles.Design)} -{" "}
                    {getItemValue(item, ColumnTitles.Size)}
                  </p>
                </div>
                <div className="absolute right-1 top-1 hidden group-hover/item:flex gap-1.5 transition-opacity">
                  {!scheduleItem.done && item.status !== "Done" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-6 w-6 p-0",
                        "hover:bg-gray-200/80 dark:hover:bg-gray-700/50",
                        "text-gray-700 dark:text-gray-300"
                      )}
                      onClick={() => onCompleteItem(item)}
                    >
                      <Check className="h-3 w-3" />
                      <span className="sr-only">Complete item</span>
                    </Button>
                  )}
                  {(scheduleItem.done || item.status === "Done") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-6 w-6 p-0",
                        "hover:bg-green-200/80 dark:hover:bg-green-900/20",
                        "text-green-700 dark:text-green-300"
                      )}
                      onClick={() => onResetItem(item)}
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span className="sr-only">Reset item</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "h-6 w-6 p-0",
                      scheduleItem.done || item.status === "Done"
                        ? "hover:bg-green-200/80 dark:hover:bg-green-900/20 text-green-700 dark:text-green-300"
                        : "hover:bg-gray-200/80 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                    )}
                    onClick={() => onRemoveItem(day, scheduleItem.id, item)}
                  >
                    <Minus className="h-3 w-3" />
                    <span className="sr-only">Remove item</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>

        <CardFooter className="flex flex-col gap-2 p-4 border-t border-gray-100 dark:border-gray-800 flex-none">
          <div className="flex justify-center w-full gap-2">
            <TooltipProvider>
              <Tooltip delayDuration={1000}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Block Limit:
                    </span>
                    <Input
                      type="number"
                      value={blockLimit}
                      onChange={(e) =>
                        onBlockLimitChange(day, parseInt(e.target.value) || 0)
                      }
                      className={cn(
                        "w-20 text-sm",
                        "bg-white/90 dark:bg-gray-800/90",
                        "border-gray-200/50 dark:border-gray-700/50",
                        "focus:ring-blue-500/50 dark:focus:ring-blue-400/50",
                        "placeholder:text-gray-500 dark:placeholder:text-gray-400"
                      )}
                      min="0"
                      step="100"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="flex flex-col gap-2 p-2 z-50"
                  sideOffset={5}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onBlockLimitChange(day, 1000)}
                  >
                    Reset (1,000)
                  </Button>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button
            className={cn(
              "w-full transition-all duration-200 hover:scale-105",
              "bg-gradient-to-b from-white/80 to-gray-50/80 dark:from-gray-800/80 dark:to-gray-900/80",
              "border-gray-200/50 dark:border-gray-700/50",
              "text-gray-900 dark:text-gray-100",
              "hover:from-gray-50/90 hover:to-gray-100/90 dark:hover:from-gray-700/90 dark:hover:to-gray-800/90"
            )}
            size="sm"
            variant="outline"
            onClick={() => onAddItem(day)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Item
          </Button>
          <Button
            className={cn(
              "w-full transition-all duration-200 hover:scale-105",
              "bg-gradient-to-b from-red-50/10 to-red-100/10 dark:from-red-950/10 dark:to-red-900/10",
              "border-red-200/30 dark:border-red-900/30",
              "text-red-600 dark:text-red-400",
              "hover:from-red-50/20 hover:to-red-100/20 dark:hover:from-red-950/20 dark:hover:to-red-900/20"
            )}
            size="sm"
            variant="outline"
            onClick={() => onClearDay(day)}
            disabled={!daySchedule?.length}
          >
            Clear Day
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const WeeklyPlanner = () => {
  const [items, setItems] = React.useState<Item[]>([]);
  const { weeklySchedules, currentWeekStart, addItemToDay, changeWeek } =
    useWeeklySchedule({
      weekStartsOn: 0,
    }) as WeeklyScheduleHooks;
  const [isAddingItem, setIsAddingItem] = React.useState(false);
  const [currentDay, setCurrentDay] = React.useState<DayName | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterDesign, setFilterDesign] = React.useState("all");
  const [filterSize, setFilterSize] = React.useState("all");
  const [itemToRemove, setItemToRemove] = React.useState<{
    day: DayName;
    itemId: string;
    item: Item;
  } | null>(null);
  const [itemToComplete, setItemToComplete] = React.useState<Item | null>(null);
  const [itemToReset, setItemToReset] = React.useState<Item | null>(null);
  const [showAutoSchedule, setShowAutoSchedule] = React.useState(false);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [weeklyCheckStatus, setWeeklyCheckStatus] = useState<{
    [weekKey: string]: {
      Sunday: boolean;
      Monday: boolean;
      Tuesday: boolean;
      Wednesday: boolean;
      Thursday: boolean;
    };
  }>({});
  const [dayToClear, setDayToClear] = useState<DayName | null>(null);
  const [showClearWeekConfirm, setShowClearWeekConfirm] = useState(false);
  const [useNumber, setUseNumber] = useState(true);
  const [showWeekResetConfirm, setShowWeekResetConfirm] = useState(false);
  const [showSingleWeekAutoSchedule, setShowSingleWeekAutoSchedule] =
    useState(false);
  const [blockLimitItem, setBlockLimitItem] = useState<{
    day: DayName;
    item: Item;
    currentBlocks: number;
    newBlocks: number;
  } | null>(null);
  const [blockLimits, setBlockLimits] = useState<
    Record<string, Record<DayName, number>>
  >({});
  const [showMaximumsResetConfirm, setShowMaximumsResetConfirm] =
    useState(false);
  const [highBlockItems, setHighBlockItems] = useState<HighBlockItem[]>([]);
  const [showHighBlockWarning, setShowHighBlockWarning] = useState(false);

  const { board, updateWeeklySchedules } = useOrderStore();

  React.useEffect(() => {
    const weekKey = format(currentWeekStart, "yyyy-MM-dd");
    setBlockLimits((prev) => {
      // If this week doesn't have limits set yet, initialize them
      if (!prev[weekKey]) {
        const defaultLimits: Record<DayName, number> = {
          Sunday: 1000,
          Monday: 1000,
          Tuesday: 1000,
          Wednesday: 1000,
          Thursday: 1000,
          Friday: 1000,
          Saturday: 1000,
        };

        return {
          ...prev,
          [weekKey]: defaultLimits,
        };
      }
      return prev;
    });
  }, [currentWeekStart]);

  React.useEffect(() => {
    setItems(
      board?.items_page?.items.filter(
        (item) => !item.deleted && item.visible
      ) || []
    );
  }, [board]);

  const getItemValue = (item: Item, columnName: ColumnTitles): string => {
    return item.values.find((v) => v.columnName === columnName)?.text || "";
  };

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
  ] as DayName[];
  const weekKey = format(currentWeekStart, "yyyy-MM-dd");
  const currentSchedule = (weeklySchedules[weekKey] || {}) as DaySchedule;

  const designs = React.useMemo(
    () => [
      ...new Set(items.map((item) => getItemValue(item, ColumnTitles.Design))),
    ],
    [items]
  );

  const sizes = React.useMemo(
    () => [
      ...new Set(items.map((item) => getItemValue(item, ColumnTitles.Size))),
    ],
    [items]
  );

  const handleAddItem = (day: DayName) => {
    setCurrentDay(day);
    setIsAddingItem(true);
  };

  const handleQuickAdd = async (day: DayName, item: Item) => {
    const weekKey = format(currentWeekStart, "yyyy-MM-dd");
    await addItemToDay(day, item.id, weekKey);
  };

  // Create a wrapper function that matches the expected signature
  const handleQuickAddWrapper = (day: string, itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      handleQuickAdd(day as DayName, item);
    }
  };

  const handleRemoveItem = (day: DayName, itemId: string, item: Item) => {
    setItemToRemove({ day, itemId, item });
  };

  const handleConfirmRemove = async () => {
    if (!itemToRemove || !board) return;

    try {
      const weekKey = format(currentWeekStart, "yyyy-MM-dd");
      const newSchedules = { ...board.weeklySchedules };
      if (newSchedules[weekKey]) {
        newSchedules[weekKey] = {
          ...newSchedules[weekKey],
          [itemToRemove.day]: newSchedules[weekKey][itemToRemove.day].filter(
            (item) => item.id !== itemToRemove.itemId
          ),
        };
        await updateWeeklySchedules(board.id, newSchedules);
        setItemToRemove(null);
        toast.success("Successfully removed item");
      }
    } catch (error) {
      console.error("Failed to remove item:", error);
      toast.error("Failed to remove item");
    }
  };

  const handleCompleteItem = (item: Item) => {
    setItemToComplete(item);
  };

  const handleConfirmComplete = async () => {
    if (!itemToComplete || !boardCollection) return;

    await boardCollection.updateOne(
      { "items_page.items.id": itemToComplete.id },
      { $set: { "items_page.items.$.status": "Done" } }
    );

    // Refresh items to show updated status
    const board = await boardCollection.findOne({});
    if (board?.items_page?.items) {
      setItems(board.items_page.items);
    }
  };

  const handleResetItem = (item: Item) => {
    setItemToReset(item);
  };

  const handleConfirmReset = async () => {
    // Hey Bentzy!
    // This is where you'll need to implement the reset functionality.
    // You'll want to:
    // 1. Update the item's status back to "In Progress" or whatever the default status should be
    // 2. Update the scheduleItem.done flag if needed
    // 3. Make sure to refresh the items list after the update
    setItemToReset(null);
  };

  const filteredItems = React.useMemo(
    () =>
      items.filter(
        (item) =>
          !item.isScheduled &&
          getItemValue(item, ColumnTitles.Customer_Name)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) &&
          (filterDesign === "all" ||
            getItemValue(item, ColumnTitles.Design) === filterDesign) &&
          (filterSize === "all" ||
            getItemValue(item, ColumnTitles.Size) === filterSize)
      ),
    [items, searchTerm, filterDesign, filterSize]
  );

  const handleAutoScheduleClick = () => {
    // First check for high block items
    const preview = sortItems({
      items,
      currentSchedule,
      targetWeek: currentWeekStart,
      weeklySchedules,
      blockLimits,
      excludedDays,
    });

    // Get the active high block items from the preview
    const { activeHighBlockItems } = preview;

    // Check for high block items
    if (activeHighBlockItems && activeHighBlockItems.length > 0) {
      setHighBlockItems(activeHighBlockItems);
      setShowHighBlockWarning(true);
      return;
    }

    // If no high block items, proceed with normal flow
    proceedWithAutoSchedule(preview.schedule);
  };

  const proceedWithAutoSchedule = (
    schedule: Record<string, ScheduleItem[]>
  ) => {
    // Store all weeks in the proposed schedule
    Object.entries(schedule).forEach(([weekKey, weekSchedule]) => {
      setProposedSchedule(weekKey, weekSchedule);
    });

    setShowAutoSchedule(true);
  };

  const handleHighBlockWarningClose = () => {
    setShowHighBlockWarning(false);

    // Proceed with auto-schedule after warning
    const preview = sortItems({
      items,
      currentSchedule,
      targetWeek: currentWeekStart,
      weeklySchedules,
      blockLimits,
      excludedDays,
    });

    // Use preview.schedule instead of preview directly
    proceedWithAutoSchedule(preview.schedule);
  };

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const handleResetConfirm = async (resetAll: boolean) => {
    try {
      if (resetAll) {
        // Clear all weekly schedules
        await updateWeeklySchedules(board.id, {});
        toast.success("Successfully cleared all scheduled items");
      } else {
        // Clear only current week
        const weekKey = format(currentWeekStart, "yyyy-MM-dd");
        const newSchedules = { ...board.weeklySchedules };
        delete newSchedules[weekKey];
        await updateWeeklySchedules(board.id, newSchedules);
        toast.success("Successfully cleared this week's schedule");
      }
      setShowResetConfirm(false);
    } catch (error) {
      console.error("Reset failed:", error);
      toast.error("Failed to reset schedule. Please try again.");
    }
  };

  const calculateBlocks = (item: Item): number => {
    const sizeStr =
      item.values.find((v) => v.columnName === "Size")?.text || "";
    const dimensions = sizeStr.split("x").map((dim) => parseFloat(dim.trim()));
    const width = dimensions[0] || 0;
    const height = dimensions[1] || 0;
    return width * height;
  };

  const handleWeekChange = (direction: "prev" | "next") => {
    changeWeek(direction);
  };

  // Helper function to check if current week is auto-scheduled
  const isCurrentWeekAutoScheduled = React.useMemo(() => {
    const weekKey = format(currentWeekStart, "yyyy-MM-dd");
    return !!board?.weeklySchedules?.[weekKey];
  }, [currentWeekStart, board?.weeklySchedules]);

  const handleClearDay = async (day: DayName) => {
    if (!board) return;

    try {
      const weekKey = format(currentWeekStart, "yyyy-MM-dd");
      const newSchedules = { ...board.weeklySchedules };
      if (newSchedules[weekKey]) {
        newSchedules[weekKey] = {
          ...newSchedules[weekKey],
          [day]: [], // Clear the specific day
        };
        await updateWeeklySchedules(board.id, newSchedules);
        toast.success(`Successfully cleared ${day}`);
      }
    } catch (error) {
      console.error("Failed to clear day:", error);
      toast.error(`Failed to clear ${day}`);
    }
  };

  const handleConfirmClear = async () => {
    if (!dayToClear || !board) return;

    try {
      const weekKey = format(currentWeekStart, "yyyy-MM-dd");
      const newSchedules = { ...board.weeklySchedules };
      if (newSchedules[weekKey]) {
        newSchedules[weekKey] = {
          ...newSchedules[weekKey],
          [dayToClear]: [], // Clear the specific day
        };
        await updateWeeklySchedules(board.id, newSchedules);
        setDayToClear(null);
        toast.success(`Successfully cleared ${dayToClear}`);
      }
    } catch (error) {
      console.error("Failed to clear day:", error);
      toast.error(`Failed to clear ${dayToClear}`);
    }
  };

  const handleClearWeek = async () => {
    if (!board) return;

    try {
      const weekKey = format(currentWeekStart, "yyyy-MM-dd");
      const newSchedules = { ...board.weeklySchedules };
      delete newSchedules[weekKey];
      await updateWeeklySchedules(board.id, newSchedules);
      toast.success("Successfully cleared all items from this week");
    } catch (error) {
      console.error("Failed to clear week:", error);
      toast.error("Failed to clear week");
    }
  };

  // Add this function to determine if a given day is today
  const isCurrentDay = (day: DayName) => {
    const today = new Date();
    const dayIndex = daysOfWeek.indexOf(day);

    // Return false if it's Friday (5) or Saturday (6)
    if (today.getDay() === 5 || today.getDay() === 6) {
      return false;
    }

    // For each day in the current week's schedule, check if it matches today
    const currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentDate.getDate() + dayIndex);

    return isSameDay(today, currentDate);
  };

  const handleSingleWeekAutoScheduleClick = () => {
    const preview = sortItems({
      items,
      currentSchedule,
      targetWeek: currentWeekStart,
      weeklySchedules,
      blockLimits,
      excludedDays,
    });

    // Store the schedule for the current week only
    const weekKey = format(currentWeekStart, "yyyy-MM-dd");
    if (preview.schedule[weekKey]) {
      setProposedSchedule(weekKey, preview.schedule[weekKey]);
    }

    // Set initial check status for the week before opening dialog
    setWeeklyCheckStatus((prev) => ({
      ...prev,
      [weekKey]: {
        Sunday: true,
        Monday: true,
        Tuesday: true,
        Wednesday: true,
        Thursday: true,
      },
    }));

    setShowSingleWeekAutoSchedule(true);
  };

  const onUpdateCheckStatus = (status: Record<string, WeekCheckStatus>) => {
    setWeeklyCheckStatus((prev) => ({
      ...prev,
      ...status,
    }));
  };

  const handleConfirmBlockLimit = async () => {
    if (blockLimitItem) {
      await addItemToDay(blockLimitItem.day, blockLimitItem.item.id);
      setBlockLimitItem(null);
      setIsAddingItem(false);
    }
  };

  const handleBlockLimitChange = (day: DayName, value: number) => {
    const weekKey = format(currentWeekStart, "yyyy-MM-dd");
    setBlockLimits((prev) => {
      // Create a new week object with all existing days or default values
      const updatedWeek: Record<DayName, number> = {
        ...(prev[weekKey] || {
          Sunday: 1000,
          Monday: 1000,
          Tuesday: 1000,
          Wednesday: 1000,
          Thursday: 1000,
          Friday: 1000,
          Saturday: 1000,
        }),
        [day]: Math.max(0, value),
      };

      return {
        ...prev,
        [weekKey]: updatedWeek,
      };
    });
  };

  const handleAutoScheduleConfirm = async () => {
    if (!board) return;

    try {
      const newSchedules = { ...board.weeklySchedules };

      // Apply proposed schedule changes
      Object.entries(proposedSchedule).forEach(([weekKey, weekSchedule]) => {
        const daySchedule = weekSchedule.reduce<DaySchedule>(
          (acc, { day, item }) => ({
            ...acc,
            [day]: [...(acc[day] || []), { id: item.id, done: false }],
          }),
          {} as DaySchedule
        );

        newSchedules[weekKey] = {
          ...newSchedules[weekKey],
          ...daySchedule,
        };
      });

      await updateWeeklySchedules(board.id, newSchedules);
      clearProposedSchedule();
      setShowAutoSchedule(false);
      toast.success("Successfully auto-scheduled items");
    } catch (error) {
      console.error("Failed to auto-schedule items:", error);
      toast.error("Failed to auto-schedule items. Please try again.");
    }
  };

  return (
    <div className="dark:bg-black">
      <div className="flex flex-col min-h-screen h-full p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/70 dark:to-gray-900">
        <Card className="mb-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-gray-200/50 dark:border-gray-800/50">
          <CardHeader className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-gradient-to-b from-white/50 to-gray-50/50 dark:from-gray-900/50 dark:to-gray-800/50 rounded-t-xl border-b border-gray-100/50 dark:border-gray-800/50">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Weekly Planner
            </CardTitle>
            <div className="flex-1 flex justify-center">
              <WeekSelector
                currentWeekStart={currentWeekStart}
                onChangeWeek={handleWeekChange}
                weekStartsOn={0}
              />
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="transition-all duration-200 hover:scale-105"
                      onClick={handleAutoScheduleClick}
                      disabled={isPastWorkWeek(currentWeekStart)}
                    >
                      <Wand2 className="h-4 w-4" />
                      <span className="sr-only">Auto Schedule</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="flex flex-col gap-2 p-2 z-50"
                    sideOffset={5}
                  >
                    <p className="text-sm font-medium">Auto Schedule</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSingleWeekAutoScheduleClick();
                      }}
                    >
                      Schedule This Week Only
                    </Button>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {isCurrentWeekAutoScheduled && (
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowResetConfirm(true)}
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span className="sr-only">Reset Schedule</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="flex flex-col gap-2 p-2 z-50"
                      sideOffset={5}
                    >
                      <p className="text-sm font-medium">Reset Schedule</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowWeekResetConfirm(true);
                        }}
                      >
                        Reset This Week Only
                      </Button>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {daysOfWeek.some(
                (day) => (blockLimits[weekKey]?.[day] ?? 1000) !== 1000
              ) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950"
                  onClick={() => setShowMaximumsResetConfirm(true)}
                >
                  Reset Max
                </Button>
              )}

              {daysOfWeek.some((day) => currentSchedule[day]?.length > 0) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950"
                  onClick={() => setShowClearWeekConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Clear Week</span>
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        <Separator className="mb-4" />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 flex-1">
          {daysOfWeek.map((day) => {
            const daySchedule = (currentSchedule[day] || [])
              .map((scheduleItem) => ({
                day, // Add the day property
                item: items.find((i) => i.id === scheduleItem.id)!,
                id: scheduleItem.id,
                done: scheduleItem.done,
              }))
              .filter((item) => item.item);

            const totalBlocks = daySchedule.reduce((total, scheduleItem) => {
              return total + calculateBlocks(scheduleItem.item);
            }, 0);

            return (
              <DayCard
                key={day}
                day={day}
                isCurrentDay={isCurrentDay(day)}
                daySchedule={daySchedule}
                totalBlocks={totalBlocks}
                blockLimit={blockLimits[weekKey]?.[day] ?? 1000}
                onBlockLimitChange={handleBlockLimitChange}
                onAddItem={handleAddItem}
                onClearDay={handleClearDay}
                onCompleteItem={handleCompleteItem}
                onResetItem={handleResetItem}
                onRemoveItem={handleRemoveItem}
                getItemValue={getItemValue}
                useNumber={useNumber}
                weekKey={weekKey}
                items={items}
                onBadgeClick={() => setUseNumber(!useNumber)}
              />
            );
          })}
        </div>

        <AddItemDialog
          isOpen={isAddingItem}
          onClose={() => setIsAddingItem(false)}
          currentDay={currentDay || "Sunday"}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterDesign={filterDesign}
          setFilterDesign={setFilterDesign}
          filterSize={filterSize}
          setFilterSize={setFilterSize}
          designs={designs}
          sizes={sizes}
          filteredItems={filteredItems}
          handleQuickAdd={handleQuickAddWrapper}
          getItemValue={getItemValue}
        />

        {itemToRemove && (
          <BaseConfirmDialog
            isOpen={!!itemToRemove}
            onClose={() => setItemToRemove(null)}
            onConfirm={handleConfirmRemove}
            title="Remove Item"
            description="Are you sure you want to remove this item from the schedule?"
            confirmText="Remove"
            confirmVariant="destructive"
          >
            <p className="font-medium">
              {getItemValue(itemToRemove.item, ColumnTitles.Customer_Name)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getItemValue(itemToRemove.item, ColumnTitles.Design)} -{" "}
              {getItemValue(itemToRemove.item, ColumnTitles.Size)}
            </p>
          </BaseConfirmDialog>
        )}

        {itemToComplete && (
          <BaseConfirmDialog
            isOpen={!!itemToComplete}
            onClose={() => setItemToComplete(null)}
            onConfirm={handleConfirmComplete}
            title="Complete Item"
            description="Are you sure you want to mark this item as completed?"
            confirmText="Complete"
            confirmVariant="default"
            confirmClassName="bg-green-600 hover:bg-green-700"
          >
            <p className="font-medium">
              {getItemValue(itemToComplete, ColumnTitles.Customer_Name)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getItemValue(itemToComplete, ColumnTitles.Design)} -{" "}
              {getItemValue(itemToComplete, ColumnTitles.Size)}
            </p>
          </BaseConfirmDialog>
        )}

        <BaseConfirmDialog
          isOpen={showResetConfirm}
          onClose={() => setShowResetConfirm(false)}
          onConfirm={() => handleResetConfirm(true)}
          title="Reset All Data"
          description="Are you sure you want to reset all data? This will clear all schedules, maximums, and settings. This action cannot be undone."
          confirmText="Reset All"
          confirmVariant="destructive"
        />

        <AutoScheduleDialog
          isOpen={showAutoSchedule}
          onClose={() => setShowAutoSchedule(false)}
          onConfirm={handleAutoScheduleConfirm}
          onUpdateCheckStatus={onUpdateCheckStatus}
          getItemValue={getItemValue}
          plannerCurrentWeek={currentWeekStart}
          currentSchedule={currentSchedule}
          weeklySchedules={weeklySchedules}
          mode="multi"
          items={items}
          blockLimits={blockLimits}
        />

        {dayToClear && (
          <BaseConfirmDialog
            isOpen={!!dayToClear}
            onClose={() => setDayToClear(null)}
            onConfirm={handleConfirmClear}
            title={`Clear ${dayToClear}`}
            description={`Are you sure you want to clear all items from ${dayToClear}? This action cannot be undone.`}
            confirmText="Clear Day"
            confirmVariant="destructive"
          />
        )}

        <BaseConfirmDialog
          isOpen={showClearWeekConfirm}
          onClose={() => setShowClearWeekConfirm(false)}
          onConfirm={handleClearWeek}
          title="Clear Week"
          description={`Are you sure you want to clear all items for the week of ${format(
            currentWeekStart,
            "MMM d, yyyy"
          )}? This action cannot be undone.`}
          confirmText="Clear Week"
          confirmVariant="destructive"
        />

        <BaseConfirmDialog
          isOpen={showWeekResetConfirm}
          onClose={() => setShowWeekResetConfirm(false)}
          onConfirm={handleAutoScheduleConfirm}
          title={`Reset Week from ${currentDay}`}
          description={`Are you sure you want to reset all days starting from ${currentDay}? This action cannot be undone.`}
          confirmText="Reset Week"
          confirmVariant="destructive"
        />

        {blockLimitItem && (
          <BaseConfirmDialog
            isOpen={!!blockLimitItem}
            onClose={() => setBlockLimitItem(null)}
            onConfirm={handleConfirmBlockLimit}
            title="Block Limit Warning"
            description={`Adding this item will exceed the maximum blocks for ${
              blockLimitItem.day
            } (${blockLimitItem.currentBlocks}/${
              blockLimits[format(currentWeekStart, "yyyy-MM-dd")]?.[
                blockLimitItem.day
              ] ?? 1000
            } blocks). Would you like to proceed anyway?`}
            confirmText="Add Anyway"
            confirmVariant="default"
            confirmClassName="bg-yellow-600 hover:bg-yellow-700"
          />
        )}

        <BaseConfirmDialog
          isOpen={showMaximumsResetConfirm}
          onClose={() => setShowMaximumsResetConfirm(false)}
          onConfirm={() => {
            const weekKey = format(currentWeekStart, "yyyy-MM-dd");
            const defaultLimits: Record<DayName, number> = {
              Sunday: 1000,
              Monday: 1000,
              Tuesday: 1000,
              Wednesday: 1000,
              Thursday: 1000,
              Friday: 1000,
              Saturday: 1000,
            };
            setBlockLimits((prev) => ({
              ...prev,
              [weekKey]: defaultLimits,
            }));
            setShowMaximumsResetConfirm(false);
          }}
          title="Reset Maximums"
          description="Are you sure you want to reset all daily maximums to their default values? This action cannot be undone."
          confirmText="Reset Maximums"
          confirmVariant="destructive"
        />

        <HighBlockWarningDialog
          isOpen={showHighBlockWarning}
          onClose={handleHighBlockWarningClose}
          items={highBlockItems}
        />
      </div>
    </div>
  );
};

export default WeeklyPlanner;
