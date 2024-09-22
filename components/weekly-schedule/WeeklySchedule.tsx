"use client"

import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { GripVertical, Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { format, addDays, startOfWeek, addWeeks, subWeeks, parseISO } from 'date-fns'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRealmApp } from '@/hooks/useRealmApp'
import { ColumnTitles, type Item, ItemStatus } from '@/typings/types'
import {WeekSelector} from './WeekSelector'

type DaySchedule = Record<string, string[]>;
type WeeklySchedules = Record<string, DaySchedule>;

interface WeeklyScheduleProps {
  items: Item[]
  boardId: string
}

export function WeeklySchedule({ items, boardId }: WeeklyScheduleProps) {
  const { collection } = useRealmApp()
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedules>({})
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [currentDay, setCurrentDay] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDesign, setFilterDesign] = useState('all')
  const [filterSize, setFilterSize] = useState('all')

  useEffect(() => {
    loadSchedules()
  }, [boardId])

  const loadSchedules = async () => {
    if (!collection) return

    try {
      const board = await collection.findOne({ id: boardId })
      if (board?.weeklySchedules) {
        setWeeklySchedules(board.weeklySchedules)
        const latestWeek = Object.keys(board.weeklySchedules).sort().pop()
        if (latestWeek) {
          const parsedDate = parseISO(latestWeek)
          const weekStart = startOfWeek(parsedDate, { weekStartsOn: 0 })
          setCurrentWeekStart(weekStart)
        } else {
          createNewWeek(currentWeekStart)
        }
      } else {
        createNewWeek(currentWeekStart)
      }
    } catch (err) {
      console.error("Failed to load weekly schedules", err)
      toast.error("Failed to load weekly schedules. Please refresh the page.", {
        style: { background: '#EF4444', color: 'white' }
      })
    }
  }

  const createNewWeek = (weekStart: Date) => {
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
  }

  const saveSchedules = async (newSchedules: WeeklySchedules) => {
    if (!collection) return

    try {
      await collection.updateOne(
        { id: boardId },
        { $set: { weeklySchedules: newSchedules } }
      )
      console.log("Weekly schedules saved successfully")
    } catch (err) {
      console.error("Failed to save weekly schedules", err)
      toast.error("Failed to save weekly schedules. Please try again.", {
        style: { background: '#EF4444', color: 'white' }
      })
    }
  }

  const handleAddItem = (day: string) => {
    setCurrentDay(day)
    setIsAddingItem(true)
  }

  const handleQuickAdd = async (day: string, item: Item) => {
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
  }

  const handleRemoveItem = async (day: string, itemId: string) => {
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
  }

  const handleDragEnd = async (result: any) => {
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
  }

  const getItemValue = (item: Item, columnName: ColumnTitles): string => {
    return item.values.find(v => v.columnName === columnName)?.text || ''
  }

  const designs = [...new Set(items.map(item => getItemValue(item, ColumnTitles.Design)))]
  const sizes = [...new Set(items.map(item => getItemValue(item, ColumnTitles.Size)))]

  const weekKey = format(currentWeekStart, 'yyyy-MM-dd')
  const filteredItems = items.filter(item => 
    !Object.values(weeklySchedules[weekKey] || {}).flat().includes(item.id) &&
    getItemValue(item, ColumnTitles.Customer_Name).toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterDesign === 'all' || getItemValue(item, ColumnTitles.Design) === filterDesign) &&
    (filterSize === 'all' || getItemValue(item, ColumnTitles.Size) === filterSize) &&
    item.status !== ItemStatus.Done
  )

  const changeWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = direction === 'prev' 
      ? subWeeks(currentWeekStart, 1)
      : addWeeks(currentWeekStart, 1)
    setCurrentWeekStart(newWeekStart)
    if (!weeklySchedules[format(newWeekStart, 'yyyy-MM-dd')]) {
      createNewWeek(newWeekStart)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4 bg-white">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Weekly Schedule</h2>
        <WeekSelector currentWeekStart={currentWeekStart} onChangeWeek={changeWeek} />
      </div>
      <Card>
        <CardContent className="p-0">
          <DragDropContext onDragEnd={handleDragEnd}>
            {Object.entries(weeklySchedules[weekKey] || {}).map(([day, dayItemIds]) => (
              <Card key={day} className="mb-4 bg-gray-50 shadow-sm rounded-none last:rounded-b">
                <CardHeader className="py-2">
                  <CardTitle className="text-lg">{day}</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <Droppable droppableId={day}>
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef}>
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
                                  className="mb-2 p-2 bg-white rounded shadow-sm flex justify-between items-center"
                                >
                                  <div className="flex items-center">
                                    <GripVertical className="h-5 w-5 mr-2 text-gray-400" />
                                    <div>
                                      <p className="font-semibold">{getItemValue(item, ColumnTitles.Customer_Name)}</p>
                                      <p className="text-sm text-gray-600">
                                        {getItemValue(item, ColumnTitles.Design)} - {getItemValue(item, ColumnTitles.Size)}
                                      </p>
                                    </div>
                                  </div>
                                  <Button size="sm" variant="outline" onClick={() => handleRemoveItem(day, item.id)}>
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </Draggable>
                          )
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                  <Button className="mt-2 w-full" size="sm" variant="outline" onClick={() => handleAddItem(day)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Item
                  </Button>
                </CardContent>
              </Card>
            ))}
          </DragDropContext>
        </CardContent>
      </Card>

      <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Item to {currentDay}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              className="w-full"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
            <div className="max-h-[300px] overflow-y-auto">
              {filteredItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-gray-100 rounded mb-2">
                  <div>
                    <p className="font-semibold">{getItemValue(item, ColumnTitles.Customer_Name)}</p>
                    <p className="text-sm text-gray-600">
                      {getItemValue(item, ColumnTitles.Design)} - {getItemValue(item, ColumnTitles.Size)}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => {
                    handleQuickAdd(currentDay, item)
                    setIsAddingItem(false)
                  }}>
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsAddingItem(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}