// File: Filters.tsx

import { addDays, format } from "date-fns"
import { ChevronLeft, ChevronRight, Menu, Search } from "lucide-react"
import React from 'react'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/utils/functions"


interface FiltersProps {
  filterSize: string
  setFilterSize: (size: string) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  boxRequirements: Record<string, number>
  isMobile: boolean
  currentWeekStart?: Date
  changeWeek?: (direction: 'prev' | 'next') => void
}

const Filters: React.FC<FiltersProps> = ({
  filterSize,
  setFilterSize,
  searchTerm,
  setSearchTerm,
  boxRequirements,
  isMobile,
  currentWeekStart,
  changeWeek
}) => {
  if (isMobile && changeWeek && currentWeekStart) {
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
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <Select value={filterSize} onValueChange={setFilterSize}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sizes</SelectItem>
                {Object.keys(boxRequirements).map(color => (
                  <SelectItem key={color} value={color}>{color}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-10 pr-4 py-2 w-full"
                placeholder="Search box colors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
          {Object.keys(boxRequirements).map(color => (
            <SelectItem key={color} value={color}>{color}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative flex-grow">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          className="pl-10 pr-4 py-2 w-full"
          placeholder="Search box colors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {changeWeek && currentWeekStart ? <Popover>
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
        </Popover> : null}
    </div>
  )
}

export default Filters
