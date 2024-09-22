"use client"

import { useEffect, useState, useCallback } from 'react';
import { addWeeks, format, isSameWeek, startOfWeek, subWeeks } from "date-fns";
import { toast } from 'sonner';

import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealmApp } from '@/hooks/useRealmApp';
import { Item } from '@/typings/types';
import { useWeeklySchedule } from "@/components/weekly-schedule/UseWeeklySchedule";
import { useIsMobile } from '@/components/shared/UseIsMobile';
import { SchedulePageLayout } from '@/components/shared/SchedulePageLayout';
import { WeekView } from '@/components/shared/WeekView';
import { Filters } from '@/components/shared/Filters';
import { cn } from '@/utils/functions';
import { PaintRequirement, calculatePaintRequirements } from '@/components/paint/PaintCalculations';
import { OverviewTab } from '@/components/paint/OverviewTab';
import { DetailsTab } from '@/components/paint/DetailsTab';

export default function PaintSchedulePage() {
  const { collection } = useRealmApp();
  const [items, setItems] = useState<Item[]>([]);
  const [paintRequirements, setPaintRequirements] = useState<Record<string, PaintRequirement>>({});
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [filterDesign, setFilterDesign] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const isMobile = useIsMobile();
  const { weeklySchedules, currentWeekStart, hasDataInPreviousWeek, hasDataInNextWeek, changeWeek, resetToCurrentWeek, isCurrentWeek } = useWeeklySchedule({ weekStartsOn: 0 });

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    const requirements = calculatePaintRequirements(weeklySchedules, items, currentWeekStart);
    setPaintRequirements(requirements);
  }, [weeklySchedules, items, currentWeekStart]);

  const loadItems = async () => {
    if (!collection) return;

    try {
      const board = await collection.findOne({});
      if (board) {
        setItems(board.items_page.items || []);
      }
    } catch (err) {
      console.error("Failed to load items", err);
      toast.error("Failed to load paint schedule items. Please refresh the page.");
    }
  };

  const toggleDateSelection = (date: Date) => {
    setSelectedDates(prev => {
      const dateString = format(date, 'yyyy-MM-dd');
      if (prev.some(d => format(d, 'yyyy-MM-dd') === dateString)) {
        return prev.filter(d => format(d, 'yyyy-MM-dd') !== dateString);
      } 
      return [...prev, date];
    });
  };

  const renderFilters = () => (
    <Filters
      filterValue={filterDesign}
      onFilterChange={setFilterDesign}
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
      filterOptions={Object.keys(paintRequirements)}
      isMobile={isMobile}
    />
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

  const filteredRequirements = Object.entries(paintRequirements).filter(([design, _]) => {
    const matchesDesign = filterDesign === 'all' || design === filterDesign
    const matchesSearch = design.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesDesign && matchesSearch
  })

  const totalPieces = filteredRequirements.reduce((total, [_, colorRequirements]) => {
    return total + Object.values(colorRequirements).reduce((sum, pieces) => sum + pieces, 0)
  }, 0)

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
            totalPieces={totalPieces}
            filteredRequirements={filteredRequirements}
            selectedDates={selectedDates}
          />
        </TabsContent>
        <TabsContent className="flex-grow overflow-hidden" value="details">
          <DetailsTab
            isMobile={isMobile}
            filteredRequirements={filteredRequirements}
          />
        </TabsContent>
      </Tabs>
    </Card>
  );

  return (
    <SchedulePageLayout
      title="Paint Schedule"
      isMobile={isMobile}
      currentWeekStart={currentWeekStart}
      changeWeek={changeWeek}
      renderFilters={renderFilters}
      renderWeekView={renderWeekView}
      renderTabs={renderTabs}
      hasDataInPreviousWeek={hasDataInPreviousWeek()}
      resetToCurrentWeek={resetToCurrentWeek}
      hasDataInNextWeek={hasDataInNextWeek()}
      weekStartsOn={0}
      isCurrentWeek={isCurrentWeek()}
    />
  );
}