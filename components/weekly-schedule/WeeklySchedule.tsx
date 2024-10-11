'use client'

import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { GripVertical, Minus, Plus, Check, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRealmApp } from '@/hooks/useRealmApp'
import { ColumnTitles, type Item, ItemStatus } from '@/typings/types'

type DaySchedule = Record<string, string[]>;
type WeeklySchedules = Record<string, DaySchedule>;

interface WeeklyScheduleProps {
  items: Item[]
  boardId: string
}

export function WeeklySchedule({ items, boardId }: WeeklyScheduleProps) {
  const { boardCollection: collection } = useRealmApp()
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedules>({})
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [currentDay, setCurrentDay] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDesign, setFilterDesign] = useState('all')
  const [filterSize, setFilterSize] = useState('all')
  const [confirmCompleteItem, setConfirmCompleteItem] = useState<Item | null>(null)

  const loadSchedules = useCallback(async () => {
    if (!collection) return

    try {
      const board = await collection.findOne({ id: boardId })
      if (board?.weeklySchedules) {
        setWeeklySchedules(board.weeklySchedules)
        const currentWeekKey = format(currentWeekStart, 'yyyy-MM-dd')
        if (!board.weeklySchedules[currentWeekKey]) {
          createNewWeek(currentWeekStart)
        }
      } else {
        createNewWeek(currentWeekStart)
      }
    } catch (err) {
      console.error("Failed to load weekly schedules", err)
      toast.error("Failed to load weekly schedules. Please refresh the page.")
    }
  }, [collection, boardId, currentWeekStart])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  const createNewWeek = useCallback((weekStart: Date) => {
    const adjustedWeekStart = startOfWeek(weekStart, { weekStartsOn: 0 })
    const weekKey = format(adjustedWeekStart, 'yyyy-MM-dd')
    setWeeklySchedules(prev => ({
      ...prev,
      [weekKey]: {
        Sunday: [],
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
      }
    }))
    setCurrentWeekStart(adjustedWeekStart)
  }, [])

  const saveSchedules = useCallback(async (newSchedules: WeeklySchedules) => {
    if (!collection) return

    try {
      await collection.updateOne(
        { id: boardId },
        { $set: { weeklySchedules: newSchedules } }
      )
      console.log("Weekly schedules saved successfully")
    } catch (err) {
      console.error("Failed to save weekly schedules", err)
      toast.error("Failed to save weekly schedules. Please try again.")
    }
  }, [collection, boardId])

  const handleAddItem = useCallback((day: string) => {
    setCurrentDay(day)
    setIsAddingItem(true)
  }, [])

  const handleQuickAdd = useCallback(async (day: string, item: Item) => {
    const weekKey = format(currentWeekStart, 'yyyy-MM-dd')
    const newSchedules = {
      ...weeklySchedules,
      [weekKey]: {
        ...weeklySchedules[weekKey],
        [day]: [...(weeklySchedules[weekKey]?.[day] || []), item.id]
      }
    }
    setWeeklySchedules(newSchedules)
    await saveSchedules(newSchedules)
    
    if (collection) {
      await collection.updateOne(
        { id: boardId },
        { $set: { "items_page.items.$[elem].isScheduled": true } },
        { arrayFilters: [{ "elem.id": item.id }] }
      )
    }
  }, [weeklySchedules, currentWeekStart, saveSchedules, collection, boardId])

  const handleRemoveItem = useCallback(async (day: string, itemId: string) => {
    const weekKey = format(currentWeekStart, 'yyyy-MM-dd')
    const newSchedules = {
      ...weeklySchedules,
      [weekKey]: {
        ...weeklySchedules[weekKey],
        [day]: weeklySchedules[weekKey][day].filter(id => id !== itemId)
      }
    }
    setWeeklySchedules(newSchedules)
    await saveSchedules(newSchedules)
    
    if (collection) {
      await collection.updateOne(
        { id: boardId },
        { $set: { "items_page.items.$[elem].isScheduled": false } },
        { arrayFilters: [{ "elem.id": itemId }] }
      )
    }
  }, [weeklySchedules, currentWeekStart, saveSchedules, collection, boardId])

  const handleDragEnd = useCallback(async (result: any) => {
    if (!result.destination) return

    const { source, destination } = result
    const sourceDay = source.droppableId
    const destDay = destination.droppableId

    const weekKey = format(currentWeekStart, 'yyyy-MM-dd')
    const newSchedules = { ...weeklySchedules }
    const [movedItemId] = newSchedules[weekKey][sourceDay].splice(source.index, 1)
    newSchedules[weekKey][destDay].splice(destination.index, 0, movedItemId)

    setWeeklySchedules(newSchedules)
    await saveSchedules(newSchedules)
  }, [weeklySchedules, currentWeekStart, saveSchedules])

  const handleMarkAsCompleted = useCallback(async (item: Item) => {
    if (!collection) return

    try {
      await collection.updateOne(
        { id: boardId },
        { 
          $set: { 
            "items_page.items.$[elem].status": ItemStatus.Done,
            "items_page.items.$[elem].completedAt": Date.now()
          } 
        },
        { arrayFilters: [{ "elem.id": item.id }] }
      )

      toast.success("Item marked as completed")
    } catch (err) {
      console.error("Failed to mark item as completed", err)
      toast.error("Failed to mark item as completed. Please try again.")
    } finally {
      setConfirmCompleteItem(null)
    }
  }, [collection, boardId])

  const getItemValue = useCallback((item: Item, columnName: ColumnTitles): string => {
    return item.values.find(v => v.columnName === columnName)?.text || ''
  }, [])

  const designs = useMemo(() => [...new Set(items.map(item => getItemValue(item, ColumnTitles.Design)))], [items, getItemValue])
  const sizes = useMemo(() => [...new Set(items.map(item => getItemValue(item, ColumnTitles.Size)))], [items, getItemValue])

  const weekKey = format(currentWeekStart, 'yyyy-MM-dd')
  const filteredItems = useMemo(() => items.filter(item => 
    !item.isScheduled &&
    !Object.values(weeklySchedules[weekKey] || {}).flat().includes(item.id) &&
    getItemValue(item, ColumnTitles.Customer_Name).toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterDesign === 'all' || getItemValue(item, ColumnTitles.Design) === filterDesign) &&
    (filterSize === 'all' || getItemValue(item, ColumnTitles.Size) === filterSize) &&
    item.status !== ItemStatus.Done
  ), [items, weeklySchedules, weekKey, searchTerm, filterDesign, filterSize, getItemValue])

  const changeWeek = useCallback((direction: 'prev' | 'next') => {
    const newWeekStart = direction === 'prev' 
      ? subWeeks(currentWeekStart, 1)
      : addWeeks(currentWeekStart, 1)
    setCurrentWeekStart(newWeekStart)
    if (!weeklySchedules[format(newWeekStart, 'yyyy-MM-dd')]) {
      createNewWeek(newWeekStart)
    }
  }, [currentWeekStart, weeklySchedules, createNewWeek])

  const calculateTotalSquares = useCallback((dayItemIds: string[]) => {
    return dayItemIds.reduce((total, itemId) => {
      const item = items.find(i => i.id === itemId)
      if (item) {
        const size = getItemValue(item, ColumnTitles.Size)
        const [width, height] = size.split('x').map(Number)
        return total + (width * height)
      }
      return total
    }, 0)
  }, [items, getItemValue])

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="p-4 bg-white dark:bg-gray-800 shadow-md">
        <h2 className="text-2xl font-bold mb-2">Weekly Planner</h2>
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => changeWeek('prev')}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
          </Button>
          <span className="text-lg font-semibold">
            {format(currentWeekStart, 'MMM d')} - {format(addWeeks(currentWeekStart, 1), 'MMM d, yyyy')}
          </span>
          <Button variant="outline" size="sm" onClick={() => changeWeek('next')}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-grow overflow-hidden">
          <div className="flex h-full">
            {Object.entries(weeklySchedules[weekKey] || {}).map(([day, dayItemIds]) => (
              <DayColumn
                key={day}
                day={day}
                dayItemIds={dayItemIds}
                items={items}
                calculateTotalSquares={calculateTotalSquares}
                handleAddItem={handleAddItem}
                handleRemoveItem={handleRemoveItem}
                setConfirmCompleteItem={setConfirmCompleteItem}
                getItemValue={getItemValue}
              />
            ))}
          </div>
        </div>
      </DragDropContext>
      
      <AddItemDialog
        isOpen={isAddingItem}
        onClose={() => setIsAddingItem(false)}
        currentDay={currentDay}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterDesign={filterDesign}
        setFilterDesign={setFilterDesign}
        filterSize={filterSize}
        setFilterSize={setFilterSize}
        designs={designs}
        sizes={sizes}
        filteredItems={filteredItems}
        handleQuickAdd={handleQuickAdd}
        getItemValue={getItemValue}
      />

      <ConfirmCompletionDialog
        isOpen={!!confirmCompleteItem}
        onClose={() => setConfirmCompleteItem(null)}
        item={confirmCompleteItem}
        handleMarkAsCompleted={handleMarkAsCompleted}
        getItemValue={getItemValue}
      />
    </div>
  )
}

