"use client"

import { useEffect, useState, useCallback } from 'react';
import { format, startOfWeek } from "date-fns";
import { toast } from 'sonner';

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealmApp } from '@/hooks/useRealmApp';
import { ColumnTitles, Item, ItemDesigns, ItemSizes } from '@/typings/types';
import { useWeeklySchedule } from "@/components/weekly-schedule/UseWeeklySchedule";
import { useIsMobile } from '@/components/shared/UseIsMobile';
import { SchedulePageLayout } from '@/components/shared/SchedulePageLayout';
import { WeekView } from '@/components/shared/WeekView';
import { Filters } from '@/components/shared/Filters';
import { cn } from '@/utils/functions';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { ALOE_COLORS, AMBER_COLORS, COASTAL_COLORS, DESIGN_COLORS, ELEMENTAL_COLORS, SAPHIRE_COLORS, SIZE_MULTIPLIERS, TIMBERLINE_COLORS } from '@/utils/constants';

type PaintRequirement = Record<string | number, number>;

export default function PaintSchedulePage() {
  const { collection } = useRealmApp();
  const [items, setItems] = useState<Item[]>([]);
  const [paintRequirements, setPaintRequirements] = useState<Record<string, PaintRequirement>>({});
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [filterDesign, setFilterDesign] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const isMobile = useIsMobile();
  const { weeklySchedules, currentWeekStart, changeWeek } = useWeeklySchedule({ boardId: 'your-board-id', weekStartsOn: 1 });

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    calculatePaintRequirements();
  }, [weeklySchedules, items, selectedDates, currentWeekStart]);

  const loadItems = async () => {
    if (!collection) return;

    try {
      const board = await collection.findOne({ /* query to find the board */ });
      if (board) {
        setItems(board.items_page.items || []);
      }
    } catch (err) {
      console.error("Failed to load items", err);
      toast.error("Failed to load paint schedule items. Please refresh the page.");
    }
  };

  const calculatePaintRequirements = useCallback(() => {
    const requirements: Record<string, PaintRequirement> = {}

    selectedDates.forEach(date => {
      const selectedDay = format(date, 'EEEE')
      const weekKey = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const dayItems = (weeklySchedules[weekKey]?.[selectedDay] || [])
        .map(id => items.find(item => item.id === id))
        .filter(Boolean) as Item[]

      dayItems.forEach(item => {
        const design = item.values.find(v => v.columnName === ColumnTitles.Design)?.text as ItemDesigns
        const size = item.values.find(v => v.columnName === ColumnTitles.Size)?.text as ItemSizes

        if (design && size && DESIGN_COLORS[design] && SIZE_MULTIPLIERS[size]) {
          if (!requirements[design]) {
            requirements[design] = {}
          }

          const totalArea = SIZE_MULTIPLIERS[size]
          const colorCount = DESIGN_COLORS[design].length
          const piecesPerColor = Math.ceil(totalArea / colorCount)

          DESIGN_COLORS[design].forEach(color => {
            if (design === ItemDesigns.Coastal || design === ItemDesigns.Fade_To_Five || 
                (design === ItemDesigns.Lawyer && typeof color === 'number')) {
              requirements[ItemDesigns.Coastal][color] = (requirements[ItemDesigns.Coastal][color] || 0) + piecesPerColor
            } else if (design === ItemDesigns.Lawyer && typeof color === 'string') {
              requirements[ItemDesigns.Lawyer][color] = (requirements[ItemDesigns.Lawyer][color] || 0) + piecesPerColor
            } else {
              requirements[design][color] = (requirements[design][color] || 0) + piecesPerColor
            }
          })
        }
      })
    })

    delete requirements[ItemDesigns.Fade_To_Five]

    if (Object.keys(requirements[ItemDesigns.Lawyer] || {}).length === 0) {
      delete requirements[ItemDesigns.Lawyer]
    }

    setPaintRequirements(requirements)
  }, [weeklySchedules, items, selectedDates])

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

  const renderColorBox = (design: ItemDesigns, color: number | string, pieces: number) => {
    let backgroundColor: string;

    if (design === ItemDesigns.Coastal && typeof color === 'string' && COASTAL_COLORS[color]) {
      backgroundColor = COASTAL_COLORS[color].hex;
    } else if (design === ItemDesigns.Amber && typeof color === 'string' && AMBER_COLORS[color]) {
      backgroundColor = AMBER_COLORS[color].hex;
    } else if (design === ItemDesigns.Elemental && typeof color === 'string' && ELEMENTAL_COLORS[color]) {
      backgroundColor = ELEMENTAL_COLORS[color].hex;
    } else if (design === ItemDesigns.Saphire && typeof color === 'string' && SAPHIRE_COLORS[color]) {
      backgroundColor = SAPHIRE_COLORS[color].hex;
    } else if (design === ItemDesigns.Timberline && typeof color === 'string' && TIMBERLINE_COLORS[color]) {
      backgroundColor = TIMBERLINE_COLORS[color].hex;
    } else if (design === ItemDesigns.Aloe && typeof color === 'string' && ALOE_COLORS[color]) {
      backgroundColor = ALOE_COLORS[color].hex;
    } else {
      const hue = typeof color === 'number' ? (color * 30) % 360 : 0;
      backgroundColor = typeof color === 'number' ? hsl(`${hue}, 70%, 50%`) : '#6B7280';
    }

    return (
      <div key={color} className="flex flex-col items-center">
        <div 
          style={{ backgroundColor }}
          className={cn(
            "rounded-md flex items-center justify-center text-white font-semibold",
            isMobile ? "w-8 h-8 text-xs" : "w-12 h-12 text-sm"
          )}
        >
          <span>{pieces}</span>
        </div>
        <span className={cn("mt-1 font-medium", isMobile ? "text-xs" : "text-sm")}>{color}</span>
      </div>
    )
  }

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
            <ScrollArea className="h-full">
              <div className={cn("space-y-6", isMobile ? "p-4" : "p-6")}>
                <div className={cn("grid gap-6", isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
                  <Card>
                    <CardContent className={cn("flex flex-col justify-center", isMobile ? "p-4" : "p-6")}>
                      <h3 className={cn("font-semibold mb-2", isMobile ? "text-sm" : "text-lg")}>Total Pieces</h3>
                      <p className={cn("font-bold", isMobile ? "text-2xl" : "text-4xl")}>{totalPieces}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className={cn("flex flex-col justify-center", isMobile ? "p-4" : "p-6")}>
                      <h3 className={cn("font-semibold mb-2", isMobile ? "text-sm" : "text-lg")}>Designs</h3>
                      <p className={cn("font-bold", isMobile ? "text-2xl" : "text-4xl")}>{filteredRequirements.length}</p>
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
                    <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>Design Overview</h3>
                    <div className={cn(
                      "grid gap-4",
                      isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                    )}>
                      {filteredRequirements.map(([design, colorRequirements]) => (
                        <div key={design} className="bg-gray-100 p-4 rounded-lg">
                          <h4 className={cn("font-semibold mb-2", isMobile ? "text-xs" : "text-sm")}>{design}</h4>
                          <p className={cn("font-bold", isMobile ? "text-lg" : "text-2xl")}>
                            {Object.values(colorRequirements).reduce((sum, pieces) => sum + pieces, 0)}
                          </p>
                          <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>pieces</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent className="flex-grow overflow-hidden" value="details">
            <ScrollArea className="h-full">
              <div className={cn("space-y-6", isMobile ? "p-4" : "p-6")}>
                {filteredRequirements.map(([design, colorRequirements]) => (
                  <Card key={design}>
                    <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
                      <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>{design}</h3>
                      <div className={cn(
                        "grid gap-4",
                        isMobile ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10"
                      )}>
                        {Object.entries(colorRequirements).map(([color, pieces]) => 
                          renderColorBox(design as ItemDesigns, color, pieces)
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
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
    />
  );
}
