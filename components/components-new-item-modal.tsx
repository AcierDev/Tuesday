"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { CalendarIcon, ChevronDown, ChevronUp, X, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Item, ItemDesigns, ItemSizes, ColumnTitles, ColumnTypes } from '../app/typings/types'

interface NewItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (newItem: Partial<Item>) => void
}

export function NewItemModal({ isOpen, onClose, onSubmit }: NewItemModalProps) {
  const [customerName, setCustomerName] = useState('')
  const [size, setSize] = useState<ItemSizes | ''>('')
  const [design, setDesign] = useState<ItemDesigns | ''>('')
  const [vertical, setVertical] = useState(false)
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [showOptionalFields, setShowOptionalFields] = useState(false)
  const [optionalFields, setOptionalFields] = useState<Partial<Item>>({})
  const [showCalendar, setShowCalendar] = useState(false)

  const handleSubmit = () => {
    if (!customerName || !size || !design) {
      alert('Please fill in all required fields')
      return
    }

    const newItem: Partial<Item> = {
      values: [
        { columnName: ColumnTitles.Customer_Name, type: ColumnTypes.Text, text: customerName },
        { columnName: ColumnTitles.Size, type: ColumnTypes.Dropdown, text: size },
        { columnName: ColumnTitles.Design, type: ColumnTypes.Dropdown, text: design },
        { columnName: ColumnTitles.Vertical, type: ColumnTypes.Text, text: vertical ? 'Yes' : 'No' },
        ...(dueDate ? [{ columnName: ColumnTitles.Due, type: ColumnTypes.Date, text: format(dueDate, 'yyyy-MM-dd') }] : []),
      ],
      ...optionalFields,
    }

    onSubmit(newItem)
    onClose()
  }

  const handleOptionalFieldChange = (columnName: ColumnTitles, value: string) => {
    setOptionalFields(prev => ({
      ...prev,
      values: [
        ...(prev.values || []),
        { columnName, type: ColumnTypes.Text, text: value }
      ]
    }))
  }

  const handleDateSelect = (date: Date | undefined) => {
    setDueDate(date)
    setShowCalendar(false)
  }

  const resetForm = () => {
    setCustomerName('')
    setSize('')
    setDesign('')
    setVertical(false)
    setDueDate(undefined)
    setShowOptionalFields(false)
    setOptionalFields({})
    setShowCalendar(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <DialogTitle>Create New Item</DialogTitle>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customerName" className="text-right">
                Customer Name
              </Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="size" className="text-right">
                Size
              </Label>
              <Select value={size} onValueChange={(value) => setSize(value as ItemSizes)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ItemSizes).map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="design" className="text-right">
                Design
              </Label>
              <Select value={design} onValueChange={(value) => setDesign(value as ItemDesigns)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select design" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ItemDesigns).map((design) => (
                    <SelectItem key={design} value={design}>
                      {design}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vertical" className="text-right">
                Vertical
              </Label>
              <Switch
                id="vertical"
                checked={vertical}
                onCheckedChange={setVertical}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">
                Due Date
              </Label>
              <div className="col-span-3">
                <Button
                  type="button"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                  onClick={() => setShowCalendar(!showCalendar)}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </div>
            </div>
            {showCalendar && (
              <div className="col-span-4">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={handleDateSelect}
                  className="rounded-md border"
                />
              </div>
            )}
          </div>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowOptionalFields(!showOptionalFields)}
              className="w-full"
            >
              {showOptionalFields ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  Hide Optional Fields
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Show Optional Fields
                </>
              )}
            </Button>
          </div>
          {showOptionalFields && (
            <div className="grid gap-4 py-4">
              {Object.values(ColumnTitles).filter(title => 
                !['Customer Name', 'Size', 'Design', 'Due Date'].includes(title)
              ).map(title => (
                <div key={title} className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor={title} className="text-right">
                    {title}
                  </Label>
                  <Input
                    id={title}
                    value={optionalFields.values?.find(v => v.columnName === title)?.text || ''}
                    onChange={(e) => handleOptionalFieldChange(title, e.target.value)}
                    className="col-span-3"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="sticky bottom-0 bg-white z-10 px-6 py-4 border-t">
          <Button type="submit" onClick={handleSubmit}>Create Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}