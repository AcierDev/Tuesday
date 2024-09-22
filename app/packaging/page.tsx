// pages/BoxSchedulePage.tsx
'use client'

import { addWeeks, format, startOfWeek, subWeeks } from "date-fns"
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import DetailsTabContent from '@/components/packaging/DetailsTabContent'
import Filters from '@/components/packaging/Filters'
import HardwareBagOverview from '@/components/packaging/HardwareBagsOverview'
import MountingRailsOverview from '@/components/packaging/MountingRailsOverview'
import NavigationButtons from '@/components/packaging/NavigationButtons'
import RequirementsSection from '@/components/packaging/RequirementsSection'
import SummaryCards from '@/components/packaging/SummaryCards'
import WeekView from '@/components/packaging/WeekView'
import { Card } from "@/components/ui/card"
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRealmApp } from '@/hooks/useRealmApp'
import { type BoxRequirement, type DaySchedule, type HardwareBagRequirement, type MountingRailRequirement } from '@/typings/interfaces'
import { ColumnTitles, type Item, ItemSizes } from '@/typings/types'
import { BOX_COLORS } from '@/utils/constants'
import { cn } from "@/utils/functions"

export default function BoxSchedulePage() {
  const { collection } = useRealmApp()
  const [schedule, setSchedule] = useState<DaySchedule>({})
  const [items, setItems] = useState<Item[]>([])
  const [boxRequirements, setBoxRequirements] = useState<BoxRequirement>({})
  const [hardwareBagRequirements, setHardwareBagRequirements] = useState<HardwareBagRequirement>({})
  const [mountingRailRequirements, setMountingRailRequirements] = useState<MountingRailRequirement>({})
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [filterSize, setFilterSize] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date()))
  const [isMobile, setIsMobile] = useState(false)
  const [lockedBoxes, setLockedBoxes] = useState<Record<string, number>>({})
  const [lockedHardwareBags, setLockedHardwareBags] = useState<Record<string, number>>({})
  const [lockedMountingRails, setLockedMountingRails] = useState<Record<string, number>>({})

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
    calculateRequirements()
  }, [schedule, items, selectedDates, lockedBoxes, lockedHardwareBags, lockedMountingRails])

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
      toast.error("Failed to load box schedule. Please refresh the page.")
    }
  }

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
      const selectedDay = format(date, 'EEEE')
      const dayItems = (schedule[selectedDay] || [])
        .map(id => items.find(item => item.id === id))
        .filter(Boolean) as Item[]
      dayItems.forEach(item => itemSet.add(item))
    })
    return Array.from(itemSet)
  }, [schedule, items, selectedDates])

  const toggleDateSelection = (date: Date) => {
    setSelectedDates(prev => {
      const dateString = format(date, 'yyyy-MM-dd')
      if (prev.some(d => format(d, 'yyyy-MM-dd') === dateString)) {
        return prev.filter(d => format(d, 'yyyy-MM-dd') !== dateString)
      } 
        return [...prev, date]
      
    })
  }

  const renderWeekView = () => (
    <WeekView 
      currentWeekStart={currentWeekStart}
      isMobile={isMobile}
      items={items}
      schedule={schedule}
      selectedDates={selectedDates}
      toggleDateSelection={toggleDateSelection}
    />
  )

  const changeWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => 
      direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
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
        )}>Box Schedule</h1>
        {isMobile ? <Filters 
          boxRequirements={boxRequirements} 
          filterSize={filterSize} 
          isMobile={isMobile} 
          searchTerm={searchTerm} 
          setFilterSize={setFilterSize} 
          setSearchTerm={setSearchTerm}
        /> : null}
      </div>
      
      {!isMobile && <Filters 
        boxRequirements={boxRequirements} 
        changeWeek={changeWeek} 
        currentWeekStart={currentWeekStart} 
        filterSize={filterSize} 
        isMobile={isMobile} 
        searchTerm={searchTerm}
        setFilterSize={setFilterSize}
        setSearchTerm={setSearchTerm}
      />}

      {isMobile ? <NavigationButtons 
        changeWeek={changeWeek}
        currentWeekStart={currentWeekStart}
      /> : null}

      {renderWeekView()}
      
      <Card className="flex-grow mt-4">
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
                <SummaryCards 
                  isMobile={isMobile}
                  selectedDates={selectedDates.length}
                  totalBoxes={totalBoxes}
                  uniqueBoxColors={uniqueBoxColors}
                />
                <RequirementsSection 
                  boxRequirements={boxRequirements}
                  handleItemClick={handleItemClick}
                  hardwareBagRequirements={hardwareBagRequirements}
                  isMobile={isMobile}
                  lockedBoxes={lockedBoxes}
                  lockedHardwareBags={lockedHardwareBags}
                  lockedMountingRails={lockedMountingRails}
                  mountingRailRequirements={mountingRailRequirements}
                />
                <HardwareBagOverview 
                  handleItemClick={handleItemClick}
                  hardwareBagRequirements={hardwareBagRequirements}
                  isMobile={isMobile}
                  lockedHardwareBags={lockedHardwareBags}
                />
                <MountingRailsOverview 
                  handleItemClick={handleItemClick}
                  isMobile={isMobile}
                  lockedMountingRails={lockedMountingRails}
                  mountingRailRequirements={mountingRailRequirements}
                />
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent className="flex-grow overflow-auto" value="details">
            <ScrollArea className="h-full">
              <DetailsTabContent 
                boxRequirements={boxRequirements}
                filteredRequirements={filteredRequirements}
                isMobile={isMobile}
                selectedItems={selectedItems}
              />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
