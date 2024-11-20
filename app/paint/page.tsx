"use client";

import { useState, useMemo } from "react";
import { format, addDays } from "date-fns";
import { Loader2 } from "lucide-react";

import { useWeeklySchedule } from "@/components/weekly-schedule/UseWeeklySchedule";
import { useIsMobile } from "@/components/shared/UseIsMobile";
import { SchedulePageLayout } from "@/components/shared/SchedulePageLayout";
import { Filters } from "@/components/shared/Filters";
import { OverviewTab } from "@/components/paint/OverviewTab";
import { DetailsTab } from "@/components/paint/DetailsTab";
import { useBoardOperations } from "@/hooks/useBoardOperations";
import { calculatePaintRequirements } from "@/components/paint/PaintCalculations";
import { Group } from "@/typings/types";

export default function PaintSchedulePage() {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [filterDesign, setFilterDesign] = useState<string>("all");
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

  const { board, isLoading, isError, updateItem } = useBoardOperations(null);

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

  const filteredItemsNeedingPaint = useMemo(() => {
    if (!itemsNeedingPaint) return [];

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
      title: "Paint",
      items: filteredItemsNeedingPaint || [],
    }),
    [filteredItemsNeedingPaint]
  );

  const paintRequirements = useMemo(() => {
    if (!filteredPaintGroup.items.length) return {};
    return calculatePaintRequirements(filteredPaintGroup);
  }, [filteredPaintGroup]);

  const filteredRequirements = Object.entries(paintRequirements).filter(
    ([design, requirements]) => {
      const matchesDesign = filterDesign === "all" || design === filterDesign;
      const matchesSearch = design
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const hasRequirements = Object.values(requirements).some(
        (count) => count > 0
      );
      return matchesDesign && matchesSearch && hasRequirements;
    }
  );

  const totalPieces = useMemo(() => {
    return filteredRequirements.reduce((total, [_, colorRequirements]) => {
      return (
        total +
        Object.values(colorRequirements).reduce(
          (sum, pieces) => sum + pieces,
          0
        )
      );
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
        board={board}
        updateItem={updateItem}
        selectedDates={selectedDates}
        schedule={weeklySchedules[format(currentWeekStart, "yyyy-MM-dd")] || {}}
        toggleDateSelection={toggleDateSelection}
      />
    </div>
  );
}
