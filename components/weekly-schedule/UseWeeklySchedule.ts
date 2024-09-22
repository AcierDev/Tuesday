import { useState, useCallback, useEffect } from 'react'
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { toast } from 'sonner'
import { useRealmApp } from '@/hooks/useRealmApp'

export type DaySchedule = Record<string, string[]>
export type WeeklySchedules = Record<string, DaySchedule>

export interface UseWeeklyScheduleReturn {
  weeklySchedules: WeeklySchedules
  currentWeekStart: Date
  changeWeek: (direction: 'prev' | 'next') => void
  addItemToDay: (day: string, itemId: string) => Promise<void>
  removeItemFromDay: (day: string, itemId: string) => Promise<void>
  moveItem: (sourceDay: string, destDay: string, itemId: string, newIndex: number) => Promise<void>
}

export const useWeeklySchedule = ({ boardId, weekStartsOn = 1 }: { boardId: string, weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 }): UseWeeklyScheduleReturn => {
  const { collection } = useRealmApp()
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedules>({})
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => 
    startOfWeek(new Date(), { weekStartsOn })
  )

  const loadSchedules = useCallback(async () => {
    if (!collection) return

    try {
      const board = await collection.findOne({ _id: boardId })
      if (board?.weeklySchedules) {
        setWeeklySchedules(board.weeklySchedules)
        const latestWeek = Object.keys(board.weeklySchedules).sort().pop()
        if (latestWeek) {
          setCurrentWeekStart(startOfWeek(new Date(latestWeek), { weekStartsOn }))
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
  }, [collection, boardId, weekStartsOn])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  const createNewWeek = (weekStart: Date) => {
    const weekKey = format(weekStart, 'yyyy-MM-dd')
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
  }

  const saveSchedules = async (newSchedules: WeeklySchedules) => {
    if (!collection) return

    try {
      await collection.updateOne(
        { _id: boardId },
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

  const changeWeek = useCallback((direction: 'prev' | 'next') => {
    setCurrentWeekStart(prevWeekStart => {
      const newWeekStart = direction === 'prev' 
        ? subWeeks(prevWeekStart, 1)
        : addWeeks(prevWeekStart, 1)
      const adjustedWeekStart = startOfWeek(newWeekStart, { weekStartsOn })
      if (!weeklySchedules[format(adjustedWeekStart, 'yyyy-MM-dd')]) {
        createNewWeek(adjustedWeekStart)
      }
      return adjustedWeekStart
    })
  }, [weekStartsOn, weeklySchedules])

  const addItemToDay = useCallback(async (day: string, itemId: string) => {
    const weekKey = format(currentWeekStart, 'yyyy-MM-dd')
    const newSchedules = {
      ...weeklySchedules,
      [weekKey]: {
        ...weeklySchedules[weekKey],
        [day]: [...(weeklySchedules[weekKey]?.[day] || []), itemId]
      }
    }
    setWeeklySchedules(newSchedules)
    await saveSchedules(newSchedules)
  }, [weeklySchedules, currentWeekStart, saveSchedules])

  const removeItemFromDay = useCallback(async (day: string, itemId: string) => {
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
  }, [weeklySchedules, currentWeekStart, saveSchedules])

  const moveItem = useCallback(async (sourceDay: string, destDay: string, itemId: string, newIndex: number) => {
    const weekKey = format(currentWeekStart, 'yyyy-MM-dd')
    const newSchedules = { ...weeklySchedules }
    const sourceItems = newSchedules[weekKey][sourceDay]
    const destItems = newSchedules[weekKey][destDay]

    const itemIndex = sourceItems.indexOf(itemId)
    if (itemIndex > -1) {
      sourceItems.splice(itemIndex, 1)
      destItems.splice(newIndex, 0, itemId)
    }

    setWeeklySchedules(newSchedules)
    await saveSchedules(newSchedules)
  }, [weeklySchedules, currentWeekStart, saveSchedules])

  return {
    weeklySchedules,
    currentWeekStart,
    changeWeek,
    addItemToDay,
    removeItemFromDay,
    moveItem,
  }
}