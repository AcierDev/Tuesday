"use client"

import { useState, useRef, useEffect } from 'react'
import { WeekSelector } from "@/components/weekly-schedule/WeekSelector"
import { Button } from "@/components/ui/button"
import { RefreshCw, LayoutGrid, Calendar as CalendarIcon, Maximize2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { ItemGroupPreview } from "../orders/ItemGroupPreview"
import { WeeklySchedules } from "@/components/weekly-schedule/UseWeeklySchedule"
import { WeekView } from "@/components/shared/WeekView"
import { CalendarView } from "@/components/shared/CalendarView"
import { Board, ColumnTitles, Group, Item } from '@/typings/types'
import { cn } from '@/utils/functions'

type SchedulePageLayoutProps = {
  title: string
  isMobile: boolean
  currentWeekStart: Date
  changeWeek: (direction: 'prev' | 'next') => void
  resetToCurrentWeek: () => void
  renderFilters: () => React.ReactNode
  tabs: {
    value: string
    label: string
    content: React.ReactNode
  }[]
  activeTab: string
  setActiveTab: (tab: string) => void
  hasDataInPreviousWeek: boolean
  hasDataInNextWeek: boolean
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6
  isCurrentWeek: boolean
  group: Group
  board: Board
  updateItem: (updatedItem: Item, changedField: ColumnTitles) => Promise<void>
  selectedDates: Date[]
  schedule: WeeklySchedules
  toggleDateSelection: (date: Date) => void
}

export function SchedulePageLayout({ 
  title, 
  isMobile, 
  currentWeekStart,
  changeWeek, 
  resetToCurrentWeek,
  renderFilters, 
  tabs,
  activeTab,
  setActiveTab,
  hasDataInPreviousWeek,
  hasDataInNextWeek,
  weekStartsOn,
  isCurrentWeek,
  group,
  board,
  updateItem,
  selectedDates,
  schedule,
  toggleDateSelection
}: SchedulePageLayoutProps) {
  const [viewMode, setViewMode] = useState<'week' | 'calendar'>('week')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)
  const tabsCardRef = useRef<HTMLDivElement>(null)
  const fullscreenRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const adjustTabsCardHeight = () => {
      if (calendarRef.current && tabsCardRef.current) {
        const calendarHeight = calendarRef.current.offsetHeight
        tabsCardRef.current.style.maxHeight = `${calendarHeight}px`
      }
    }

    adjustTabsCardHeight()
    window.addEventListener('resize', adjustTabsCardHeight)

    return () => {
      window.removeEventListener('resize', adjustTabsCardHeight)
    }
  }, [viewMode])

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (fullscreenRef.current?.requestFullscreen) {
        fullscreenRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const renderWeekView = () => (
    <WeekView
      currentWeekStart={currentWeekStart}
      selectedDates={selectedDates}
      schedule={schedule}
      toggleDateSelection={toggleDateSelection}
      isMobile={isMobile}
    />
  )

  const renderCalendarView = () => (
    <div ref={calendarRef}>
      <CalendarView
        currentDate={currentWeekStart}
        selectedDates={selectedDates}
        schedule={schedule}
        toggleDateSelection={toggleDateSelection}
      />
    </div>
  )

  const renderTabs = () => (
    <Card 
      ref={fullscreenRef} 
      className={cn(
        "flex-shrink-0 overflow-hidden shadow-lg h-full",
        "dark:bg-gray-900 dark:text-gray-200",
        isFullscreen ? "fixed inset-0 z-50" : viewMode === 'week' ? "w-full" : "w-full"
      )}
    >
      <Tabs className="h-full flex flex-col" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full p-0 bg-muted dark:bg-gray-800">
          <div className="flex-grow grid grid-cols-2">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.value}
                value={tab.value} 
                className={cn(
                  "flex-1 py-2 px-4 rounded-none",
                  "data-[state=active]:bg-background data-[state=active]:shadow-[inset_0_-2px_0_0_var(--tw-shadow-color)]",
                  "shadow-primary",
                  "transition-all duration-200 ease-in-out",
                  "dark:text-gray-200 dark:data-[state=active]:bg-gray-800",
                  isMobile ? "text-sm" : "text-base"
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="ml-auto px-2 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </TabsList>
        <div className="flex-grow overflow-auto">
          {tabs.map((tab) => (
            <TabsContent key={tab.value} className="h-full mt-0 p-4 flex-grow" value={tab.value}>
              {tab.content}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </Card>
  )

  return (
    <div className={cn(
      "container mx-auto py-4 min-h-screen flex flex-col",
      "dark:bg-gray-900 dark:text-gray-200",
      isMobile ? "px-2" : "px-4"
    )}>
      <div className={cn(
        "flex items-center mb-4",
        isMobile ? "justify-between" : "justify-start"
      )}>
        <h1 className={cn(
          "font-bold",
          isMobile ? "text-2xl" : "text-3xl"
        )}>{title}</h1>
        {isMobile && renderFilters()}
      </div>

      {!isMobile && (
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-grow">{renderFilters()}</div>
          <div className="flex items-center space-x-2">
            <WeekSelector 
              currentWeekStart={currentWeekStart} 
              onChangeWeek={changeWeek}
              hasDataInPreviousWeek={hasDataInPreviousWeek}
              hasDataInNextWeek={hasDataInNextWeek}
              weekStartsOn={weekStartsOn}
            />
            {!isCurrentWeek && (
              <Button
                variant="outline"
                size="icon"
                onClick={resetToCurrentWeek}
                aria-label="Reset to current week"
                className="dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {isMobile && (
        <div className="mb-4 flex items-center space-x-2">
          <WeekSelector 
            currentWeekStart={currentWeekStart} 
            onChangeWeek={changeWeek}
            hasDataInPreviousWeek={hasDataInPreviousWeek}
            hasDataInNextWeek={hasDataInNextWeek}
            weekStartsOn={weekStartsOn}
          />
          {!isCurrentWeek && (
            <Button
              variant="outline"
              size="icon"
              onClick={resetToCurrentWeek}
              aria-label="Reset to current week"
              className="dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      <div className="flex justify-center space-x-2 mb-4">
        <Button
          variant={viewMode === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('week')}
          className="dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <LayoutGrid className="h-4 w-4 mr-2" />
          Week
        </Button>
        <Button
          variant={viewMode === 'calendar' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('calendar')}
          className="dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <CalendarIcon className="h-4 w-4 mr-2" />
          Calendar
        </Button>
      </div>

      <div className="flex flex-col space-y-6 flex-grow">
        {viewMode === 'week' ? (
          <>
            {renderWeekView()}
            <ItemGroupPreview group={group} board={board} updateItem={updateItem} />
            <div className="flex-grow">
              {renderTabs()}
            </div>
          </>
        ) : (
          <>
            <div className={cn(
              "flex flex-col lg:flex-row gap-4",
              "lg:space-x-4 flex-grow"
            )}>
              <div className="flex-grow lg:w-2/3">
                {renderCalendarView()}
              </div>
              <div ref={tabsCardRef} className="flex-shrink-0 lg:w-5/12 overflow-hidden flex flex-col">
                {renderTabs()}
              </div>
            </div>
            <ItemGroupPreview group={group} board={board} updateItem={updateItem} />
          </>
        )}
      </div>
    </div>
  )
}