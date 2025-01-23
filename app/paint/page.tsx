"use client";

import { useEffect, useState, useMemo } from "react";
import { format, addDays } from "date-fns";
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
import { useOrderStore } from "@/stores/useOrderStore";
import { Group } from "@/typings/types";
import { DAYS_OF_WEEK } from "@/typings/constants";

export default function PaintSchedulePage() {
  const [paintRequirements, setPaintRequirements] = useState<
    Record<string, PaintRequirement>
  >({});
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [filterDesign, setFilterDesign] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("overview");

  const isMobile = useIsMobile();
  const { items } = useOrderStore();

  const {
    weeklySchedules,
    currentWeekStart,
    hasDataInPreviousWeek,
    hasDataInNextWeek,
    changeWeek,
    resetToCurrentWeek,
    isCurrentWeek,
  } = useWeeklySchedule({ weekStartsOn: 0 });

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
    if (!items) return [];
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
        selectedDates={selectedDates}
        schedule={weeklySchedules[format(currentWeekStart, "yyyy-MM-dd")] || {}}
        toggleDateSelection={toggleDateSelection}
      />
    </div>
  );
}
