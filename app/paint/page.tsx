"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { useTheme } from "next-themes";

import { useRealmApp } from "@/hooks/useRealmApp";
import { useWeeklySchedule } from "@/components/weekly-schedule/UseWeeklySchedule";
import { useIsMobile } from "@/components/shared/UseIsMobile";
import { SchedulePageLayout } from "@/components/shared/SchedulePageLayout";
import { Filters } from "@/components/shared/Filters";
import {
  PaintRequirement,
  calculatePaintRequirements,
} from "@/components/paint/PaintCalculations";
import { OverviewTab } from "@/components/paint/OverviewTab";
import { DetailsTab } from "@/components/paint/DetailsTab";
import { useBoardOperations } from "@/components/orders/OrderHooks";
import { Board, ColumnTitles, Group, Item, ItemStatus } from "@/typings/types";
import { WeekView } from "@/components/shared/WeekView";
import { DAYS_OF_WEEK } from "@/typings/constants";

export default function PaintSchedulePage() {
  const { boardCollection: collection, isLoading } = useRealmApp();
  const [items, setItems] = useState<Item[]>([]);
  const [isItemsLoading, setIsItemsLoading] = useState(true);
  const [board, setBoard] = useState<Board | undefined>(undefined);
  const [paintRequirements, setPaintRequirements] = useState<
    Record<string, PaintRequirement>
  >({});
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [filterDesign, setFilterDesign] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const isMobile = useIsMobile();
  const [updateItem, setUpdateItem] =
    useState<
      (updatedItem: Item, changedField: ColumnTitles) => Promise<void>
    >();
  const {
    weeklySchedules,
    currentWeekStart,
    hasDataInPreviousWeek,
    hasDataInNextWeek,
    changeWeek,
    resetToCurrentWeek,
    isCurrentWeek,
  } = useWeeklySchedule({ weekStartsOn: 0 });
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<"week" | "calendar">("week");

  const loadItems = useCallback(async () => {
    console.log("loadItems called");
    if (!collection) {
      console.log("No collection available");
      return;
    }

    try {
      setIsItemsLoading(true);
      const loadedBoard = await collection.findOne({});
      console.log("Board loaded:", loadedBoard);

      if (!loadedBoard) {
        console.warn("No board found");
        return;
      }

      setBoard(loadedBoard);
      const loadedItems = loadedBoard.items_page.items || [];
      console.log("Items being loaded:", {
        count: loadedItems.length,
        sample: loadedItems[0],
        itemIds: loadedItems.map((item) => item.id).slice(0, 3),
      });
      setItems(loadedItems);
    } catch (err) {
      console.error("Failed to load board", err);
      toast.error("Failed to load board. Please refresh the page.");
      setBoard(undefined);
      setItems([]);
    } finally {
      setIsItemsLoading(false);
    }
  }, [collection]);

  const boardOperations = useBoardOperations(board!, collection, {});

  useEffect(() => {
    if (board && collection) {
      setUpdateItem(() => boardOperations.updateItem);
    } else {
      setUpdateItem(undefined);
    }
  }, [board, collection, boardOperations]);

  useEffect(() => {
    console.log("Effect triggered:", {
      isLoading,
      hasCollection: !!collection,
    });
    if (!isLoading && collection) {
      loadItems();
    }
  }, [isLoading, collection, loadItems]);

  useEffect(() => {
    console.log("Items state changed:", {
      count: items.length,
      sampleIds: items.slice(0, 3).map((item) => item.id),
    });
  }, [items]);

  const toggleDateSelection = (date: Date) => {
    setSelectedDates((prev) => {
      const dateString = format(date, "yyyy-MM-dd");
      if (prev.some((d) => format(d, "yyyy-MM-dd") === dateString)) {
        return prev.filter((d) => format(d, "yyyy-MM-dd") !== dateString);
      }
      return [...prev, date];
    });
  };

  const itemsNeedingPaint = useMemo(() => {
    const selectedDateStrings = selectedDates.map((date) =>
      format(date, "yyyy-MM-dd")
    );
    const weekKey = format(currentWeekStart, "yyyy-MM-dd");
    const currentWeekSchedule = weeklySchedules[weekKey] || {};

    const scheduledItems = new Set<string>();

    DAYS_OF_WEEK.forEach((dayName, index) => {
      const dayDate = format(addDays(currentWeekStart, index), "yyyy-MM-dd");
      if (
        selectedDateStrings.includes(dayDate) &&
        currentWeekSchedule[dayName]
      ) {
        currentWeekSchedule[dayName].forEach((item) =>
          scheduledItems.add(item.id)
        );
      }
    });

    return items.filter((item) => scheduledItems.has(item.id));
  }, [items, selectedDates, weeklySchedules, currentWeekStart]);

  const filteredItemsNeedingPaint = useMemo(() => {
    return itemsNeedingPaint.filter((item) => {
      const designValue =
        item.values.find((value) => value.columnName === "Design")?.text || "";
      const matchesDesign =
        filterDesign === "all" || designValue === filterDesign;
      const matchesSearch = item.values.some((value) =>
        String(value.text || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
      return matchesDesign && matchesSearch;
    });
  }, [itemsNeedingPaint, filterDesign, searchTerm]);

  const filteredPaintGroup: Group = useMemo(
    () => ({
      id: "paint-group",
      title: "Selected Items",
      items: filteredItemsNeedingPaint,
    }),
    [filteredItemsNeedingPaint]
  );

  useEffect(() => {
    const requirements = calculatePaintRequirements(filteredPaintGroup);
    setPaintRequirements(requirements);
    console.log("Updated paint requirements:", requirements);
  }, [filteredPaintGroup]);

  const filteredRequirements = Object.entries(paintRequirements);

  const totalPieces = filteredRequirements.reduce(
    (total, [_, colorRequirements]) => {
      return (
        total +
        Object.values(colorRequirements).reduce(
          (sum, pieces) => sum + pieces,
          0
        )
      );
    },
    0
  );

  const WeekViewSection = () => (
    <WeekView
      currentWeekStart={currentWeekStart}
      selectedDates={selectedDates}
      schedule={weeklySchedules[format(currentWeekStart, "yyyy-MM-dd")] || {}}
      toggleDateSelection={toggleDateSelection}
      isMobile={isMobile}
      weeklySchedule={weeklySchedules}
      items={items}
    />
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <SchedulePageLayout
        title="Paint Schedule"
        isMobile={isMobile}
        currentWeekStart={currentWeekStart}
        changeWeek={changeWeek}
        resetToCurrentWeek={resetToCurrentWeek}
        renderFilters={() => (
          <Filters
            filterValue={filterDesign}
            onFilterChange={setFilterDesign}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            filterOptions={Object.keys(paintRequirements)}
            isMobile={isMobile}
          />
        )}
        tabs={[
          {
            value: "overview",
            label: "Overview",
            content: (
              <OverviewTab
                isMobile={isMobile}
                totalPieces={totalPieces}
                filteredRequirements={filteredRequirements}
                selectedDates={selectedDates}
              />
            ),
          },
          {
            value: "details",
            label: "Details",
            content: (
              <DetailsTab
                isMobile={isMobile}
                filteredRequirements={filteredRequirements}
              />
            ),
          },
        ]}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasDataInPreviousWeek={hasDataInPreviousWeek()}
        hasDataInNextWeek={hasDataInNextWeek()}
        weekStartsOn={0}
        isCurrentWeek={isCurrentWeek()}
        group={filteredPaintGroup}
        board={board!}
        updateItem={updateItem!}
        selectedDates={selectedDates}
        schedule={weeklySchedules[format(currentWeekStart, "yyyy-MM-dd")] || {}}
        toggleDateSelection={toggleDateSelection}
      >
        {!isItemsLoading ? (
          items.length > 0 ? (
            <>
              {viewMode === "week" ? (
                <>{WeekViewSection()}</>
              ) : (
                <WeekView
                  currentWeekStart={currentWeekStart}
                  selectedDates={selectedDates}
                  schedule={
                    weeklySchedules[format(currentWeekStart, "yyyy-MM-dd")] ||
                    {}
                  }
                  toggleDateSelection={toggleDateSelection}
                  isMobile={isMobile}
                  weeklySchedule={weeklySchedules}
                  items={items}
                />
              )}
            </>
          ) : (
            <div className="flex items-center justify-center p-8">
              <div className="text-gray-500 dark:text-gray-400">
                No items found in schedule
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center p-8">
            <div className="text-gray-500 dark:text-gray-400">
              Loading schedule...
            </div>
          </div>
        )}
      </SchedulePageLayout>
    </div>
  );
}
