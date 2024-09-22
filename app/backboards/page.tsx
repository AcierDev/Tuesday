"use client"

import { addDays, addWeeks, format, startOfWeek, subWeeks } from "date-fns"
import { ChevronLeft, ChevronRight, Menu, Scissors, Search } from "lucide-react"
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRealmApp } from '@/hooks/useRealmApp'
import { ColumnTitles, type Item, ItemSizes } from '@/typings/types'
import { DAYS_OF_WEEK } from '@/utils/constants'
import { cn } from "@/utils/functions"

type DaySchedule = Record<string, string[]>;
type BackboardRequirement = Record<ItemSizes, number>;

const backboardData = {
  [ItemSizes.Fourteen_By_Seven]: { panels: 1, instructions: "1x Using an uncut backboard, cut off as little as possible on the sides when adding the angle. H: 18 5/16\"", width: 14, height: 18.3125, blankSize: 20 },
  [ItemSizes.Sixteen_By_Six]: { panels: 1, instructions: "1x Using an uncut backboard, cut off as little as possible on the sides when adding the angle. H: 18 5/16\"", width: 16, height: 18.3125, blankSize: 20 },
  [ItemSizes.Sixteen_By_Ten]: { panels: 1, instructions: "1x Using an uncut backboard, cut off as little as possible on the sides when adding the angle.\nCut the H: 30 ¾\"\nCut it in half with a straight cut (~24 ¼\")", width: 16, height: 30.75, blankSize: 32 },
  [ItemSizes.Nineteen_By_Ten]: { panels: 2, instructions: "Panel 1: H: 30 ½\" W: 30 ¾\"\nPanel 2: H: 30 ½\" W: 27 ¾\"", width: 58.5, height: 30.5, blankSize: 32 },
  [ItemSizes.TwentyTwo_By_Ten]: { panels: 2, instructions: "2x H: 30 ¾\" W: 33 ¾\"", width: 67.5, height: 30.75, blankSize: 32 },
  [ItemSizes.Nineteen_By_Eleven]: { panels: 2, instructions: "2x H: 33 ¾ W: 33 ¾", width: 67.5, height: 33.75, blankSize: 32 },
  [ItemSizes.TwentyTwo_By_Eleven]: { panels: 2, instructions: "2x H: 33 ¾ W: 33 ¾", width: 67.5, height: 33.75, blankSize: 36 },
  [ItemSizes.TwentySeven_By_Eleven]: { panels: 3, instructions: "3x H: 33 ¾ W: 27 ¾\"", width: 83.25, height: 33.75, blankSize: 29 },
  [ItemSizes.TwentySeven_By_Fifteen]: { panels: 3, instructions: "3x H: 46 5/16\" W: 27 ¾\"", width: 83.25, height: 46.3125, blankSize: 29 },
  [ItemSizes.ThirtyOne_By_Fifteen]: { panels: 4, instructions: "4x H: 46 5/16\" W: 27 ¾\"", width: 111, height: 46.3125, blankSize: 29 },
  [ItemSizes.ThirtySix_By_Fifteen]: { panels: 4, instructions: "4x H: 46 5/16\" W: 27 ¾\"", width: 111, height: 46.3125, blankSize: 29 },
}

