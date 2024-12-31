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

const WeeklyPlanner = () => {
  const { boardCollection } = useRealmApp();
  const [items, setItems] = React.useState<Item[]>([]);
  const {
    weeklySchedules,
    currentWeekStart,
    addItemToDay,
    removeItemFromDay,
    removeItemsFromSchedule,
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
    const storedScheduleState = localStorage.getItem(
      `autoScheduled-${weekKey}`
    );
    const hasAutoScheduledItems = autoScheduledItems.size > 0;

    setAutoScheduled(storedScheduleState === "true" || hasAutoScheduledItems);
  }, [currentWeekStart, autoScheduledItems]);

  React.useEffect(() => {
    const weekKey = format(currentWeekStart, "yyyy-MM-dd");
    const storedItems = localStorage.getItem(`autoScheduledItems-${weekKey}`);
    if (storedItems) {
      setAutoScheduledItems(new Set(JSON.parse(storedItems)));
    }
  }, [currentWeekStart]);

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
    const currentWeekKey = format(currentWeekStart, "yyyy-MM-dd");
    const preview = sortItems({
      items,
      currentSchedule,
      targetWeek: currentWeekStart,
    });

    // Store the proposed schedule in the global store
    setProposedSchedule(currentWeekKey, preview[currentWeekKey] || []);
    setShowAutoSchedule(true);
  };

  const handleAutoScheduleConfirm = async () => {
    const currentWeekKey = format(currentWeekStart, "yyyy-MM-dd");
    const itemsToSchedule = proposedSchedule[currentWeekKey] || [];
    const newAutoScheduledItems = new Set<string>();

    try {
      // Group items by day
      const itemsByDay = itemsToSchedule.reduce((acc, { day, item }) => {
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(item.id);
        return acc;
      }, {} as Record<DayName, string[]>);

      // Process each day's items
      for (const [day, itemIds] of Object.entries(itemsByDay)) {
        // Add items in smaller batches
        const BATCH_SIZE = 3;
        for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
          const batch = itemIds.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map(async (id) => {
              try {
                await addItemToDay(day as DayName, id);
                newAutoScheduledItems.add(id);
              } catch (error) {
                console.warn(`Failed to add item ${id} to ${day}:`, error);
              }
            })
          );
        }
      }

      if (newAutoScheduledItems.size > 0) {
        localStorage.setItem(`autoScheduled-${currentWeekKey}`, "true");
        localStorage.setItem(
          `autoScheduledItems-${currentWeekKey}`,
          JSON.stringify([...newAutoScheduledItems])
        );

        setAutoScheduledItems(newAutoScheduledItems);
        clearProposedSchedule();
        setShowAutoSchedule(false);
        setAutoScheduled(true);

        toast.success(
          `Successfully scheduled ${newAutoScheduledItems.size} ${
            newAutoScheduledItems.size === 1 ? "item" : "items"
          }`
        );
      } else {
        toast.error("Failed to schedule any items. Please try again.");
      }
    } catch (error) {
      console.error("Auto-schedule failed:", error);
      toast.error("Failed to auto-schedule items. Please try again.");
    }
  };

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const handleResetConfirm = async () => {
    const currentWeekKey = format(currentWeekStart, "yyyy-MM-dd");

    console.log("Starting reset with auto-scheduled items:", [
      ...autoScheduledItems,
    ]);
    console.log("Current schedule:", currentSchedule);

    // Collect all items to remove
    const itemsToRemove: { day: string; itemId: string }[] = [];

    for (const day of daysOfWeek) {
      const daySchedule = currentSchedule[day] || [];
      console.log(`Checking day ${day}, found ${daySchedule.length} items`);

      for (const scheduleItem of daySchedule) {
        if (autoScheduledItems.has(scheduleItem.id)) {
          console.log(
            `Adding auto-scheduled item ${scheduleItem.id} from ${day} to removal list`
          );
          itemsToRemove.push({ day, itemId: scheduleItem.id });
        }
      }
    }

    // Remove all items in one batch
    if (itemsToRemove.length > 0) {
      await removeItemsFromSchedule(itemsToRemove);
      console.log(`Removed ${itemsToRemove.length} items in batch`);
    }

    // Clear the localStorage flags
    localStorage.removeItem(`autoScheduled-${currentWeekKey}`);
    localStorage.removeItem(`autoScheduledItems-${currentWeekKey}`);

    setAutoScheduledItems(new Set());
    setAutoScheduled(false);
    setShowResetConfirm(false);

    toast.success(
      `Successfully removed ${itemsToRemove.length} auto-scheduled ${
        itemsToRemove.length === 1 ? "item" : "items"
      }`
    );
  };

  return (
    <div className="flex flex-col h-screen p-4">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">Weekly Planner</h1>
        {autoScheduled ? (
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleResetClick}
          >
            <RotateCcw className="h-4 w-4" />
            Reset Schedule
          </Button>
        ) : (
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleAutoScheduleClick}
          >
            <Wand2 className="h-4 w-4" />
            Auto Schedule
          </Button>
        )}
      </div>
      <hr className="border-gray-200 dark:border-gray-700 mb-4" />

      {/* Content sections */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="border rounded-lg bg-white dark:bg-gray-700 shadow flex flex-col h-full"
          >
            <div className="p-4 border-b text-center bg-white dark:bg-gray-900">
              <h2 className="font-semibold text-2xl text-black dark:text-white">
                {day}
              </h2>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <div className="space-y-2">
                {currentSchedule[day]?.map((scheduleItem, index) => {
                  const item = items.find(
                    (i: Item) => i.id === scheduleItem.id
                  );
                  if (!item) return null;

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
                          <p className="font-medium">
                            {getItemValue(item, ColumnTitles.Customer_Name)}
                          </p>
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
        ))}
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
