"use client";

import { useEffect, useState, useMemo } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { useIsMobile } from "@/components/shared/UseIsMobile";
import { SchedulePageLayout } from "@/components/shared/SchedulePageLayout";
import { Filters } from "@/components/shared/Filters";
import { OverviewTab } from "@/components/paint/OverviewTab";
import { DetailsTab } from "@/components/paint/DetailsTab";
import { useOrderStore } from "@/stores/useOrderStore";
import { useWeeklyScheduleStore } from "@/stores/useWeeklyScheduleStore";
import { Group } from "@/typings/types";
import { DAYS_OF_WEEK } from "@/typings/constants";
import { ItemUtil } from "@/utils/ItemUtil";

// Define the PaintRequirement interface
interface PaintRequirement {
  [color: string]: number;
}

export default function PaintSchedulePage() {
  const [paintRequirements, setPaintRequirements] = useState<
    Record<string, PaintRequirement>
  >({});
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [filterDesign, setFilterDesign] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );

  const isMobile = useIsMobile();
  const { items } = useOrderStore();
  const { schedules } = useWeeklyScheduleStore();

  const changeWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeekStart);
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentWeekStart(newDate);
  };

  const resetToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  const isCurrentWeek = () => {
    const today = new Date();
    const currentWeekStartDate = startOfWeek(today, { weekStartsOn: 0 });
    return (
      format(currentWeekStart, "yyyy-MM-dd") ===
      format(currentWeekStartDate, "yyyy-MM-dd")
    );
  };

  const hasDataInPreviousWeek = () => {
    // Check if there's data in the previous week
    const prevDate = new Date(currentWeekStart);
    prevDate.setDate(prevDate.getDate() - 7);
    const prevWeekKey = format(prevDate, "yyyy-MM-dd");
    return !!schedules.find((s) => s.weekKey === prevWeekKey);
  };

  const hasDataInNextWeek = () => {
    // Check if there's data in the next week
    const nextDate = new Date(currentWeekStart);
    nextDate.setDate(nextDate.getDate() + 7);
    const nextWeekKey = format(nextDate, "yyyy-MM-dd");
    return !!schedules.find((s) => s.weekKey === nextWeekKey);
  };

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
    const currentWeekSchedule =
      schedules.find((s) => s.weekKey === weekKey)?.schedule || {};

    const scheduledItems = new Set<string>();

    DAYS_OF_WEEK.forEach((dayName, index) => {
      const dayDate = format(addDays(currentWeekStart, index), "yyyy-MM-dd");
      if (
        selectedDateStrings.includes(dayDate) &&
        currentWeekSchedule[dayName]
      ) {
        currentWeekSchedule[dayName].forEach((item: { id: string }) =>
          scheduledItems.add(item.id)
        );
      }
    });

    return items.filter((item) => scheduledItems.has(item.id));
  }, [items, selectedDates, schedules, currentWeekStart]);

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
    if (!filteredPaintGroup || !filteredPaintGroup.items) return;
    const requirements = ItemUtil.getTotalPaintRequirements(filteredPaintGroup);
    setPaintRequirements(requirements);
  }, [filteredPaintGroup]);

  const filteredRequirements = Object.entries(paintRequirements);

  const totalPieces = useMemo(() => {
    return filteredRequirements.reduce((total, [_, colorRequirements]) => {
      return (
        total +
        Object.values(colorRequirements as Record<string, number>).reduce(
          (sum, pieces) => sum + pieces,
          0
        )
      );
    }, 0);
  }, [filteredRequirements]);

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
        schedule={
          schedules.find(
            (s) => s.weekKey === format(currentWeekStart, "yyyy-MM-dd")
          )?.schedule || {}
        }
        toggleDateSelection={toggleDateSelection}
      />
    </div>
  );
}
