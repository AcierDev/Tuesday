"use client"

import { useEffect, useState, useCallback, useMemo } from 'react';
import { format, addDays } from "date-fns";
import { toast } from 'sonner';

import { useRealmApp } from '@/hooks/useRealmApp';
import { Item, Group, Board, ColumnTitles, ItemStatus, BackboardRequirement, ItemSizes } from '@/typings/types';
import { useWeeklySchedule } from "@/components/weekly-schedule/UseWeeklySchedule";
import { useIsMobile } from '@/components/shared/UseIsMobile';
import { SchedulePageLayout } from '@/components/shared/SchedulePageLayout';
import { WeekView } from '@/components/shared/WeekView';
import { Filters } from '@/components/shared/Filters';
import { OverviewTab } from '@/components/backboards/OverviewTab';
import { DetailsTab } from '@/components/backboards/DetailsTab';
import { useBoardOperations } from '@/components/orders/OrderHooks';
import { BackboardCalculations } from '@/components/backboards/BackboardCalculations';
import { backboardData } from '@/utils/constants';

export default function BackboardSchedulePage() {
  const { collection, isLoading } = useRealmApp()
  const [items, setItems] = useState<Item[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [filterSize, setFilterSize] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const isMobile = useIsMobile();
  const { weeklySchedules, currentWeekStart, hasDataInPreviousWeek, hasDataInNextWeek, changeWeek, resetToCurrentWeek, isCurrentWeek } = useWeeklySchedule({ weekStartsOn: 0 });
  const {updateItem} = useBoardOperations(board, collection, {})

  const loadItems = useCallback(async () => {
    if (!collection) return

    try {
      const loadedBoard = await collection.findOne({})
      setBoard(loadedBoard)
      setItems(loadedBoard?.items_page.items || [])
      console.log("Board loaded:", loadedBoard)
    } catch (err) {
      console.error("Failed to load board", err)
      toast.error("Failed to load board. Please refresh the page.", {
        style: { background: "#EF4444", color: "white" },
      })
    }
  }, [collection, setBoard, setItems])

  useEffect(() => {
    if (!isLoading && collection) {
      loadItems()
    }
  }, [isLoading, collection, loadItems])

  const toggleDateSelection = (date: Date) => {
    setSelectedDates(prev => {
      const dateString = format(date, 'yyyy-MM-dd');
      if (prev.some(d => format(d, 'yyyy-MM-dd') === dateString)) {
        return prev.filter(d => format(d, 'yyyy-MM-dd') !== dateString);
      } 
      return [...prev, date];
    });
  };

  const renderWeekView = () => (
    <WeekView
      currentWeekStart={currentWeekStart}
      selectedDates={selectedDates}
      schedule={weeklySchedules[format(currentWeekStart, 'yyyy-MM-dd')] || {}}
      toggleDateSelection={toggleDateSelection}
      isMobile={isMobile}
    />
  );  

  const itemsNeedingBackboards = useMemo(() => {
    const selectedDateStrings = selectedDates.map(date => format(date, 'yyyy-MM-dd'));
    const weekKey = format(currentWeekStart, 'yyyy-MM-dd');
    const currentWeekSchedule = weeklySchedules[weekKey] || {};

    const scheduledItems = new Set<string>();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    dayNames.forEach((dayName, index) => {
      const dayDate = format(addDays(currentWeekStart, index), 'yyyy-MM-dd');
      if (selectedDateStrings.includes(dayDate) && currentWeekSchedule[dayName]) {
        currentWeekSchedule[dayName].forEach(id => scheduledItems.add(id));
      }
    });

    return items.filter(item => {
      if (!scheduledItems.has(item.id)) return false;
      const backboardValue = item.values.find(value => value.columnName === ColumnTitles.Backboard);
      return backboardValue?.text !== 'Done';
    })
  }, [items, selectedDates, weeklySchedules, currentWeekStart]);

  const filteredItemsNeedingBackboards = useMemo(() => {
    return itemsNeedingBackboards.filter(item => {
      const sizeValue = item.values.find(value => value.columnName === 'Size')?.text || '';
      const matchesSize = filterSize === 'all' || sizeValue === filterSize;
      const matchesSearch = item.values.some(value => 
        String(value.text || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
      return matchesSize && matchesSearch;
    });
  }, [itemsNeedingBackboards, filterSize, searchTerm]);

  const filteredBackboardGroup: Group = useMemo(() => ({
    id: 'backboard-group',
    title: 'Paint',
    items: filteredItemsNeedingBackboards,
  }), [filteredItemsNeedingBackboards]);

  const backboardRequirements: BackboardRequirement = useMemo(() => BackboardCalculations({
    schedule: weeklySchedules[format(currentWeekStart, 'yyyy-MM-dd')] || {},
    items,
    selectedDates
  }), [weeklySchedules, currentWeekStart, items, selectedDates]);

  // console.log('backboardRequirements', backboardRequirements)

  const filteredRequirements = Object.entries(backboardRequirements).filter(([size, count]) => {
    const matchesSize = filterSize === 'all' || size === filterSize;
    const matchesSearch = size.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSize && matchesSearch && count > 0;
  }) as [ItemSizes, number][];

  const totalPanels = useMemo(() => {
    return filteredRequirements.reduce((total, [size, count]) => {
      return total + (backboardData[size as ItemSizes].panels * count);
    }, 0);
  }, [filteredRequirements]);

  // console.log('filtered requirements', filteredRequirements)

  return (
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
      renderWeekView={renderWeekView}
      tabs={[
        {
          value: 'overview',
          label: 'Overview',
          content: (
            <OverviewTab
              isMobile={isMobile}
              totalPanels={totalPanels}
              filteredRequirements={filteredRequirements}
              selectedDates={selectedDates}
            />
          )
        },
        {
          value: 'details',
          label: 'Details',
          content: (
            <DetailsTab
              isMobile={isMobile}
              filteredRequirements={filteredRequirements}
              selectedItems={filteredItemsNeedingBackboards}
            />
          )
        }
      ]}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      hasDataInPreviousWeek={hasDataInPreviousWeek()}
      hasDataInNextWeek={hasDataInNextWeek()}
      weekStartsOn={0}
      isCurrentWeek={isCurrentWeek()}
      group={filteredBackboardGroup}
      board={board}
    />
  );
}