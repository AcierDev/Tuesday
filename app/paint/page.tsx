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

export default function PaintSchedulePage() {
  const { boardCollection: collection, isLoading } = useRealmApp();
  const [items, setItems] = useState<Item[]>([]);
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

  const loadItems = useCallback(async () => {
    if (!collection) return;

    try {
      const loadedBoard = await collection.findOne({});
      setBoard(loadedBoard || undefined);
      setItems(loadedBoard?.items_page.items || []);
      console.log("Board loaded:", loadedBoard);
    } catch (err) {
      console.error("Failed to load board", err);
      toast.error("Failed to load board. Please refresh the page.", {
        style: {
          background: theme === "dark" ? "#EF4444" : "#FEE2E2",
          color: theme === "dark" ? "white" : "#991B1B",
        },
      });
      setBoard(undefined);
      setItems([]);
    }
  }, [collection, theme]);

  const boardOperations = useBoardOperations(board!, collection, {});

  useEffect(() => {
    if (board && collection) {
      setUpdateItem(() => boardOperations.updateItem);
    } else {
      setUpdateItem(undefined);
    }
  }, [board, collection, boardOperations]);

  useEffect(() => {
    if (!isLoading && collection) {
      loadItems();
    }
  }, [isLoading, collection, loadItems]);

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
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    dayNames.forEach((dayName, index) => {
      const dayDate = format(addDays(currentWeekStart, index), "yyyy-MM-dd");
      if (
        selectedDateStrings.includes(dayDate) &&
        currentWeekSchedule[dayName]
      ) {
        currentWeekSchedule[dayName].forEach((id) => scheduledItems.add(id));
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
      />
    </div>
  );
}
