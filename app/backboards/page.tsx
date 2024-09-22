"use client"

import { useEffect, useState, useMemo } from 'react';
import { addWeeks, format, isSameWeek, startOfWeek, subWeeks, addDays } from "date-fns";
import { toast } from 'sonner';

import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useRealmApp } from '@/hooks/useRealmApp';
import { useWeeklySchedule } from "@/components/weekly-schedule/UseWeeklySchedule";
import { useIsMobile } from '@/components/shared/UseIsMobile';
import { Filters } from '@/components/shared/Filters';
import { WeekView } from '@/components/shared/WeekView';
import { SchedulePageLayout } from '@/components/shared/SchedulePageLayout';
import { DAYS_OF_WEEK, backboardData } from '@/utils/constants';
import { cn } from '@/utils/functions';
import { BackboardRequirement, ColumnTitles, Item, ItemSizes } from '@/typings/types';
import { OverviewTab } from '@/components/backboards/OverviewTab';
import { DetailsTab } from '@/components/backboards/DetailsTab';
import { BackboardCalculations } from '@/components/backboards/BackboardCalculations';

export default function BackboardCuttingGuidePage() {
  const { collection } = useRealmApp();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [filterSize, setFilterSize] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const isMobile = useIsMobile();

  const {
    weeklySchedules,
    currentWeekStart,
    hasDataInPreviousWeek,
    hasDataInNextWeek,
    changeWeek,
    resetToCurrentWeek,
    isCurrentWeek
  } = useWeeklySchedule({ weekStartsOn: 0 });

  useEffect(() => {
    loadScheduleAndItems();
  }, []);

  const loadScheduleAndItems = async () => {
    if (!collection) return;

    try {
      const board = await collection.findOne({});
      if (board) {
        setItems(board.items_page.items || []);
        // Assuming useWeeklySchedule manages weeklySchedules
      }
    } catch (err) {
      console.error("Failed to load schedule and items", err);
      toast.error("Failed to load backboard cutting guide. Please refresh the page.");
    }
  };

  const backboardRequirements: BackboardRequirement = useMemo(() => BackboardCalculations({
    schedule: weeklySchedules[format(currentWeekStart, 'yyyy-MM-dd')] || {},
    items,
    selectedDates
  }), [weeklySchedules, currentWeekStart, items, selectedDates]);

  const filteredRequirements = useMemo(() => {
    return Object.entries(backboardRequirements).filter(([size, _]) => {
      const matchesSize = filterSize === 'all' || size === filterSize;
      const matchesSearch = size.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSize && matchesSearch;
    });
  }, [backboardRequirements, filterSize, searchTerm]);

  const totalPanels = useMemo(() => {
    return filteredRequirements.reduce((total, [size, count]) => {
      return total + (backboardData[size as ItemSizes].panels * count);
    }, 0);
  }, [filteredRequirements]);

  const renderFilters = () => (
    <Filters
      filterValue={filterSize}
      onFilterChange={setFilterSize}
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
      filterOptions={Object.keys(backboardRequirements)}
      isMobile={isMobile}
    />
  );

  const toggleDateSelection = (date: Date) => {
    setSelectedDates(prev => {
      const dateString = format(date, 'yyyy-MM-dd');
      if (prev.some(d => format(d, 'yyyy-MM-dd') === dateString)) {
        return prev.filter(d => format(d, 'yyyy-MM-dd') !== dateString);
      } 
      return [...prev, date];
    });
  };

  const selectedItems = useMemo(() => {
    const itemSet = new Set<Item>();
    const currentWeekKey = format(currentWeekStart, 'yyyy-MM-dd');
    selectedDates.forEach(date => {
      const selectedDay = DAYS_OF_WEEK[date.getDay()];
      const daySchedule = weeklySchedules[currentWeekKey]?.[selectedDay] || [];
      const dayItems = daySchedule
        .map(id => items.find(item => item.id === id))
        .filter(Boolean) as Item[];
      dayItems.forEach(item => itemSet.add(item));
    });
    return Array.from(itemSet);
  }, [weeklySchedules, items, selectedDates, currentWeekStart]);

  const renderTabs = () => (
    <Card className="flex-grow mt-4 overflow-hidden">
      <Tabs className="h-full flex flex-col" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={cn(
          "w-full justify-start pt-2 bg-transparent border-b",
          isMobile ? "px-2" : "px-6"
        )}>
          <TabsTrigger 
            value="overview" 
            className={cn(
              "data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:border-b-2 rounded-none",
              isMobile ? "flex-1" : ""
            )}
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="details" 
            className={cn(
              "data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:border-b-2 rounded-none",
              isMobile ? "flex-1" : ""
            )}
          >
            Details
          </TabsTrigger>
        </TabsList>
        <TabsContent className="flex-grow overflow-auto" value="overview">
          <OverviewTab
            isMobile={isMobile}
            totalPanels={totalPanels}
            filteredRequirements={filteredRequirements}
            selectedDates={selectedDates}
          />
        </TabsContent>
        <TabsContent className="flex-grow overflow-hidden" value="details">
          <DetailsTab
            isMobile={isMobile}
            filteredRequirements={filteredRequirements}
            selectedItems={selectedItems}
          />
        </TabsContent>
      </Tabs>
    </Card>
  );

  const renderWeekView = () => (
    <WeekView
      currentWeekStart={currentWeekStart}
      selectedDates={selectedDates}
      schedule={weeklySchedules[format(currentWeekStart, 'yyyy-MM-dd')] || {}}
      toggleDateSelection={toggleDateSelection}
      isMobile={isMobile}
    />
  );

  return (
    <SchedulePageLayout
      title="Backboard Cutting Guide"
      isMobile={isMobile}
      currentWeekStart={currentWeekStart}
      changeWeek={changeWeek}
      resetToCurrentWeek={resetToCurrentWeek}
      renderFilters={renderFilters}
      renderWeekView={renderWeekView}
      renderTabs={renderTabs}
      hasDataInPreviousWeek={hasDataInPreviousWeek()}
      hasDataInNextWeek={hasDataInNextWeek()}
      weekStartsOn={0}
      isCurrentWeek={isCurrentWeek()}
    />
  );
}
