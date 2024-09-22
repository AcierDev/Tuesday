"use client"

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { format, startOfWeek } from "date-fns"
import { Menu } from "lucide-react"

import { useRealmApp } from '@/hooks/useRealmApp'
import { useWeeklySchedule } from '@/components/weekly-schedule/useWeeklySchedule'
import { ColumnTitles, type Item, ItemDesigns, type ItemSizes } from '@/typings/types'
import { DESIGN_COLORS, SIZE_MULTIPLIERS, DAYS_OF_WEEK } from '@/utils/constants'
import { cn } from "@/utils/functions"
import { WeekSelector } from "@/components/weekly-schedule/WeekSelector"
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import Filters from '@/components/paint/Filters'
import WeekView from '@/components/paint/WeekView'
import SummaryTabs from '@/components/paint/SummaryTabs'

export default function PaintSchedulePage() {
  const { collection } = useRealmApp()
  const [items, setItems] = useState<Item[]>([])
  const [paintRequirements, setPaintRequirements] = useState<Record<string, Record<string | number, number>>>({})
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [filterDesign, setFilterDesign] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [isMobile, setIsMobile] = useState(false)

  const { weeklySchedules, currentWeekStart, changeWeek } = useWeeklySchedule({ boardId: 'your-board-id', weekStartsOn: 1 })

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    loadItems()
  }, [collection, weeklySchedules])

  useEffect(() => {
    calculatePaintRequirements()
  }, [weeklySchedules, items, selectedDates, currentWeekStart])

  const loadItems = async () => {
    console.log('load items')
    console.log('collection', collection)
    if (!collection) return

    try {
      const board = await collection.findOne({ /* query to find the board */ })
      console.log('board', board)
      if (board) {
        console.log(board)
        setItems(board.items_page.items || [])
      }
    } catch (err) {
      console.error("Failed to load items", err)
      toast.error("Failed to load paint schedule items. Please refresh the page.")
    }
  }

  const calculatePaintRequirements = useCallback(() => {
    const requirements: Record<string, Record<string | number, number>> = {}

    console.log(weeklySchedules)

    selectedDates.forEach(date => {
      const selectedDay = format(date, 'EEEE')
      console.log('selected day', selectedDates)
      const weekKey = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      console.log('weekkey', weekKey)
      const dayItems = (weeklySchedules[weekKey]?.[selectedDay] || [])
        .map(id => items.find(item => item.id === id))
        .filter(Boolean) as Item[]

        console.log('day items', dayItems)

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
              if (!requirements[ItemDesigns.Coastal]) {
                requirements[ItemDesigns.Coastal] = {}
              }
              requirements[ItemDesigns.Coastal][color] = (requirements[ItemDesigns.Coastal][color] || 0) + piecesPerColor
            } else if (design === ItemDesigns.Lawyer && typeof color === 'string') {
              if (!requirements[ItemDesigns.Lawyer]) {
                requirements[ItemDesigns.Lawyer] = {}
              }
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

  const filteredRequirements = Object.entries(paintRequirements).filter(([design, _]) => {
    const matchesDesign = filterDesign === 'all' || design === filterDesign
    const matchesSearch = design.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesDesign && matchesSearch
  })

  const totalPieces = filteredRequirements.reduce((total, [_, colorRequirements]) => {
    return total + Object.values(colorRequirements).reduce((sum, pieces) => sum + pieces, 0)
  }, 0)

  const toggleDateSelection = (date: Date) => {
    setSelectedDates(prev => {
      const dateString = format(date, 'yyyy-MM-dd')
      if (prev.some(d => format(d, 'yyyy-MM-dd') === dateString)) {
        return prev.filter(d => format(d, 'yyyy-MM-dd') !== dateString)
      } 
      return [...prev, date]
    })
  }

  return (
    <div className={cn(
      "container mx-auto py-4 min-h-screen flex flex-col",
      isMobile ? "px-2" : "px-4"
    )}>
      {/* Header */}
      <div className={cn("flex items-center mb-4", isMobile ? "justify-between" : "justify-start")}>
      <h1 className={cn("font-bold", isMobile ? "text-2xl" : "text-3xl")}>Paint Schedule</h1>
      {isMobile && (
        <Button size="icon" variant="outline" onClick={onFilterToggle}>
          <Menu className="h-4 w-4" />
        </Button>
      )}
    </div>
      
      {/* Filters */}
      {!isMobile ? (
        <Filters 
          filterDesign={filterDesign}
          setFilterDesign={setFilterDesign}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          paintRequirements={paintRequirements}
          isMobile={isMobile}
        />
      ) : (
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <div className="mb-4">
              <Filters 
                filterDesign={filterDesign}
                setFilterDesign={setFilterDesign}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                paintRequirements={paintRequirements}
                isMobile={isMobile}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Week Selector (Visible on Mobile) */}
      {isMobile && (
        <div className="mb-4">
          <WeekSelector currentWeekStart={currentWeekStart} onChangeWeek={changeWeek} />
        </div>
      )}

      {/* Week View */}
      <WeekView 
        currentWeekStart={currentWeekStart} 
        weeklySchedules={weeklySchedules} 
        selectedDates={selectedDates} 
        toggleDateSelection={toggleDateSelection} 
        isMobile={isMobile} 
      />
      
      {/* Summary and Tabs */}
      <SummaryTabs 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalPieces={totalPieces}
        filteredRequirements={filteredRequirements}
        filteredRequirementsLength={filteredRequirements.length}
        selectedDatesLength={selectedDates.length}
        isMobile={isMobile}
      />
    </div>
  )
}
