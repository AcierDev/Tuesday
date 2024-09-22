// components/CustomTableCell.tsx
"use client"

import { format, parseISO } from 'date-fns'
import { CalendarIcon, StarIcon, StickyNoteIcon, XCircleIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { automatron } from '../../config/automatron'
import { boardConfig } from '../../config/boardconfig'
import { useOrderSettings } from '../../contexts/OrderSettingsContext'
import { type Board, ColumnTitles, ColumnTypes, type ColumnValue, type Item, type ProgressStatus } from '../../typings/types'
import { getDueBadge } from '../../utils/functions'
import { parseMinecraftColors } from '../../utils/parseMinecraftColors' // Import the parser

interface CustomTableCellProps {
  item: Item
  columnValue: ColumnValue
  board: Board
  onUpdate: (item: Item) => Promise<void>
  isNameColumn?: boolean
}

export const CustomTableCell = ({ item, columnValue, board, onUpdate, isNameColumn = false }: CustomTableCellProps) => {
  const [inputValue, setInputValue] = useState(columnValue.text || "")
  const [notesValue, setNotesValue] = useState(columnValue.text || "")
  const [ratingValue, setRatingValue] = useState(Number(columnValue.text) || 0)
  const { settings } = useOrderSettings()
  const [isOpen, setIsOpen] = useState(false)
const [date, setDate] = useState<Date | undefined>(undefined)

useEffect(() => {
  if (columnValue.text) {
    setDate(parseISO(columnValue.text))
  }
}, [columnValue.text])

  const handleUpdate = useCallback(async (newValue: string) => {
    try {
      const updatedItem = {
        ...item,
        values: item.values.map(value => 
          value.columnName === columnValue.columnName
            ? { ...value, text: newValue }
            : value
        )
      }
      await onUpdate(updatedItem)
      toast.success("Value updated successfully", {
        style: { background: '#10B981', color: 'white' }
      })
    } catch (err) {
      console.error("Failed to update ColumnValue", err)
      toast.error("Failed to update the value. Please try again.", {
        style: { background: '#EF4444', color: 'white' }
      })
    }
  }, [item, columnValue, onUpdate])

  const handleAutomatron = useCallback(async (option: ProgressStatus) => {
    const newStatus = automatron[columnValue.columnName]?.[option]
    if (newStatus && item.status !== newStatus) {
      try {
        const updatedItem = { ...item, status: newStatus }
        await onUpdate(updatedItem)
        toast.success(`${item.values[0]?.text} moved from "${item.status}" to "${newStatus}"`, {
          style: { background: '#10B981', color: 'white' },
          action: {
            label: 'Undo',
            onClick: () => onUpdate({ ...item, status: item.status })
          }
        })
      } catch (err) {
        console.error("Failed to update status", err)
        toast.error("Failed to update the status. Please try again.", {
          style: { background: '#EF4444', color: 'white' }
        })
      }
    }
  }, [item, columnValue, onUpdate])

  const handleInputBlur = useCallback(() => {
    if (inputValue !== columnValue.text) {
      handleUpdate(inputValue)
    }
  }, [inputValue, columnValue.text, handleUpdate])

  const handleNotesUpdate = useCallback(() => {
    if (notesValue !== columnValue.text) {
      handleUpdate(notesValue)
    }
  }, [notesValue, columnValue.text, handleUpdate])

  const handleRatingUpdate = useCallback((newRating: number) => {
    setRatingValue(newRating)
    handleUpdate(newRating.toString())
  }, [handleUpdate])

  const cellContent = () => {
    switch (columnValue.type) {
      case ColumnTypes.Dropdown:
        return (
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild onClick={() => setIsOpen(true)} onPointerDown={(e) => e.preventDefault()}>
              <Button 
                className="w-full h-full justify-center p-2" 
                variant="ghost"
              >
                {columnValue.text || "⠀"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {boardConfig.columns[columnValue.columnName].options?.map((option: string) => (
                <DropdownMenuItem 
                  key={option}
                  onSelect={() => {
                    handleUpdate(option)
                    handleAutomatron(option as ProgressStatus)
                  }}
                >
                  {option}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  handleUpdate("")
                  handleAutomatron("" as ProgressStatus)
                }}
              >
                <XCircleIcon className="mr-2 h-4 w-4" />
                Reset
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      case ColumnTypes.Date:
        return (
          <div className="flex items-center justify-center space-x-2 h-full">
            <Popover>
              <PopoverTrigger asChild>
                <Button className="w-full h-full justify-center p-2" variant="ghost">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? (
  <span>{format(date, "MM/dd/yyyy")}</span>
) : (
  <span className="text-muted-foreground">Pick a date</span>
)}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  initialFocus
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    setDate(newDate)
                    if (newDate) {
                      handleUpdate(newDate.toISOString())
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
            {date ? getDueBadge(date.toISOString(), settings.dueBadgeDays) : null}
          </div>
        )
      case ColumnTypes.Number:
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button className="w-full h-full justify-center p-2" variant="ghost">
                <StarIcon className="mr-2 h-4 w-4" />
                {ratingValue || 'Rate'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium text-center">Set Rating</h4>
                <Slider
                  max={10}
                  step={1}
                  value={[ratingValue]}
                  onValueChange={(value) => handleRatingUpdate(value[0])}
                />
                <div className="text-center font-bold text-2xl">{ratingValue}</div>
              </div>
            </PopoverContent>
          </Popover>
        )
      case ColumnTypes.Text:
        if (columnValue.columnName === 'Notes') {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button className="w-8 h-8 p-0" variant="ghost">
                        <StickyNoteIcon className={`h-4 w-4 ${notesValue ? 'text-yellow-500' : 'text-gray-500'}`} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-2">
                        <h4 className="font-medium">Notes</h4>
                        <Textarea
                          placeholder="Add your notes here..."
                          rows={4}
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                        />
                        <div className="flex justify-end">
                          <Button onClick={handleNotesUpdate}>Save</Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{notesValue ? notesValue.substring(0, 50) + (notesValue.length > 50 ? '...' : '') : 'No notes'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        }
        if (isNameColumn) {
          return (
            <div className="flex items-center justify-center w-full h-full relative">
              <div className="flex items-center space-x-2 w-full">
                <Input
                  className="font-medium border-0 p-2 bg-transparent w-full text-center text-transparent caret-black" // Make text transparent
                  value={inputValue}
                  onBlur={handleInputBlur}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                {item.vertical ? (
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 whitespace-nowrap">
                    Vertical
                  </Badge>
                ) : null}
              </div>
              {/* Render the colored text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="whitespace-pre-wrap">
                  {parseMinecraftColors(inputValue)}
                </span>
              </div>
            </div>
          )
        }
        return (
          <Input
            className="border-0 p-2 bg-transparent text-center h-full w-full"
            value={inputValue}
            onBlur={handleInputBlur}
            onChange={(e) => setInputValue(e.target.value)}
          />
        )
      default:
        return (
          <Input
            className="border-0 p-2 bg-transparent text-center h-full w-full"
            value={inputValue}
            onBlur={handleInputBlur}
            onChange={(e) => setInputValue(e.target.value)}
          />
        )
    }
  }

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {cellContent()}
    </div>
  )
}
