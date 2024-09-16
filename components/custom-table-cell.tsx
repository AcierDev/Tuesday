"use client"

import { useState, useCallback } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CalendarIcon, StickyNoteIcon, StarIcon, XCircleIcon } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { toast } from 'sonner'
import { Calendar } from "@/components/ui/calendar"
import { Item, ColumnValue, ColumnTypes, ProgressStatus, Board, ColumnTitles } from '../app/typings/types'
import { boardConfig } from '../app/config/boardconfig'
import { automatron } from '../app/config/automatron'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from 'date-fns'
import { getDueBadge } from '../app/utils/functions'
import { useOrderSettings } from './contexts-order-settings-context'
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"

interface CustomTableCellProps {
  item: Item
  columnValue: ColumnValue
  board: Board
  onUpdate: (itemId: string, columnName: string, newValue: string) => Promise<void>
  isNameColumn?: boolean
}

export function CustomTableCell({ item, columnValue, board, onUpdate, isNameColumn = false }: CustomTableCellProps) {
  const [date, setDate] = useState<Date | undefined>(columnValue.text ? new Date(columnValue.text) : undefined)
  const [inputValue, setInputValue] = useState(columnValue.text || "")
  const [notesValue, setNotesValue] = useState(columnValue.text || "")
  const [ratingValue, setRatingValue] = useState(Number(columnValue.text) || 0)
  const { settings } = useOrderSettings()
  const [isOpen, setIsOpen] = useState(false)

  const handleUpdate = useCallback(async (newValue: string) => {
    try {
      await onUpdate(item.id, columnValue.columnName, newValue)
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
        await onUpdate(item.id, 'status', newStatus)
        toast.success(`${item.values[0]?.text} moved from "${item.status}" to "${newStatus}"`, {
          style: { background: '#10B981', color: 'white' },
          action: {
            label: 'Undo',
            onClick: () => onUpdate(item.id, 'status', item.status)
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
            <DropdownMenuTrigger asChild onPointerDown={(e) => e.preventDefault()} onClick={() => setIsOpen(true)}>
              <Button 
                variant="ghost" 
                className="w-full h-full justify-center p-2"
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
                <Button variant="ghost" className="w-full h-full justify-center p-2">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? (
                    <span>{format(date, "MM/dd/yyyy")}</span>
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    setDate(newDate)
                    if (newDate) {
                      handleUpdate(newDate.toISOString())
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {date && getDueBadge(date.toISOString(), settings.dueBadgeDays)}
          </div>
        )
      case ColumnTypes.Number:
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="w-full h-full justify-center p-2">
                <StarIcon className="mr-2 h-4 w-4" />
                {ratingValue || 'Rate'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium text-center">Set Rating</h4>
                <Slider
                  value={[ratingValue]}
                  onValueChange={(value) => handleRatingUpdate(value[0])}
                  max={10}
                  step={1}
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
                      <Button variant="ghost" className="w-8 h-8 p-0">
                        <StickyNoteIcon className={`h-4 w-4 ${notesValue ? 'text-yellow-500' : 'text-gray-500'}`} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-2">
                        <h4 className="font-medium">Notes</h4>
                        <Textarea
                          placeholder="Add your notes here..."
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          rows={4}
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
          const isVertical = item.values.find(v => v.columnName === ColumnTitles.Vertical)?.text === 'true'
          return (
            <div className="flex items-center justify-center w-full h-full">
              <div className="flex items-center space-x-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onBlur={handleInputBlur}
                  className="font-medium border-0 p-2 bg-transparent text-center"
                />
                {isVertical && (
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                    Vertical
                  </Badge>
                )}
              </div>
            </div>
          )
        }
        return (
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleInputBlur}
            className="border-0 p-2 bg-transparent text-center h-full"
          />
        )
      default:
        return (
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleInputBlur}
            className="border-0 p-2 bg-transparent text-center h-full"
          />
        )
    }
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      {cellContent()}
    </div>
  )
}