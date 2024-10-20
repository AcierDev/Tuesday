import { useState, useEffect } from "react"
import { format, isSameDay, startOfDay } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CalendarIcon, PlusCircle, MinusCircle } from "lucide-react"
import { cn } from "@/utils/functions"
import { CuttingData } from "@/typings/interfaces"

interface CuttingDashboardProps {
  data: CuttingData[]
  date: Date
  setDate: (date: Date) => void
  cuttingHistoryCollection: any
}

export default function CuttingDashboard({ data, date, setDate, cuttingHistoryCollection }: CuttingDashboardProps) {
  const [count, setCount] = useState<string>("")
  const [selectedDateCount, setSelectedDateCount] = useState<number>(0)

  useEffect(() => {
    const selectedEntry = data.find(entry => isSameDay(entry.date, date))
    setSelectedDateCount(selectedEntry ? selectedEntry.count : 0)
    setCount(selectedEntry ? selectedEntry.count.toString() : "")
  }, [data, date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (count && cuttingHistoryCollection) {
      const newCount = parseInt(count, 10)
      await updateCuttingCount(newCount)
    }
  }

  const handleQuickUpdate = async (increment: number) => {
    if (cuttingHistoryCollection) {
      const newCount = Math.max(0, selectedDateCount + increment)
      await updateCuttingCount(newCount)
    }
  }

  const updateCuttingCount = async (newCount: number) => {
    if (cuttingHistoryCollection) {
      const existingEntry = data.find(item => isSameDay(item.date, date))
      
      if (existingEntry) {
        await cuttingHistoryCollection.updateOne(
          { date: startOfDay(date).toISOString() },
          { $set: { count: newCount } }
        )
      } else {
        await cuttingHistoryCollection.insertOne({ date: startOfDay(date).toISOString(), count: newCount })
      }

      setSelectedDateCount(newCount)
      setCount(newCount.toString())
    }
  }

  return (
    <>
      <CardHeader>
        <CardTitle>2x4 Cutting Dashboard</CardTitle>
        <CardDescription>Track the number of 2x4's cut daily</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[280px] justify-start text-left font-normal dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600",
                      !date && "text-muted-foreground dark:text-gray-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 dark:bg-gray-800">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(startOfDay(newDate))}
                    initialFocus
                    className="dark:bg-gray-800 dark:text-gray-200"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <h3 className="text-2xl font-semibold">
              Count: {selectedDateCount}
            </h3>
          </div>
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1">
              <Input
                type="number"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="Enter number of 2x4's cut"
                className="dark:bg-gray-700 dark:text-gray-200"
              />
            </div>
            <Button onClick={handleSubmit} className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
              Update
            </Button>
          </div>
          <div className="flex justify-between items-center">
            <Button onClick={() => handleQuickUpdate(-10)} variant="outline" size="lg" className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
              <MinusCircle className="mr-2 h-4 w-4" />
              -10
            </Button>
            <Button onClick={() => handleQuickUpdate(-5)} variant="outline" size="lg" className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
              <MinusCircle className="mr-2 h-4 w-4" />
              -5
            </Button>
            <Button onClick={() => handleQuickUpdate(-1)} variant="outline" size="lg" className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
              <MinusCircle className="mr-2 h-4 w-4" />
              -1
            </Button>
            <Button onClick={() => handleQuickUpdate(1)} variant="outline" size="lg" className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
              <PlusCircle className="mr-2 h-4 w-4" />
              +1
            </Button>
            <Button onClick={() => handleQuickUpdate(5)} variant="outline" size="lg" className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
              <PlusCircle className="mr-2 h-4 w-4" />
              +5
            </Button>
            <Button onClick={() => handleQuickUpdate(10)} variant="outline" size="lg" className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
              <PlusCircle className="mr-2 h-4 w-4" />
              +10
            </Button>
          </div>
        </div>
      </CardContent>
    </>
  )
}