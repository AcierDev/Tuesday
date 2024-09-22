"use client"

import { useEffect, useState, useCallback, useMemo } from 'react';
import { format } from "date-fns";
import { toast } from 'sonner';

import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealmApp } from '@/hooks/useRealmApp';
import { Item } from '@/typings/types';
import { useWeeklySchedule } from "@/components/weekly-schedule/UseWeeklySchedule";
import { useIsMobile } from '@/components/shared/UseIsMobile';
import { Filters } from '@/components/shared/Filters';
import { WeekView } from '@/components/shared/WeekView';
import { SchedulePageLayout } from '@/components/shared/SchedulePageLayout';
import { DAYS_OF_WEEK } from '@/utils/constants';
import { cn } from '@/utils/functions';
import { OverviewTab } from '@/components/packaging/OverviewTab';
import { DetailsTab } from '@/components/packaging/DetailsTab';
import { BoxCalculations } from '@/components/packaging/BoxCalculations';

export default function BoxSchedulePage() {
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

  const [lockedBoxes, setLockedBoxes] = useState<Record<string, number>>({});
  const [lockedHardwareBags, setLockedHardwareBags] = useState<Record<string, number>>({});
  const [lockedMountingRails, setLockedMountingRails] = useState<Record<string, number>>({});

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
      toast.error("Failed to load box schedule. Please refresh the page.");
    }
  };

  const {
    boxRequirements,
    hardwareBagRequirements,
    mountingRailRequirements
  } = useMemo(() => BoxCalculations({
    schedule: weeklySchedules[format(currentWeekStart, 'yyyy-MM-dd')] || {},
    items,
    selectedDates,
    lockedBoxes,
    lockedHardwareBags,
    lockedMountingRails
  }), [weeklySchedules, currentWeekStart, items, selectedDates, lockedBoxes, lockedHardwareBags, lockedMountingRails]);

  const toggleDateSelection = (date: Date) => {
    setSelectedDates(prev => {
      const dateString = format(date, 'yyyy-MM-dd');
      if (prev.some(d => format(d, 'yyyy-MM-dd') === dateString)) {
        return prev.filter(d => format(d, 'yyyy-MM-dd') !== dateString);
      } else {
        return [...prev, date];
      }
    });
  };

  const handleItemClick = (itemType: 'box' | 'hardwareBag' | 'mountingRail', itemName: string, isLocked: boolean) => {
    const updateLockedItems = (prevLocked: Record<string, number>) => {
      const newLocked = { ...prevLocked };
      if (isLocked) {
        // Move from "Already Prepared" to "To Be Prepared"
        newLocked[itemName] = Math.max(0, (newLocked[itemName] || 0) - 1);
        if (newLocked[itemName] === 0) {
          delete newLocked[itemName];
        }
      } else {
        // Move from "To Be Prepared" to "Already Prepared"
        newLocked[itemName] = (newLocked[itemName] || 0) + 1;
      }
      return newLocked;
    };

    switch (itemType) {
      case 'box':
        setLockedBoxes(updateLockedItems);
        break;
      case 'hardwareBag':
        setLockedHardwareBags(updateLockedItems);
        break;
      case 'mountingRail':
        setLockedMountingRails(updateLockedItems);
        break;
    }
  };

  const renderItemBox = (itemType: 'box' | 'hardwareBag' | 'mountingRail', itemName: string, count: number, isLocked: boolean) => {
    const backgroundColor = itemType === 'box' ? (itemName === "Custom" ? "black" : itemName.toLowerCase().split(" ").at(0)) : 'gray';
    return (
      <div 
        key={`${itemType}-${itemName}-${isLocked}`} 
        className={cn(
          "bg-gray-100 p-4 rounded-lg cursor-pointer transition-all duration-200",
          isLocked ? "bg-blue-100 hover:bg-blue-200" : "hover:bg-gray-200"
        )}
        onClick={() => handleItemClick(itemType, itemName, isLocked)}
      >
        <div 
          className={cn(
            "rounded-md flex items-center justify-center text-white font-semibold mb-2",
            isMobile ? "w-8 h-8 text-sm" : "w-16 h-16 text-lg"
          )}
          style={{ backgroundColor }}
        >
          <span>{count}</span>
        </div>
        <h4 className={cn("font-semibold mb-2", isMobile ? "text-xs" : "text-sm")}>{itemName}</h4>
        <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
          {isLocked ? "prepared" : "to prepare"}
        </p>
      </div>
    );
  };

  const renderFilters = () => (
    <Filters
      filterValue={filterSize}
      onFilterChange={setFilterSize}
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
      filterOptions={Object.keys(boxRequirements)}
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

  const filteredRequirements = useMemo(() => {
    return Object.entries(boxRequirements).filter(([size, count]) => {
      const matchesFilter = filterSize === 'all' || size === filterSize;
      const matchesSearch = size.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch && count > 0;
    });
  }, [boxRequirements, filterSize, searchTerm]);

  const totalBoxes = useMemo(() => {
    return filteredRequirements.reduce((total, [_, count]) => total + count, 0);
  }, [filteredRequirements]);

  const uniqueBoxSizes = useMemo(() => {
    return filteredRequirements.length;
  }, [filteredRequirements]);

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
            totalBoxes={totalBoxes}
            uniqueBoxSizes={uniqueBoxSizes}
            selectedDates={selectedDates}
            lockedBoxes={lockedBoxes}
            boxRequirements={boxRequirements}
            lockedHardwareBags={lockedHardwareBags}
            hardwareBagRequirements={hardwareBagRequirements}
            lockedMountingRails={lockedMountingRails}
            mountingRailRequirements={mountingRailRequirements}
            renderItemBox={renderItemBox}
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

  return (
    <SchedulePageLayout
      title="Box Schedule"
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
