"use client";

import { useState, useMemo } from "react";
import { format, addDays } from "date-fns";
import { Loader2 } from "lucide-react";

import { useWeeklySchedule } from "@/components/weekly-schedule/UseWeeklySchedule";
import { useIsMobile } from "@/components/shared/UseIsMobile";
import { SchedulePageLayout } from "@/components/shared/SchedulePageLayout";
import { Filters } from "@/components/shared/Filters";
import { OverviewTab } from "@/components/backboards/OverviewTab";
import { DetailsTab } from "@/components/backboards/DetailsTab";
import { useBoardOperations } from "@/hooks/useBoardOperations";
import { BackboardCalculations } from "@/components/backboards/BackboardCalculations";
import { backboardData } from "@/utils/constants";
import { BackboardRequirement, Group, ItemSizes } from "@/typings/types";

export default function BackboardSchedulePage() {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [filterSize, setFilterSize] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const isMobile = useIsMobile();

  const {
    weeklySchedules,
    currentWeekStart,
    hasDataInPreviousWeek,
    hasDataInNextWeek,
    changeWeek,
    resetToCurrentWeek,
    isCurrentWeek,
  } = useWeeklySchedule({ weekStartsOn: 0 });

  const { board, isLoading, isError } = useBoardOperations(null);

  const toggleDateSelection = (date: Date) => {
    setSelectedDates((prev) => {
      const dateString = format(date, "yyyy-MM-dd");
      if (prev.some((d) => format(d, "yyyy-MM-dd") === dateString)) {
        return prev.filter((d) => format(d, "yyyy-MM-dd") !== dateString);
      }
      return [...prev, date];
    });
  };

  const itemsNeedingBackboards = useMemo(() => {
    if (!board) return [];

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

    return board.items_page.items.filter((item) => scheduledItems.has(item.id));
  }, [board, selectedDates, weeklySchedules, currentWeekStart]);

  const filteredItemsNeedingBackboards = useMemo(() => {
    if (!itemsNeedingBackboards) return [];

    return itemsNeedingBackboards.filter((item) => {
      const sizeValue =
        item.values.find((value) => value.columnName === "Size")?.text || "";
      const matchesSize = filterSize === "all" || sizeValue === filterSize;
      const matchesSearch = item.values.some((value) =>
        String(value.text || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
      return matchesSize && matchesSearch;
    });
  }, [itemsNeedingBackboards, filterSize, searchTerm]);

  const filteredBackboardGroup: Group = useMemo(
    () => ({
      id: "backboard-group",
      title: "Paint",
      items: filteredItemsNeedingBackboards || [],
    }),
    [filteredItemsNeedingBackboards]
  );

  const backboardRequirements: BackboardRequirement = useMemo(
    () =>
      board
        ? BackboardCalculations({
            schedule:
              weeklySchedules[format(currentWeekStart, "yyyy-MM-dd")] || {},
            items: board.items_page.items,
            selectedDates,
          })
        : {},
    [weeklySchedules, currentWeekStart, board, selectedDates]
  );

  const filteredRequirements = Object.entries(backboardRequirements).filter(
    ([size, count]) => {
      const matchesSize = filterSize === "all" || size === filterSize;
      const matchesSearch = size
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesSize && matchesSearch && count > 0;
    }
  ) as [ItemSizes, number][];

  const totalPanels = useMemo(() => {
    return filteredRequirements.reduce((total, [size, count]) => {
      return total + (backboardData[size as ItemSizes]?.panels || 0) * count;
    }, 0);
  }, [filteredRequirements]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Loading board data...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center text-red-500">
          <h2 className="text-xl font-semibold mb-2">Failed to load board</h2>
          <p>Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <h2 className="text-xl font-semibold mb-2">
            No board data available
          </h2>
          <p>Please check your connection and try again</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <SchedulePageLayout
        title="Backboard Schedule"
        isMobile={isMobile}
        currentWeekStart={currentWeekStart}
        changeWeek={changeWeek}
        resetToCurrentWeek={resetToCurrentWeek}
        renderFilters={() => (
          <Filters
            filterValue={filterSize}
            onFilterChange={setFilterSize}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            filterOptions={Object.keys(backboardRequirements)}
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
                totalPanels={totalPanels}
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
                selectedItems={filteredItemsNeedingBackboards}
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
        group={filteredBackboardGroup}
        board={board}
        selectedDates={selectedDates}
        schedule={weeklySchedules[format(currentWeekStart, "yyyy-MM-dd")] || {}}
        toggleDateSelection={toggleDateSelection}
      />
    </div>
  );
}
