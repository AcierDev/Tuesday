"use client"

import { useState, useCallback } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from 'sonner'
import { Calendar } from "@/components/ui/calendar"
import { Item, ColumnValue, ColumnTypes, ProgressStatus, Board } from '../app/typings/types'
import { boardConfig } from '../app/config/boardconfig'
import { automatron } from '../app/config/automatron'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, addDays } from 'date-fns'
import { Badge } from "@/components/ui/badge"
import { getDueBadge, getCellClassName } from '../app/utils/functions'
import { useOrderSettings } from './contexts-order-settings-context'

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
  const { settings } = useOrderSettings()

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
        toast.success(`${item.values[0].text} moved from "${item.status}" to "${newStatus}"`, {
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

  switch (columnValue.type) {
    case ColumnTypes.Dropdown:
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className={`w-full justify-start p-2 ${getCellClassName(columnValue)}`}
            >
              {columnValue.text || "Select"}
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
          </DropdownMenuContent>
        </DropdownMenu>
      )
    case ColumnTypes.Date:
      return (
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2">
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
    case ColumnTypes.Text:
    default:
      return (
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleInputBlur}
          className={`${isNameColumn ? "font-medium" : ""} border-0 p-2 bg-transparent`}
        />
      )
  }
}