interface DayColumnProps {
  day: string
  dayItemIds: string[]
  items: Item[]
  calculateTotalSquares: (dayItemIds: string[]) => number
  handleAddItem: (day: string) => void
  handleRemoveItem: (day: string, itemId: string) => void
  setConfirmCompleteItem: (item: Item | null) => void
  getItemValue: (item: Item, columnName: ColumnTitles) => string
}

function DayColumn({
  day,
  dayItemIds,
  items,
  calculateTotalSquares,
  handleAddItem,
  handleRemoveItem,
  setConfirmCompleteItem,
  getItemValue
}: DayColumnProps) {
  return (
    <Card className="flex-1 flex flex-col m-1 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      <CardHeader className="py-2 px-3 bg-gray-50 dark:bg-gray-700">
        <CardTitle className="text-sm flex justify-between items-center">
          <span>{day}</span>
          <span className="text-xs font-normal">
            Squares: {calculateTotalSquares(dayItemIds)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-2 overflow-y-auto">
        <Droppable droppableId={day}>
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 min-h-full">
              {dayItemIds.map((itemId, index) => {
                const item = items.find(i => i.id === itemId)
                if (!item) return null
                return (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="p-2 bg-gray-50 dark:bg-gray-700 rounded-md shadow-sm hover:shadow-md transition-shadow duration-200 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          
                          <GripVertical className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                          <div className="flex space-x-1">
                            {item.status !== ItemStatus.Done && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmCompleteItem(item)}
                                className="h-6 w-6 p-0"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveItem(day, item.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="font-semibold truncate">{getItemValue(item, ColumnTitles.Customer_Name)}</p>
                        <p className="text-gray-600 dark:text-gray-400 truncate">
                          {getItemValue(item, ColumnTitles.Design)} - {getItemValue(item, ColumnTitles.Size)}
                        </p>
                      </div>
                    )}
                  </Draggable>
                )
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </CardContent>
      <Button 
        className="m-2" 
        size="sm" 
        variant="outline" 
        onClick={() => handleAddItem(day)}
      >
        <Plus className="mr-1 h-3 w-3" /> Add
      </Button>
    </Card>
  )
}

interface AddItemDialogProps {
  isOpen: boolean
  onClose: () => void
  currentDay: string
  searchTerm: string
  setSearchTerm: (term: string) => void
  filterDesign: string
  setFilterDesign: (design: string) => void
  filterSize: string
  setFilterSize: (size: string) => void
  designs: string[]
  sizes: string[]
  filteredItems: Item[]
  handleQuickAdd: (day: string, item: Item) => void
  getItemValue: (item: Item, columnName: ColumnTitles) => string
}

function AddItemDialog({
  isOpen,
  onClose,
  currentDay,
  searchTerm,
  setSearchTerm,
  filterDesign,
  setFilterDesign,
  filterSize,
  setFilterSize,
  designs,
  sizes,
  filteredItems,
  handleQuickAdd,
  getItemValue
}: AddItemDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Item to {currentDay}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              className="flex-grow"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex space-x-2">
            <Select value={filterDesign} onValueChange={setFilterDesign}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by design" />
              </SelectTrigger>
              
              <SelectContent>
                <SelectItem value="all">All Designs</SelectItem>
                {designs.map(design => (
                  <SelectItem key={design} value={design}>{design}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSize} onValueChange={setFilterSize}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sizes</SelectItem>
                {sizes.map(size => (
                  <SelectItem key={size} value={size}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {filteredItems.map(item => (
              <div key={item.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                <div>
                  <p className="font-semibold text-sm">{getItemValue(item, ColumnTitles.Customer_Name)}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {getItemValue(item, ColumnTitles.Design)} - {getItemValue(item, ColumnTitles.Size)}
                  </p>
                </div>
                <Button size="sm" onClick={() => {
                  handleQuickAdd(currentDay, item)
                  onClose()
                }}>
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ConfirmCompletionDialogProps {
  isOpen: boolean
  onClose: () => void
  item: Item | null
  handleMarkAsCompleted: (item: Item) => void
  getItemValue: (item: Item, columnName: ColumnTitles) => string
}

function ConfirmCompletionDialog({
  isOpen,
  onClose,
  item,
  handleMarkAsCompleted,
  getItemValue
}: ConfirmCompletionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Confirm Completion</DialogTitle>
          <DialogDescription>
            Are you sure you want to mark this item as completed?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {item && (
            <div>
              <p className="font-semibold">{getItemValue(item, ColumnTitles.Customer_Name)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getItemValue(item, ColumnTitles.Design)} - {getItemValue(item, ColumnTitles.Size)}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => item && handleMarkAsCompleted(item)}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}