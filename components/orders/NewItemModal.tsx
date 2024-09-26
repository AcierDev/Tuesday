'use client'

import { format } from "date-fns"
import { CalendarIcon, ChevronDown, ChevronUp, Pencil, RotateCcw, X } from "lucide-react"
import { useState } from 'react'

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { boardConfig } from '@/config/boardconfig'
import { cn } from '@/utils/functions'

import { ColumnTitles, ColumnTypes, type Item, ItemDesigns, ItemSizes, ItemStatus, ProgressStatus } from '../../typings/types'

interface NewItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (newItem: Partial<Item>) => void
}

export const NewItemModal = ({ isOpen, onClose, onSubmit }: NewItemModalProps) => {
  const [customerName, setCustomerName] = useState('')
  const [size, setSize] = useState<ItemSizes | ''>('')
  const [design, setDesign] = useState<ItemDesigns | ''>('')
  const [vertical, setVertical] = useState(false)
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [showOptionalFields, setShowOptionalFields] = useState(false)
  const [optionalFields, setOptionalFields] = useState<Record<ColumnTitles, string>>(() => {
    const fields: Record<ColumnTitles, string> = {} as Record<ColumnTitles, string>
    Object.values(ColumnTitles).forEach(title => {
      fields[title] = ''
    })
    return fields
  })
  const [showCalendar, setShowCalendar] = useState(false)
  const [customInputs, setCustomInputs] = useState<Record<ColumnTitles, boolean>>({} as Record<ColumnTitles, boolean>)

  const handleSubmit = () => {
    if (!customerName || !size || !design) {
      alert('Please fill in all required fields')
      return
    }

    const newItem: Partial<Item> = {
      values: Object.entries(ColumnTitles).map(([key, title]) => {
        let value = optionalFields[title]
        let type = boardConfig.columns[title].type || ColumnTypes.Text

        if (title === ColumnTitles.Customer_Name) {
          value = customerName
        } else if (title === ColumnTitles.Size) {
          value = size
          type = ColumnTypes.Dropdown
        } else if (title === ColumnTitles.Design) {
          value = design
          type = ColumnTypes.Dropdown
        } else if (title === ColumnTitles.Due) {
          value = dueDate ? format(dueDate, 'yyyy-MM-dd') : ''
          type = ColumnTypes.Date
        }

        return { columnName: title, type, text: value }
      }),
      status: ItemStatus.New,
      createdAt: Date.now(),
      vertical,
      visible: true,
      deleted: false,
      isScheduled: false,
    }

    onSubmit(newItem)
    onClose()
  }

  const handleOptionalFieldChange = (columnName: ColumnTitles, value: string) => {
    setOptionalFields(prev => ({
      ...prev,
      [columnName]: value
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
    setOptionalFields(prev => {
      const reset = { ...prev }
      Object.keys(reset).forEach(key => {
        reset[key as ColumnTitles] = ''
      })
      return reset
    })
    setShowCalendar(false)
    setCustomInputs({} as Record<ColumnTitles, boolean>)
  }

  const toggleCustomInput = (columnName: ColumnTitles) => {
    setCustomInputs(prev => ({
      ...prev,
      [columnName]: !prev[columnName]
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto p-0 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <DialogTitle>Create New Item</DialogTitle>
            <div className="flex items-center space-x-2">
              <Button size="icon" variant="ghost" onClick={resetForm} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="customerName">
                Customer Name
              </Label>
              <Input
                className="col-span-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="size">
                Size
              </Label>
              {!customInputs[ColumnTitles.Size] ? (
                <div className="col-span-3 flex items-center space-x-2">
                  <Select value={size} onValueChange={(value) => setSize(value as ItemSizes)}>
                    <SelectTrigger className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                      {Object.values(ItemSizes).map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="outline" onClick={() => toggleCustomInput(ColumnTitles.Size)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="col-span-3 flex items-center space-x-2">
                  <Input
                    placeholder="Enter custom size"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <Button size="icon" variant="outline" onClick={() => toggleCustomInput(ColumnTitles.Size)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="design">
                Design
              </Label>
              {!customInputs[ColumnTitles.Design] ? (
                <div className="col-span-3 flex items-center space-x-2">
                  <Select value={design} onValueChange={(value) => setDesign(value as ItemDesigns)}>
                    <SelectTrigger className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                      <SelectValue placeholder="Select design" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                      {Object.values(ItemDesigns).map((design) => (
                        <SelectItem key={design} value={design}>
                          {design}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="outline" onClick={() => toggleCustomInput(ColumnTitles.Design)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="col-span-3 flex items-center space-x-2">
                  <Input
                    placeholder="Enter custom design"
                    value={design}
                    onChange={(e) => setDesign(e.target.value)}
                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <Button size="icon" variant="outline" onClick={() => toggleCustomInput(ColumnTitles.Design)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="vertical">
                Vertical
              </Label>
              <Switch
                checked={vertical}
                className="col-span-3"
                id="vertical"
                onCheckedChange={setVertical}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="dueDate">
                Due Date
              </Label>
              <div className="col-span-3">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100",
                    !dueDate && "text-muted-foreground"
                  )}
                  onClick={() => setShowCalendar(!showCalendar)}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </div>
            </div>
            {showCalendar ? <div className="col-span-4">
                <Calendar
                  className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  mode="single"
                  selected={dueDate}
                  onSelect={handleDateSelect}
                />
              </div> : null}
          </div>
          <div className="mt-4">
            <Button
              className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600"
              variant="outline"
              onClick={() => setShowOptionalFields(!showOptionalFields)}
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
          {showOptionalFields ? <div className="grid gap-4 py-4">
              {Object.values(ColumnTitles).filter(title => 
                !['Customer Name', 'Size', 'Design', 'Due Date'].includes(title)
              ).map(title => {
                const column = boardConfig.columns[title]
                if (column.type === ColumnTypes.Dropdown && column.options) {
                  return (
                    <div key={title} className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right" htmlFor={title}>
                        {title}
                      </Label>
                      {!customInputs[title] ? (
                        <div className="col-span-3 flex items-center space-x-2">
                          <Select 
                            value={optionalFields[title]} 
                            onValueChange={(value) => handleOptionalFieldChange(title, value)}
                          >
                            <SelectTrigger className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                              <SelectValue placeholder={`Select ${title}`} />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                              {column.options.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="outline" onClick={() => toggleCustomInput(title)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="col-span-3 flex items-center space-x-2">
                          <Input
                            placeholder={`Enter custom ${title.toLowerCase()}`}
                            value={optionalFields[title]}
                            onChange={(e) => handleOptionalFieldChange(title, e.target.value)}
                            className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                          <Button size="icon" variant="outline" onClick={() => toggleCustomInput(title)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                } 
                  return (
                    <div key={title} className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right" htmlFor={title}>
                        {title}
                      </Label>
                      <Input
                        className="col-span-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        id={title}
                        value={optionalFields[title]}
                        onChange={(e) => handleOptionalFieldChange(title, e.target.value)}
                      />
                    </div>
                  )
                
              })}
            </div> : null}
        </div>
        <DialogFooter className="sticky bottom-0 bg-white dark:bg-gray-800 z-10 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="submit" onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">Create Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}