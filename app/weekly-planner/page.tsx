"use client";

import React from "react";
import { useWeeklySchedule } from "@/components/weekly-schedule/UseWeeklySchedule";
import { format } from "date-fns";
import { useRealmApp } from "@/hooks/useRealmApp";
import { ColumnTitles, Item, DayName, DaySchedule } from "@/typings/types";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Check, RotateCcw, Wand2 } from "lucide-react";
import { AddItemDialog } from "@/components/weekly-schedule/AddItemDialog";
import { ConfirmRemoveDialog } from "./ConfirmRemoveDialog";
import { ConfirmCompleteDialog } from "./ConfirmCompleteDialog";
import { ConfirmResetDialog } from "./ConfirmResetDialog";
import { sortItems } from "./ItemSorting";
import { AutoScheduleDialog } from "./AutoScheduleDialog";
import { ConfirmScheduleResetDialog } from "./ConfirmScheduleResetDialog";
import { useAutoScheduleStore } from "./stores/useAutoScheduleStore";
import { toast } from "sonner";
import { WeekSelector } from "@/components/weekly-schedule/WeekSelector";

type BadgeStatus = {
  text: string;
  classes: string;
};

const getDueDateStatus = (dueDate: Date | null): BadgeStatus => {
  if (!dueDate) {
    return {
      text: "No due date",
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
      text: "Overdue",
      classes: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
  } else if (diffDays === 0) {
    return {
      text: "Today",
      classes:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
  } else if (diffDays === 1) {
    return {
      text: "Tomorrow",
      classes:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
  } else if (diffDays === 2) {
    return {
      text: "2 days",
      classes:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
  } else if (diffDays < 7) {
    return {
      text: "3+ days",
      classes:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
  } else if (diffDays < 30) {
    return {
      text: "Week+",
      classes:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
  } else {
    return {
      text: "Month+",
      classes:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
  }
};

const WeeklyPlanner = () => {
  const { boardCollection } = useRealmApp();
  const [items, setItems] = React.useState<Item[]>([]);
  const {
    weeklySchedules,
    currentWeekStart,
    addItemToDay,
    removeItemFromDay,
    removeItemsFromSchedule,
    changeWeek,
  } = useWeeklySchedule({
    weekStartsOn: 0,
  });
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
  const [autoScheduled, setAutoScheduled] = React.useState(false);
  const [showAutoSchedule, setShowAutoSchedule] = React.useState(false);
  const [schedulePreview, setSchedulePreview] = React.useState<any>({});
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [autoScheduledItems, setAutoScheduledItems] = React.useState<
    Set<string>
  >(new Set());
  const { proposedSchedule, setProposedSchedule, clearProposedSchedule } =
    useAutoScheduleStore();
  const [autoScheduledWeeks, setAutoScheduledWeeks] = React.useState<
    Map<string, boolean>
  >(new Map());

  React.useEffect(() => {
    const loadItems = async () => {
      if (!boardCollection) return;
      const board = await boardCollection.findOne({});
      if (board?.items_page?.items) {
        setItems(board.items_page.items);
      }
    };
    loadItems();
  }, [boardCollection]);

  React.useEffect(() => {
    const weekKey = format(currentWeekStart, "yyyy-MM-dd");
    const storedItems = localStorage.getItem(`autoScheduledItems-${weekKey}`);
    const storedScheduleState = localStorage.getItem(
      `autoScheduled-${weekKey}`
    );

    console.log(`Loading auto-scheduled items for week ${weekKey}:`, {
      storedItems: storedItems
        ? JSON.parse(storedItems).map((id: string) => {
            const item = items.find((i) => i.id === id);
            return item ? getItemValue(item, ColumnTitles.Customer_Name) : id;
          })
        : null,
      storedScheduleState,
    });

    if (storedItems) {
      const parsedItems = JSON.parse(storedItems);
      console.log(
        "Setting auto-scheduled items:",
        parsedItems.map((id: string) => {
          const item = items.find((i) => i.id === id);
          return item ? getItemValue(item, ColumnTitles.Customer_Name) : id;
        })
      );
      setAutoScheduledItems(new Set(parsedItems));
    } else {
      setAutoScheduledItems(new Set());
    }

    setAutoScheduledWeeks((prev) => {
      const newMap = new Map(prev);
      if (storedScheduleState === "true" && storedItems) {
        newMap.set(weekKey, true);
      } else {
        newMap.delete(weekKey);
      }
      return newMap;
    });
  }, [currentWeekStart, items]);

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
    await addItemToDay(day, item.id);
    setIsAddingItem(false);
  };

  const handleRemoveItem = (day: DayName, itemId: string, item: Item) => {
    setItemToRemove({ day, itemId, item });
  };

  const handleConfirmRemove = async () => {
    if (itemToRemove) {
      await removeItemFromDay(itemToRemove.day, itemToRemove.itemId);
      setItemToRemove(null);
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
    const preview = sortItems({
      items,
      currentSchedule,
      targetWeek: currentWeekStart,
      weeklySchedules,
    });

    // Store all weeks in the proposed schedule
    Object.entries(preview).forEach(([weekKey, weekSchedule]) => {
      setProposedSchedule(weekKey, weekSchedule);
    });

    setShowAutoSchedule(true);
  };

  const handleAutoScheduleConfirm = async () => {
    const autoScheduledByWeek = new Map<string, Set<string>>();

    try {
      // Define valid days
      const validDays = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
      ];

      // Process each week in the proposed schedule
      for (const [weekKey, weekSchedule] of Object.entries(proposedSchedule)) {
        const weekAutoScheduled = new Set<string>();

        // Get currently scheduled items for this week to avoid duplicates
        const existingScheduledItems = new Set<string>();
        const weekExistingSchedule =
          weekKey === format(currentWeekStart, "yyyy-MM-dd")
            ? currentSchedule
            : weeklySchedules[weekKey] || {};

        Object.entries(weekExistingSchedule as DaySchedule).forEach(
          ([day, scheduleItems]) => {
            if (validDays.includes(day)) {
              scheduleItems.forEach((item) => {
                existingScheduledItems.add(item.id);
              });
            }
          }
        );

        // Filter out already scheduled items for this week
        const newItemsToSchedule = weekSchedule.filter(
          ({ item }) => !existingScheduledItems.has(item.id)
        );

        // Group items by day (only new items)
        const itemsByDay = newItemsToSchedule.reduce((acc, { day, item }) => {
          if (!acc[day]) {
            acc[day] = [];
          }
          acc[day].push(item.id);
          return acc;
        }, {} as Record<DayName, string[]>);

        // Process each day's items
        for (const [day, itemIds] of Object.entries(itemsByDay)) {
          const BATCH_SIZE = 3;
          for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
            const batch = itemIds.slice(i, i + BATCH_SIZE);
            await Promise.all(
              batch.map(async (id) => {
                try {
                  await addItemToDay(day as DayName, id, weekKey);
                  weekAutoScheduled.add(id);
                } catch (error) {
                  console.warn(
                    `Failed to add item ${id} to ${day} in week ${weekKey}:`,
                    error
                  );
                }
              })
            );
          }
        }

        // Store auto-scheduled items for this week immediately after scheduling them
        if (weekAutoScheduled.size > 0) {
          console.log(
            `Storing auto-scheduled items for week ${weekKey}:`,
            [...weekAutoScheduled].map((id) => {
              const item = items.find((i) => i.id === id);
              return item ? getItemValue(item, ColumnTitles.Customer_Name) : id;
            })
          );
          autoScheduledByWeek.set(weekKey, weekAutoScheduled);

          // Make sure to store in localStorage for each week
          localStorage.setItem(`autoScheduled-${weekKey}`, "true");
          localStorage.setItem(
            `autoScheduledItems-${weekKey}`,
            JSON.stringify([...weekAutoScheduled])
          );
        }
      }

      const totalScheduled = Array.from(autoScheduledByWeek.values()).reduce(
        (total, set) => total + set.size,
        0
      );

      if (totalScheduled > 0) {
        // Update the auto-scheduled status for all affected weeks
        setAutoScheduledWeeks((prev) => {
          const newMap = new Map(prev);
          for (const weekKey of autoScheduledByWeek.keys()) {
            newMap.set(weekKey, true);
          }
          return newMap;
        });

        // Set current week's items for the UI
        const currentWeekKey = format(currentWeekStart, "yyyy-MM-dd");
        setAutoScheduledItems(
          autoScheduledByWeek.get(currentWeekKey) || new Set()
        );

        clearProposedSchedule();
        setShowAutoSchedule(false);
        setAutoScheduled(true);

        toast.success(
          `Successfully scheduled ${totalScheduled} ${
            totalScheduled === 1 ? "item" : "items"
          } across ${autoScheduledByWeek.size} ${
            autoScheduledByWeek.size === 1 ? "week" : "weeks"
          }`
        );
      } else {
        toast.error("No new items to schedule.");
      }
    } catch (error) {
      console.error("Auto-schedule failed:", error);
      toast.error("Failed to auto-schedule items. Please try again.");
    }
  };

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const handleResetConfirm = async (resetAll: boolean) => {
    try {
      if (resetAll) {
        console.log("Starting reset all process");
        setAutoScheduledWeeks(new Map());

        const itemsToRemove: {
          day: DayName;
          itemId: string;
          weekKey?: string;
        }[] = [];

        Object.entries(weeklySchedules).forEach(([weekKey, schedule]) => {
          console.log(`Processing week: ${weekKey}`);
          const weekAutoScheduledItems = localStorage.getItem(
            `autoScheduledItems-${weekKey}`
          );
          console.log(
            "Auto-scheduled items from storage:",
            weekAutoScheduledItems
              ? JSON.parse(weekAutoScheduledItems).map((id: string) => {
                  const item = items.find((i) => i.id === id);
                  return item
                    ? getItemValue(item, ColumnTitles.Customer_Name)
                    : id;
                })
              : null
          );

          const weekItems = weekAutoScheduledItems
            ? new Set(JSON.parse(weekAutoScheduledItems))
            : new Set();

          console.log(
            "Week items set:",
            [...weekItems].map((id) => {
              const item = items.find((i) => i.id === id);
              return item ? getItemValue(item, ColumnTitles.Customer_Name) : id;
            })
          );

          for (const day of daysOfWeek) {
            const daySchedule = schedule[day] || [];
            console.log(
              `Day ${day} schedule:`,
              daySchedule.map((item) => {
                const fullItem = items.find((i) => i.id === item.id);
                return fullItem
                  ? getItemValue(fullItem, ColumnTitles.Customer_Name)
                  : item.id;
              })
            );

            for (const scheduleItem of daySchedule) {
              const fullItem = items.find((i) => i.id === scheduleItem.id);
              const customerName = fullItem
                ? getItemValue(fullItem, ColumnTitles.Customer_Name)
                : scheduleItem.id;

              console.log(
                `Checking item ${customerName}, is auto-scheduled:`,
                weekItems.has(scheduleItem.id)
              );

              if (weekItems.has(scheduleItem.id)) {
                itemsToRemove.push({ day, itemId: scheduleItem.id, weekKey });
                console.log(`Added item to remove: ${customerName}`);
              }
            }
          }

          localStorage.removeItem(`autoScheduled-${weekKey}`);
          localStorage.removeItem(`autoScheduledItems-${weekKey}`);
        });

        console.log(
          "Final items to remove:",
          itemsToRemove.map((item) => {
            const fullItem = items.find((i) => i.id === item.itemId);
            return {
              ...item,
              customerName: fullItem
                ? getItemValue(fullItem, ColumnTitles.Customer_Name)
                : item.itemId,
            };
          })
        );

        if (itemsToRemove.length > 0) {
          await removeItemsFromSchedule(itemsToRemove);
        }

        setAutoScheduledItems(new Set());
        setAutoScheduled(false);
        setShowResetConfirm(false);

        toast.success(
          `Successfully removed ${itemsToRemove.length} auto-scheduled ${
            itemsToRemove.length === 1 ? "item" : "items"
          } from all weeks`
        );
      } else {
        // Reset single week
        const currentWeekKey = format(currentWeekStart, "yyyy-MM-dd");

        // Get the auto-scheduled items for this specific week
        const weekAutoScheduledItems = localStorage.getItem(
          `autoScheduledItems-${currentWeekKey}`
        );
        const weekItems = weekAutoScheduledItems
          ? new Set(JSON.parse(weekAutoScheduledItems))
          : new Set();

        const itemsToRemove: {
          day: DayName;
          itemId: string;
          weekKey?: string;
        }[] = [];

        for (const day of daysOfWeek) {
          const daySchedule = currentSchedule[day] || [];
          for (const scheduleItem of daySchedule) {
            if (weekItems.has(scheduleItem.id)) {
              itemsToRemove.push({
                day,
                itemId: scheduleItem.id,
                weekKey: currentWeekKey,
              });
            }
          }
        }

        if (itemsToRemove.length > 0) {
          await removeItemsFromSchedule(itemsToRemove);
        }

        localStorage.removeItem(`autoScheduled-${currentWeekKey}`);
        localStorage.removeItem(`autoScheduledItems-${currentWeekKey}`);

        // Update states for the current week
        setAutoScheduledItems(new Set());
        setAutoScheduled(false);
        setShowResetConfirm(false);

        // Update the week's status in the Map
        setAutoScheduledWeeks((prev) => {
          const newMap = new Map(prev);
          newMap.delete(currentWeekKey);
          return newMap;
        });

        toast.success(
          `Successfully removed ${itemsToRemove.length} auto-scheduled ${
            itemsToRemove.length === 1 ? "item" : "items"
          } from this week`
        );
      }
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
    return autoScheduledWeeks.get(weekKey) || false;
  }, [currentWeekStart, autoScheduledWeeks]);

  return (
    <div className="flex flex-col h-screen p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">Weekly Planner</h1>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <WeekSelector
            currentWeekStart={currentWeekStart}
            onChangeWeek={handleWeekChange}
            weekStartsOn={0}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleAutoScheduleClick}
            >
              <Wand2 className="h-4 w-4" />
              Auto Schedule
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleResetClick}
              disabled={!isCurrentWeekAutoScheduled}
            >
              <RotateCcw className="h-4 w-4" />
              Reset Schedule
            </Button>
          </div>
        </div>
      </div>
      <hr className="border-gray-200 dark:border-gray-700 mb-4" />

      {/* Content sections */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
        {daysOfWeek.map((day) => {
          const daySchedule = currentSchedule[day] || [];
          const totalBlocks = daySchedule.reduce((total, scheduleItem) => {
            const item = items.find((i) => i.id === scheduleItem.id);
            return total + (item ? calculateBlocks(item) : 0);
          }, 0);

          return (
            <div
              key={day}
              className="border rounded-lg bg-white dark:bg-gray-700 shadow flex flex-col h-full"
            >
              <div className="p-4 border-b text-center bg-white dark:bg-gray-900">
                <h2 className="font-semibold text-2xl text-black dark:text-white">
                  {day}
                </h2>
                <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                  Blocks: {totalBlocks}
                </p>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="space-y-2">
                  {currentSchedule[day]?.map((scheduleItem, index) => {
                    const item = items.find(
                      (i: Item) => i.id === scheduleItem.id
                    );
                    if (!item) return null;

                    const dueDate = new Date(
                      getItemValue(item, ColumnTitles.Due)
                    );
                    const badgeStatus = getDueDateStatus(
                      isNaN(dueDate.getTime()) ? null : dueDate
                    );

                    const uniqueKey = `${day}-${scheduleItem.id}-${index}`;
                    return (
                      <div
                        key={uniqueKey}
                        className={`p-2 rounded-md ${
                          scheduleItem.done || item.status === "Done"
                            ? "bg-green-100 dark:bg-green-500/30"
                            : "bg-gray-100 dark:bg-gray-600"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {getItemValue(item, ColumnTitles.Customer_Name)}
                              </p>
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded-full ${badgeStatus.classes}`}
                              >
                                {badgeStatus.text}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {getItemValue(item, ColumnTitles.Design)} -{" "}
                              {getItemValue(item, ColumnTitles.Size)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {!scheduleItem.done && item.status !== "Done" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-500"
                                onClick={() => handleCompleteItem(item)}
                              >
                                <Check className="h-3 w-3" />
                                <span className="sr-only">Complete item</span>
                              </Button>
                            )}
                            {(scheduleItem.done || item.status === "Done") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:bg-green-200 dark:hover:bg-green-600/50"
                                onClick={() => handleResetItem(item)}
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span className="sr-only">Reset item</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-6 w-6 p-0 ${
                                scheduleItem.done || item.status === "Done"
                                  ? "hover:bg-green-200 dark:hover:bg-green-600/50"
                                  : "hover:bg-gray-200 dark:hover:bg-gray-500"
                              }`}
                              onClick={() =>
                                handleRemoveItem(day, scheduleItem.id, item)
                              }
                            >
                              <Minus className="h-3 w-3" />
                              <span className="sr-only">Remove item</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  className="mt-2 dark:bg-gray-700"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddItem(day)}
                >
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              </div>
            </div>
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
        handleQuickAdd={handleQuickAdd}
        getItemValue={getItemValue}
      />

      <ConfirmRemoveDialog
        isOpen={itemToRemove !== null}
        onClose={() => setItemToRemove(null)}
        onConfirm={handleConfirmRemove}
        item={itemToRemove?.item || null}
        getItemValue={getItemValue}
      />

      <ConfirmCompleteDialog
        isOpen={itemToComplete !== null}
        onClose={() => setItemToComplete(null)}
        onConfirm={handleConfirmComplete}
        item={itemToComplete}
        getItemValue={getItemValue}
      />

      <ConfirmResetDialog
        isOpen={itemToReset !== null}
        onClose={() => setItemToReset(null)}
        onConfirm={handleConfirmReset}
        item={itemToReset}
        getItemValue={getItemValue}
      />

      <AutoScheduleDialog
        isOpen={showAutoSchedule}
        onClose={() => setShowAutoSchedule(false)}
        onConfirm={handleAutoScheduleConfirm}
        getItemValue={getItemValue}
        plannerCurrentWeek={currentWeekStart}
      />

      <ConfirmScheduleResetDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetConfirm}
      />
    </div>
  );
};

export default WeeklyPlanner;
