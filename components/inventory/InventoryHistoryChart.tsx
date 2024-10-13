"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { InventoryItem } from "@/typings/types"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { ArrowUpIcon, ArrowDownIcon, MinusIcon, BarChart2, LineChart as LineChartIcon } from "lucide-react"

interface InventoryHistoryChartProps {
  item: InventoryItem
}

export default function InventoryHistoryChart({ item }: InventoryHistoryChartProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  const chartData = item.countHistory.map((history) => ({
    date: new Date(history.timestamp).toLocaleDateString(),
    quantity: history.quantity,
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const latestQuantity = chartData[chartData.length - 1]?.quantity || 0
  const previousQuantity = chartData[chartData.length - 2]?.quantity || 0
  const quantityChange = latestQuantity - previousQuantity
  const percentageChange = previousQuantity !== 0 
    ? ((quantityChange / previousQuantity) * 100).toFixed(2) 
    : "N/A"

  const averageQuantity = chartData.reduce((sum, data) => sum + data.quantity, 0) / chartData.length
  const maxQuantity = Math.max(...chartData.map(data => data.quantity))
  const minQuantity = Math.min(...chartData.map(data => data.quantity))

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-none bg-primary text-black hover:bg-primary/90 bg-gray-300 dark:bg-gray-900 dark:text-white">
          View History
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[95vw] md:max-w-[900px] lg:max-w-[1100px] bg-background text-foreground dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Count History for {item.name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card className="dark:bg-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Current Quantity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latestQuantity}</div>
              <p className="text-xs text-muted-foreground">
                {quantityChange > 0 ? (
                  <span className="text-green-500 flex items-center">
                    <ArrowUpIcon className="w-4 h-4 mr-1" /> {percentageChange}%
                  </span>
                ) : quantityChange < 0 ? (
                  <span className="text-red-500 flex items-center">
                    <ArrowDownIcon className="w-4 h-4 mr-1" /> {percentageChange}%
                  </span>
                ) : (
                  <span className="text-yellow-500 flex items-center">
                    <MinusIcon className="w-4 h-4 mr-1" /> 0%
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Quantity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageQuantity.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Quantity Range</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{minQuantity} - {maxQuantity}</div>
            </CardContent>
          </Card>
        </div>
        <Card className="w-full h-[400px] dark:bg-gray-700 relative">
          <CardHeader className="px-2 sm:px-6">
            <CardTitle className="pr-10">
              {chartType === 'line' ? 'Quantity Trend Over Time' : 'Quantity Distribution'}
            </CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setChartType(chartType === 'line' ? 'bar' : 'line')}
              className="absolute top-4 right-4 dark:bg-gray-600 dark:text-white"
            >
              {chartType === 'line' ? <BarChart2 className="h-4 w-4" /> : <LineChartIcon className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent className="p-0 sm:p-2">
            <ChartContainer
              config={{
                quantity: {
                  label: "Quantity",
                  color: chartType === 'line' ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px] w-[1032px]"
            >
              {chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="quantity" stroke="var(--color-quantity)" strokeWidth={2} dot={{ r: 4 }}/>
                </LineChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="quantity" fill="var(--color-quantity)" animationDuration={1000} />
                </BarChart>
              )}
            </ChartContainer>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}