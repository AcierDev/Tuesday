"use client"

import { useState, useEffect, useMemo } from "react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from "recharts"
import { CalendarIcon, ArrowUpDown, BarChart3, LineChart as LineChartIcon, TrendingUp } from "lucide-react"
import { format, isToday, isSameDay, startOfDay, subDays, startOfWeek, endOfWeek, isSameWeek } from "date-fns"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/utils/functions"
import { CuttingData } from "@/typings/interfaces"
import { useRealmApp } from "@/hooks/useRealmApp"

export default function Dashboard() {
  const { cuttingHistoryCollection } = useRealmApp()
  const [data, setData] = useState<CuttingData[]>([])
  const [date, setDate] = useState<Date>(startOfDay(new Date()))
  const [count, setCount] = useState<string>("")
  const [selectedDateCount, setSelectedDateCount] = useState<number>(0)
  const [chartType, setChartType] = useState<"line" | "bar">("line")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [timeRange, setTimeRange] = useState<"all" | "week" | "month" | "past3" | "past7">("all")

  const chartWidth = 533
  const chartHeight = 300

  useEffect(() => {
    const fetchData = async () => {
      if (cuttingHistoryCollection) {
        const result = await cuttingHistoryCollection.find()
        setData(result.map(item => ({ date: startOfDay(new Date(item.date)), count: item.count })))
      }
    }
    fetchData()
  }, [cuttingHistoryCollection])

  useEffect(() => {
    const selectedEntry = data.find(entry => isSameDay(entry.date, date))
    setSelectedDateCount(selectedEntry ? selectedEntry.count : 0)
    setCount(selectedEntry ? selectedEntry.count.toString() : "")
  }, [data, date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (count && cuttingHistoryCollection) {
      const newCount = parseInt(count, 10)
      const existingEntry = data.find(item => isSameDay(item.date, date))
      
      if (existingEntry) {
        await cuttingHistoryCollection.updateOne(
          { date: startOfDay(date).toISOString() },
          { $set: { count: newCount } }
        )
      } else {
        await cuttingHistoryCollection.insertOne({ date: startOfDay(date).toISOString(), count: newCount })
      }

      const updatedData = await cuttingHistoryCollection.find()
      setData(updatedData.map(item => ({ date: startOfDay(new Date(item.date)), count: item.count })))
      setSelectedDateCount(newCount)
    }
  }

  const handleQuickUpdate = async (increment: number) => {
    if (cuttingHistoryCollection) {
      const newCount = Math.max(0, selectedDateCount + increment)
      const existingEntry = data.find(item => isSameDay(item.date, date))
      
      if (existingEntry) {
        await cuttingHistoryCollection.updateOne(
          { date: startOfDay(date).toISOString() },
          { $set: { count: newCount } }
        )
      } else {
        await cuttingHistoryCollection.insertOne({ date: startOfDay(date).toISOString(), count: newCount })
      }

      const updatedData = await cuttingHistoryCollection.find()
      setData(updatedData.map(item => ({ date: startOfDay(new Date(item.date)), count: item.count })))
      setSelectedDateCount(newCount)
      setCount(newCount.toString())
    }
  }

  const getChartData = () => {
    let filteredData = data
    const today = new Date()
    if (timeRange === "week") {
      const weekStart = startOfWeek(today)
      const weekEnd = endOfWeek(today)
      filteredData = data.filter(item => item.date >= weekStart && item.date <= weekEnd)
    } else if (timeRange === "month") {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      filteredData = data.filter(item => item.date >= monthStart && item.date <= monthEnd)
    } else if (timeRange === "past3") {
      const threeDaysAgo = subDays(today, 2)
      filteredData = data.filter(item => item.date >= threeDaysAgo && item.date <= today)
    } else if (timeRange === "past7") {
      const sevenDaysAgo = subDays(today, 6)
      filteredData = data.filter(item => item.date >= sevenDaysAgo && item.date <= today)
    }

    return filteredData
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(item => ({
        date: format(item.date, "MM/dd"),
        count: item.count
      }))
  }

  const chartData = getChartData()

  const totalCut = chartData.reduce((sum, item) => sum + item.count, 0)
  const averageCut = chartData.length > 0 ? Math.round(totalCut / chartData.length) : 0

  const sortedData = useMemo(() => 
    [...data].sort((a, b) => 
      sortOrder === "asc" ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime()
    ),
    [data, sortOrder]
  )

  const thisWeekTotal = useMemo(() => 
    data.filter(item => isSameWeek(item.date, new Date()))
      .reduce((sum, item) => sum + item.count, 0),
    [data]
  )

  const lastWeekTotal = useMemo(() => {
    const lastWeekStart = startOfWeek(new Date(new Date().setDate(new Date().getDate() - 7)))
    const lastWeekEnd = endOfWeek(lastWeekStart)
    return data.filter(item => item.date >= lastWeekStart && item.date <= lastWeekEnd)
      .reduce((sum, item) => sum + item.count, 0)
  }, [data])

  const weeklyChange = thisWeekTotal - lastWeekTotal
  const weeklyChangePercentage = lastWeekTotal !== 0 ? (weeklyChange / lastWeekTotal) * 100 : 0

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-3 dark:bg-gray-800">
          <CardHeader>
            <CardTitle>2x4 Cutting Dashboard</CardTitle>
            <CardDescription>Track the number of 2x4's cut daily</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {isToday(date) ? "Today" : format(date, "MMM dd")}'s Count: {selectedDateCount}
                </h3>
                <div className="flex space-x-2">
                  <Button onClick={() => handleQuickUpdate(-5)} variant="outline" size="sm" className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">-5</Button>
                  <Button onClick={() => handleQuickUpdate(-1)} variant="outline" size="sm" className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">-1</Button>
                  <Button onClick={() => handleQuickUpdate(1)} variant="outline" size="sm" className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">+1</Button>
                  <Button onClick={() => handleQuickUpdate(5)} variant="outline" size="sm" className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">+5</Button>
                  <Button onClick={() => handleQuickUpdate(10)} variant="outline" size="sm" className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">+10</Button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600",
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
                <div className="grid gap-2">
                  <Label htmlFor="count">Number of 2x4's Cut</Label>
                  <Input
                    id="count"
                    type="number"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    placeholder="Enter number of 2x4's cut"
                    className="dark:bg-gray-700 dark:text-gray-200"
                  />
                </div>
                <Button type="submit">Add/Update Entry</Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 md:col-span-1">
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle>Total 2x4's Cut</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{totalCut}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle>Average Cut per Day</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{averageCut}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle>Weekly Change</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <TrendingUp className={cn("h-4 w-4", weeklyChange >= 0 ? "text-green-500" : "text-red-500")} />
                <span className="text-2xl font-bold">{weeklyChange >= 0 ? "+" : ""}{weeklyChange}</span>
                <span className="text-sm text-muted-foreground dark:text-gray-400">
                  ({weeklyChangePercentage >= 0 ? "+" : ""}{weeklyChangePercentage.toFixed(2)}%)
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Cutting Trend</CardTitle>
            <div className="flex space-x-2">
              <Select value={timeRange} onValueChange={(value: "all" | "week" | "month" | "past3" | "past7") => setTimeRange(value)}>
                <SelectTrigger className="w-[140px] dark:bg-gray-700 dark:text-gray-200">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:text-gray-200">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="past3">Past 3 Days</SelectItem>
                  <SelectItem value="past7">Past 7 Days</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setChartType(chartType === "line" ? "bar" : "line")} className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                {chartType === "line" ? <BarChart3 className="h-4 w-4" /> : <LineChartIcon className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "2x4's Cut",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              {chartType === "line" ? (
                <LineChart width={chartWidth} height={chartHeight} data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#888888" />
                  <YAxis stroke="#888888" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="var(--color-count)" name="2x4's Cut" />
                </LineChart>
              ) : (
                <BarChart width={chartWidth} height={chartHeight} data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#888888" />
                  <YAxis stroke="#888888" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="count" fill="var(--color-count)" name="2x4's Cut" />
                </BarChart>
              )}
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Entries</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              {sortOrder === "asc" ? "Oldest First" : "Newest First"}
            </Button>
          </CardHeader>
          <CardContent>
            <Table className="dark:border-gray-200">
              <TableHeader className="dark:border-gray-200">
                <TableRow>
                  <TableHead className="dark:text-gray-300">Date</TableHead>
                  <TableHead className="dark:text-gray-300">2x4's Cut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((entry, index) => (
                  <TableRow key={index} className="dark:hover:bg-gray-700 dark:border-gray-200">
                    <TableCell className="dark:text-gray-300">{format(entry.date, "MM/dd/yyyy")}</TableCell>
                    <TableCell className="dark:text-gray-300">{entry.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}