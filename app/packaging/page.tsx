"use client"

import { useState, useEffect, useMemo } from 'react';
import { addWeeks, format, startOfWeek, subWeeks } from "date-fns";
import { toast } from 'sonner';

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealmApp } from '@/hooks/useRealmApp';
import { ColumnTitles, Item, ItemSizes } from '../../typings/types';
import { WeekSelector } from '@/components/weekly-schedule/WeekSelector';
import { BoxRequirement, DaySchedule, HardwareBagRequirement, MountingRailRequirement } from '@/typings/interfaces';
import { useIsMobile } from '@/components/shared/UseIsMobile';
import { Filters } from '@/components/shared/Filters';
import { WeekView } from '@/components/shared/WeekView';
import { SchedulePageLayout } from '@/components/shared/SchedulePageLayout';
import { BOX_COLORS, DAYS_OF_WEEK } from '@/utils/constants';
import { cn } from '@/utils/functions';
import { ScrollArea } from '@radix-ui/react-scroll-area';

export default function BoxSchedulePage() {
  const { collection } = useRealmApp();
  const [schedule, setSchedule] = useState<DaySchedule>({});
  const [items, setItems] = useState<Item[]>([]);
  const [boxRequirements, setBoxRequirements] = useState<BoxRequirement>({});
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [filterSize, setFilterSize] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date()));
  const isMobile = useIsMobile();
    const [lockedBoxes, setLockedBoxes] = useState<Record<string, number>>({})
  const [lockedHardwareBags, setLockedHardwareBags] = useState<Record<string, number>>({})
  const [lockedMountingRails, setLockedMountingRails] = useState<Record<string, number>>({})
  const [hardwareBagRequirements, setHardwareBagRequirements] = useState<HardwareBagRequirement>({})
  const [mountingRailRequirements, setMountingRailRequirements] = useState<MountingRailRequirement>({})



  useEffect(() => {
    loadScheduleAndItems();
  }, []);

  useEffect(() => {
    calculateRequirements();
  }, [schedule, items, selectedDates]);

  const loadScheduleAndItems = async () => {
    if (!collection) return;

    try {
      const board = await collection.findOne({ /* query to find the board */ });
      if (board) {
        setSchedule(board.weeklySchedule || {});
        setItems(board.items_page.items || []);
      }
    } catch (err) {
      console.error("Failed to load schedule and items", err);
      toast.error("Failed to load box schedule. Please refresh the page.");
    }
  };

 const calculateRequirements = () => {
    const boxReq: BoxRequirement = {
      'Orange': 0,
      'Pink': 0,
      'Green': 0,
      'Green Plus': 0,
      'Blue': 0,
      'Purple': 0,
      'Custom': 0,
    }
    const hardwareReq: HardwareBagRequirement = {}
    const railReq: MountingRailRequirement = {}

    selectedDates.forEach(date => {
      const selectedDay = format(date, 'EEEE')
      const dayItems = (schedule[selectedDay] || [])
        .map(id => items.find(item => item.id === id))
        .filter(Boolean) as Item[]

      dayItems.forEach(item => {
        const size = item.values.find(v => v.columnName === ColumnTitles.Size)?.text as ItemSizes
        if (size && BOX_COLORS[size]) {
          const { color, count, hardwareBag, mountingRail } = BOX_COLORS[size]
          if (color === 'Blue and Green') {
            boxReq.Blue += 1
            boxReq.Green += 1
          } else if (color === 'Purple and Custom') {
            boxReq.Purple += 2
            boxReq.Custom += 1
          } else {
            boxReq[color] += count
          }
          hardwareReq[hardwareBag] = (hardwareReq[hardwareBag] || 0) + 1
          
          if (size === ItemSizes.ThirtySix_By_Fifteen) {
            railReq['48"'] = (railReq['48"'] || 0) + 2
          } else {
            railReq[mountingRail] = (railReq[mountingRail] || 0) + 1
          }
        }
      })
    })

    // Subtract locked items from the requirements
    Object.entries(lockedBoxes).forEach(([color, count]) => {
      if (boxReq[color]) {
        boxReq[color] = Math.max(0, boxReq[color] - count)
      }
    })

    Object.entries(lockedHardwareBags).forEach(([bagType, count]) => {
      if (hardwareReq[bagType]) {
        hardwareReq[bagType] = Math.max(0, hardwareReq[bagType] - count)
      }
    })

    Object.entries(lockedMountingRails).forEach(([railType, count]) => {
      if (railReq[railType]) {
        railReq[railType] = Math.max(0, railReq[railType] - count)
      }
    })

    setBoxRequirements(boxReq)
    setHardwareBagRequirements(hardwareReq)
    setMountingRailRequirements(railReq)
  }

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

  const changeWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => 
      direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
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
      schedule={schedule}
      toggleDateSelection={toggleDateSelection}
      isMobile={isMobile}
    />
  );

  const handleItemClick = (itemType: 'box' | 'hardwareBag' | 'mountingRail', itemName: string, isLocked: boolean) => {
    const updateLockedItems = (prevLocked: Record<string, number>) => {
      const newLocked = { ...prevLocked }
      if (isLocked) {
        // Move from "Already Prepared" to "To Be Prepared"
        newLocked[itemName] = Math.max(0, (newLocked[itemName] || 0) - 1)
        if (newLocked[itemName] === 0) {
          delete newLocked[itemName]
        }
      } else {
        // Move from "To Be Prepared" to "Already Prepared"
        newLocked[itemName] = (newLocked[itemName] || 0) + 1
      }
      return newLocked
    }

    switch (itemType) {
      case 'box':
        setLockedBoxes(updateLockedItems)
        break
      case 'hardwareBag':
        setLockedHardwareBags(updateLockedItems)
        break
      case 'mountingRail':
        setLockedMountingRails(updateLockedItems)
        break
    }
  }

  const renderItemBox = (itemType: 'box' | 'hardwareBag' | 'mountingRail', itemName: string, count: number, isLocked: boolean) => {
    const backgroundColor = itemType === 'box' ? (itemName === "Custom" ? "black" : itemName.toLowerCase().split(" ").at(0)) : 'gray'
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
    )
  }

  

 const filteredRequirements = useMemo(() => {
    return Object.entries(boxRequirements).filter(([color, count]) => {
      const matchesFilter = filterSize === 'all' || color === filterSize
      const matchesSearch = color.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesFilter && matchesSearch && count > 0
    })
  }, [boxRequirements, filterSize, searchTerm])

  const totalBoxes = useMemo(() => {
    return filteredRequirements.reduce((total, [_, count]) => total + count, 0)
  }, [filteredRequirements])

  const uniqueBoxColors = useMemo(() => {
    return Object.values(boxRequirements).filter(count => count > 0).length
  }, [boxRequirements])

  const selectedItems = useMemo(() => {
    const itemSet = new Set<Item>()
    selectedDates.forEach(date => {
      const selectedDay = DAYS_OF_WEEK[date.getDay()]
      const dayItems = (schedule[selectedDay] || [])
        .map(id => items.find(item => item.id === id))
        .filter(Boolean) as Item[]
      dayItems.forEach(item => itemSet.add(item))
    })
    return Array.from(itemSet)
  }, [schedule, items, selectedDates])

  const renderTabs = () => (
    <Card className="flex-grow mt-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
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
          <TabsContent value="overview" className="flex-grow overflow-auto">
            <ScrollArea className="h-full">
              <div className={cn("space-y-6", isMobile ? "p-4" : "p-6")}>
                <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
                  <Card>
                    <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
                      <h3 className={cn("font-semibold mb-4", isMobile ? "text-lg" : "text-xl")}>Boxes Already Made</h3>
                      <div className={cn(
                        "grid gap-4",
                        isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                      )}>
                        {Object.entries(lockedBoxes).map(([color, count]) => renderItemBox('box', color, count, true))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
                      <h3 className={cn("font-semibold mb-4", isMobile ? "text-lg" : "text-xl")}>Boxes To Be Made</h3>
                      <div className={cn(
                        "grid gap-4",
                        isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                      )}>
                        {Object.entries(boxRequirements).map(([color, count]) => {
                          if (count > 0) {
                            return renderItemBox('box', color, count, false)
                          }
                          return null
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className={cn("grid gap-6", isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
                  <Card>
                    <CardContent className={cn("flex flex-col justify-center", isMobile ? "p-4" : "p-6")}>
                      <h3 className={cn("font-semibold mb-2", isMobile ? "text-sm" : "text-lg")}>Total Boxes</h3>
                      <p className={cn("font-bold", isMobile ? "text-2xl" : "text-4xl")}>{totalBoxes}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className={cn("flex flex-col justify-center", isMobile ? "p-4" : "p-6")}>
                      <h3 className={cn("font-semibold mb-2", isMobile ? "text-sm" : "text-lg")}>Box Colors</h3>
                      <p className={cn("font-bold", isMobile ? "text-2xl" : "text-4xl")}>{uniqueBoxColors}</p>
                    </CardContent>
                  </Card>
                  {!isMobile && (
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-2">Selected Days</h3>
                        <p className="text-xl font-semibold">{selectedDates.length}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
                <Card>
                  <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
                    <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>Hardware Bag Overview</h3>
                    <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2")}>
                      <div>
                        <h4 className={cn("font-semibold mb-2", isMobile ? "text-xs" : "text-sm")}>Already Prepared</h4>
                        <div className={cn(
                          "grid gap-4",
                          isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                        )}>
                          {Object.entries(lockedHardwareBags).map(([bagType, count]) => renderItemBox('hardwareBag', bagType, count, true))}
                        </div>
                      </div>
                      <div>
                        <h4 className={cn("font-semibold mb-2", isMobile ? "text-xs" : "text-sm")}>To Be Prepared</h4>
                        <div className={cn(
                          "grid gap-4",
                          isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                        )}>
                          {Object.entries(hardwareBagRequirements).map(([bagType, count]) => {
                            if (count > 0) {
                              return renderItemBox('hardwareBag', bagType, count, false)
                            }
                            return null
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-2")}>
                  <Card>
                    <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
                      <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>Mounting Rails Already Prepared</h3>
                      <div className={cn(
                        "grid gap-4",
                        isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                      )}>
                        {Object.entries(lockedMountingRails).map(([railType, count]) => renderItemBox('mountingRail', railType, count, true))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
                      <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>Mounting Rails To Be Prepared</h3>
                      <div className={cn(
                        "grid gap-4",
                        isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                      )}>
                        {Object.entries(mountingRailRequirements).map(([railType, count]) => {
                          if (count > 0) {
                            return renderItemBox('mountingRail', railType, count, false)
                          }
                          return null
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="details" className="flex-grow overflow-auto">
            <ScrollArea className="h-full">
              <div className={cn("space-y-6", isMobile ? "p-4" : "p-6")}>
                <Card>
                  <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
                    <h3 className={cn("font-semibold mb-4", isMobile ? "text-lg" : "text-xl")}>Box Color Details</h3>
                    <div className={cn(
                      "grid gap-4",
                      isMobile ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                    )}>
                      {filteredRequirements.map(([color, count]) => {
                        const { hardwareBag, mountingRail } = Object.values(BOX_COLORS).find(box => box.color === color) || {}
                        return (
                          <div 
                            key={color}
                            className="bg-gray-100 p-4 rounded-lg"
                          >
                            <div 
                              className={cn(
                                "rounded-md flex items-center justify-center text-white font-semibold mb-2",
                                isMobile ? "w-8 h-8 text-sm" : "w-16 h-16 text-lg"
                              )}
                              style={{ backgroundColor: color === "Custom" ? "black" : color.toLowerCase().split(" ").at(0) }}
                            >
                              <span>{count}</span>
                            </div>
                            <h4 className={cn("font-semibold mb-2", isMobile ? "text-xs" : "text-sm")}>{color}</h4>
                            {hardwareBag && <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Hardware: {hardwareBag}</p>}
                            {mountingRail && <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>Rail: {mountingRail}</p>}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
                  <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>Items Requiring Boxes</h3>
                  <div className="space-y-4">
                    {selectedItems.map((item) => {
                      const name = item.values.find(v => v.columnName === ColumnTitles.Customer_Name)?.text || 'Unnamed Item'
                      const size = item.values.find(v => v.columnName === ColumnTitles.Size)?.text
                      const boxColor = size && (size in BOX_COLORS) ? BOX_COLORS[size as ItemSizes].color : 'Unknown Color'
                      const mountingRail = size && (size in BOX_COLORS) ? BOX_COLORS[size as ItemSizes].mountingRail : 'Unknown Rail'
                      return (
                        <div key={item.id} className={cn(
                          "flex justify-between items-center p-2 bg-gray-100 rounded",
                          isMobile ? "flex-col items-start" : ""
                        )}>
                          <span className={cn("font-medium", isMobile ? "text-xs mb-1" : "")}>{name}</span>
                          <div className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                            <span className="mr-2">{size || 'Unknown Size'}</span>
                            <span className="font-semibold mr-2">{boxColor}</span>
                            <span className={isMobile ? "block mt-1" : ""}>Rail: {mountingRail}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
                  <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>Box Sizes Guide</h3>
                  <div className={cn(
                    "grid gap-4",
                    isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
                  )}>
                    {Object.entries(BOX_COLORS).map(([size, { color, count, hardwareBag, mountingRail }]) => (
                      <div key={size} className={cn(
                        "p-2 bg-gray-100 rounded",
                        isMobile ? "text-xs" : ""
                      )}>
                        <span className="font-semibold block">{size}</span>
                        <span>{`${color} (${count}x)`}</span>
                        <span className="block text-gray-600">Hardware: {hardwareBag}</span>
                        <span className="block text-gray-600">Rail: {mountingRail}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              </div>
            </ScrollArea>
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
      renderFilters={renderFilters}
      renderWeekView={renderWeekView}
      renderTabs={renderTabs}
    />
  );
}