export default function BackboardCuttingGuidePage() {
  const { collection } = useRealmApp()
  const [schedule, setSchedule] = useState<DaySchedule>({})
  const [items, setItems] = useState<Item[]>([])
  const [backboardRequirements, setBackboardRequirements] = useState<BackboardRequirement>({})
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [filterSize, setFilterSize] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => startOfWeek(new Date()))
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    loadScheduleAndItems()
  }, [])

  useEffect(() => {
    calculateBackboardRequirements()
  }, [schedule, items, selectedDates])

  const loadScheduleAndItems = async () => {
    if (!collection) return

    try {
      const board = await collection.findOne({ /* query to find the board */ })
      if (board) {
        setSchedule(board.weeklySchedule || {})
        setItems(board.items_page.items || [])
      }
    } catch (err) {
      console.error("Failed to load schedule and items", err)
      toast.error("Failed to load backboard cutting guide. Please refresh the page.")
    }
  }

  const calculateBackboardRequirements = () => {
    const requirements: BackboardRequirement = {} as BackboardRequirement

    selectedDates.forEach(date => {
      const selectedDay = format(date, 'EEEE')
      const dayItems = (schedule[selectedDay] || [])
        .map(id => items.find(item => item.id === id))
        .filter(Boolean) as Item[]

      dayItems.forEach(item => {
        const size = item.values.find(v => v.columnName === ColumnTitles.Size)?.text as ItemSizes

        if (size && backboardData[size]) {
          requirements[size] = (requirements[size] || 0) + 1
        }
      })
    })

    setBackboardRequirements(requirements)
  }

  const filteredRequirements = Object.entries(backboardRequirements).filter(([size, _]) => {
    const matchesSize = filterSize === 'all' || size === filterSize
    const matchesSearch = size.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSize && matchesSearch
  })

  const totalPanels = filteredRequirements.reduce((total, [size, count]) => {
    return total + (backboardData[size as ItemSizes].panels * count)
  }, 0)

  const renderSizeBox = (size: ItemSizes, count: number) => {
    const { panels, width, height } = backboardData[size]
    const totalArea = width * height * count
    return (
      <div key={size} className="flex flex-col items-center">
        <div 
          style={{ backgroundColor: `hsl(${(panels * 30) % 360}, 70%, 50%)` }}
          className={cn(
            "rounded-md flex items-center justify-center text-white font-semibold",
            isMobile ? "w-16 h-16 text-xs" : "w-24 h-24 text-sm"
          )}
        >
          <span>{count}</span>
        </div>
        <span className={cn("mt-1 font-medium text-center", isMobile ? "text-xs" : "text-sm")}>{size}</span>
        <span className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>{totalArea.toFixed(2)} sq in</span>
      </div>
    )
  }

  const toggleDateSelection = (date: Date) => {
    setSelectedDates(prev => {
      const dateString = format(date, 'yyyy-MM-dd')
      if (prev.some(d => format(d, 'yyyy-MM-dd') === dateString)) {
        return prev.filter(d => format(d, 'yyyy-MM-dd') !== dateString)
      } 
        return [...prev, date]
      
    })
  }

  const renderWeekView = () => {
    if (isMobile) {
      return (
        <ScrollArea className="w-full">
          <div className="flex space-x-2 p-2">
            {DAYS_OF_WEEK.map((day, index) => {
              const date = addDays(currentWeekStart, index)
              const isSelected = selectedDates.some(d => format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
              const itemCount = schedule[day]?.length || 0
              return (
                <Card 
                  key={day} 
                  className={cn(
                    "flex-shrink-0 w-20 cursor-pointer transition-all",
                    isSelected ? "ring-2 ring-primary" : "hover:bg-gray-50"
                  )}
                  onClick={() => toggleDateSelection(date)}
                >
                  <CardContent className="p-2 text-center">
                    <p className="font-semibold text-sm">{day.slice(0, 3)}</p>
                    <p className="text-xs text-gray-600">{format(date, "MMM d")}</p>
                    <p className="mt-1 text-lg font-bold">{itemCount}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      )
    }

    return (
      <div className="grid grid-cols-7 gap-2 mb-6">
        {DAYS_OF_WEEK.map((day, index) => {
          const date = addDays(currentWeekStart, index)
          const isSelected = selectedDates.some(d => format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
          const itemCount = schedule[day]?.length || 0
          return (
            <Card 
              key={day} 
              className={cn(
                "cursor-pointer transition-all",
                isSelected ? "ring-2 ring-primary" : "hover:bg-gray-50"
              )}
              onClick={() => toggleDateSelection(date)}
            >
              <CardContent className="p-4">
                <p className="font-semibold">{day}</p>
                <p className="text-sm text-gray-600">{format(date, "MMM d")}</p>
                <p className="mt-2 text-lg font-bold">{itemCount}</p>
                <p className="text-xs text-gray-600">items</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  const changeWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => 
      direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
    )
  }

  const renderFilters = () => {
    if (isMobile) {
      return (
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Adjust your backboard cutting guide filters
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <Select value={filterSize} onValueChange={setFilterSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sizes</SelectItem>
                  {Object.keys(backboardRequirements).map(size => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  className="pl-10 pr-4 py-2 w-full"
                  placeholder="Search sizes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )
    }

    return (
      <div className="flex space-x-4 mb-6">
        <Select value={filterSize} onValueChange={setFilterSize}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sizes</SelectItem>
            {Object.keys(backboardRequirements).map(size => (
              <SelectItem key={size} value={size}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-10 pr-4 py-2 w-full"
            placeholder="Search sizes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button className="w-[280px]" variant="outline">
              {format(currentWeekStart, "MMM d, yyyy")} - {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[280px] p-0">
            <div className="flex justify-between items-center p-2">
              <Button size="icon" variant="ghost" onClick={() => changeWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold">
                {format(currentWeekStart, "MMMM yyyy")}
              </span>
              <Button size="icon" variant="ghost" onClick={() => changeWeek('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  const renderBackboardPanel = (width: number, height: number) => {
    const aspectRatio = width / height
    const panelWidth = isMobile ? 80 : 120
    const panelHeight = panelWidth / aspectRatio

    return (
      <div 
        className="bg-gray-200 rounded-sm flex items-center justify-center text-xs font-semibold"
        style={{ width: `${panelWidth}px`, height: `${panelHeight}px` }}
      >
        {width}" x {height}"
      </div>
    )
  }

  return (
    <div className={cn(
      "container mx-auto py-4 min-h-screen flex flex-col",
      isMobile ? "px-2" : "px-4"
    )}>
      <div className={cn(
        "flex items-center mb-4",
        isMobile ? "justify-between" : "justify-start"
      )}>
        <h1 className={cn(
          "font-bold",
          isMobile ? "text-2xl" : "text-3xl"
        )}>Backboard Cutting Guide</h1>
        {isMobile ? renderFilters() : null}
      </div>
      
      {!isMobile && renderFilters()}

      {isMobile ? <div className="mb-4 flex items-center justify-between">
          <Button size="icon" variant="outline" onClick={() => changeWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">
            {format(currentWeekStart, "MMM d")} - {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
          </span>
          <Button size="icon" variant="outline" onClick={() => changeWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div> : null}

      {renderWeekView()}
      
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
                      <h3 className={cn("font-semibold mb-2", isMobile ? "text-sm" : "text-lg")}>Total Panels</h3>
                      <p className={cn("font-bold", isMobile ? "text-2xl" : "text-4xl")}>{totalPanels}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className={cn("flex flex-col justify-center", isMobile ? "p-4" : "p-6")}>
                      <h3 className={cn("font-semibold mb-2", isMobile ? "text-sm" : "text-lg")}>Sizes</h3>
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
    <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>Size Overview</h3>
    <div className={cn(
      "grid gap-4",
      isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
    )}>
      {filteredRequirements.map(([size, count]) => {
        const { panels } = backboardData[size as ItemSizes]
        const totalPanels = panels * count
        return (
          <div key={size} className="bg-gray-100 p-4 rounded-lg">
            <h4 className={cn("font-semibold mb-2", isMobile ? "text-xs" : "text-sm")}>{size}</h4>
            <p className={cn("font-bold", isMobile ? "text-lg" : "text-2xl")}>
              {count}
            </p>
            <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
              backboards ({totalPanels} panels)
            </p>
          </div>
        )
      })}
    </div>
  </CardContent>
</Card>
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent className="flex-grow overflow-hidden" value="details">
            <ScrollArea className="h-full">
              <div className={cn("space-y-6", isMobile ? "p-4" : "p-6")}>
                {filteredRequirements.map(([size, count]) => {
                  const { panels, instructions, width, height, blankSize } = backboardData[size as ItemSizes]
                  const totalArea = width * height * count
                  return (
                    <Card key={size}>
                      <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                          <h3 className={cn("font-semibold", isMobile ? "text-lg" : "text-xl")}>{size}</h3>
                          <div className="flex items-center mt-2 md:mt-0">
                            <Scissors className="w-4 h-4 mr-2" />
                            <span className="text-sm font-medium">Panels: {panels}</span>
                          </div>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2">
                          <div>
                            <h4 className="font-medium mb-2">Cutting Instructions:</h4>
                            <p className="text-sm whitespace-pre-line bg-gray-100 p-3 rounded-md">{instructions}</p>
                            <div className="mt-4 grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-sm font-medium">Total Art Pieces:</p>
                                <p className="text-lg font-bold">{count}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Total Panels:</p>
                                <p className="text-lg font-bold">{panels * count}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Blank Size:</p>
                                <p className="text-lg font-bold">{blankSize}"</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}