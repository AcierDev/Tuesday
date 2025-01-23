"use client";

import { useEffect, useState, useMemo } from "react";
import { format, addDays } from "date-fns";

import { useWeeklySchedule } from "@/components/weekly-schedule/UseWeeklySchedule";
import { useIsMobile } from "@/components/shared/UseIsMobile";
import { SchedulePageLayout } from "@/components/shared/SchedulePageLayout";
import { Filters } from "@/components/shared/Filters";
import { OverviewTab } from "@/components/packaging/OverviewTab";
import { DetailsTab } from "@/components/packaging/DetailsTab";
import { calculateBoxRequirements } from "@/components/packaging/BoxCalculations";
import { DayName, Group } from "@/typings/types";
import { BoxRequirement } from "@/typings/interfaces";
import { DAYS_OF_WEEK } from "@/typings/constants";
import { useOrderStore } from "@/stores/useOrderStore";

export default function BoxSchedulePage() {
  const { items } = useOrderStore();
  const [boxRequirements, setBoxRequirements] = useState<
    Record<string, BoxRequirement>
  >({});
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

  const toggleDateSelection = (date: Date) => {
    setSelectedDates((prev) => {
      const dateString = format(date, "yyyy-MM-dd");
      if (prev.some((d) => format(d, "yyyy-MM-dd") === dateString)) {
        return prev.filter((d) => format(d, "yyyy-MM-dd") !== dateString);
      }
      return [...prev, date];
    });
  };

  const itemsNeedingBoxes = useMemo(() => {
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

    return items?.filter((item) => scheduledItems.has(item.id));
  }, [items, selectedDates, weeklySchedules, currentWeekStart]);

  const filteredItemsNeedingBoxes = useMemo(() => {
    return itemsNeedingBoxes?.filter((item) => {
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
  }, [itemsNeedingBoxes, filterSize, searchTerm]);

  const filteredBoxGroup: Group = useMemo(
    () => ({
      id: "box-group",
      title: "Selected Items",
      items: filteredItemsNeedingBoxes || [],
    }),
    [filteredItemsNeedingBoxes]
  );

  useEffect(() => {
    const requirements = calculateBoxRequirements(filteredBoxGroup);
    setBoxRequirements(requirements);
  }, [filteredBoxGroup]);

  const filteredRequirements = Object.entries(boxRequirements);

  const totalBoxes = useMemo(() => {
    return filteredRequirements.reduce((total, [_, requirement]) => {
      return total + requirement.count!;
    }, 0);
  }, [filteredRequirements]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <SchedulePageLayout
        title="Box Schedule"
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
            filterOptions={Object.keys(boxRequirements)}
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
                totalBoxes={totalBoxes}
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
        group={filteredBoxGroup}
        selectedDates={selectedDates}
        schedule={weeklySchedules[format(currentWeekStart, "yyyy-MM-dd")] || {}}
        toggleDateSelection={toggleDateSelection}
      />
    </div>
  );
}
