"use client";

import { useState, useMemo } from "react";
import { format, addDays } from "date-fns";

import { useWeeklySchedule } from "@/components/weekly-schedule/UseWeeklySchedule";
import { useIsMobile } from "@/components/shared/UseIsMobile";
import { SchedulePageLayout } from "@/components/shared/SchedulePageLayout";
import { Filters } from "@/components/shared/Filters";
import { OverviewTab } from "@/components/backboards/OverviewTab";
import { DetailsTab } from "@/components/backboards/DetailsTab";
import { BackboardCalculations } from "@/components/backboards/BackboardCalculations";
import { backboardData, DAYS_OF_WEEK } from "@/typings/constants";
import {
  BackboardRequirement,
  DayName,
  Group,
  ItemSizes,
} from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";

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
  const { board } = useOrderStore();

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
        currentWeekSchedule[dayName as DayName]
      ) {
        currentWeekSchedule[dayName as DayName].forEach((item) =>
          scheduledItems.add(item.id)
        );
      }
    });

    return board?.items_page.items.filter((item) =>
      scheduledItems.has(item.id)
    );
  }, [board, selectedDates, weeklySchedules, currentWeekStart]);

  const filteredItemsNeedingBackboards = useMemo(() => {
    return itemsNeedingBackboards?.filter((item) => {
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
      title: "Selected Items",
      items: filteredItemsNeedingBackboards || [],
    }),
    [filteredItemsNeedingBackboards]
  );

  const backboardRequirements: BackboardRequirement = useMemo(
    () =>
      BackboardCalculations({
        schedule: weeklySchedules[format(currentWeekStart, "yyyy-MM-dd")] || {},
        items: itemsNeedingBackboards || [],
        selectedDates,
      }),
    [weeklySchedules, currentWeekStart, itemsNeedingBackboards, selectedDates]
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
      return total + backboardData[size as ItemSizes].panels * count;
    }, 0);
  }, [filteredRequirements]);

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
                selectedItems={filteredItemsNeedingBackboards || []}
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
        selectedDates={selectedDates}
        schedule={weeklySchedules[format(currentWeekStart, "yyyy-MM-dd")] || {}}
        toggleDateSelection={toggleDateSelection}
      />
    </div>
  );
}
