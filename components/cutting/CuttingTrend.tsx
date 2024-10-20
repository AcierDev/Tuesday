import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, LineChart as LineChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface CuttingTrendProps {
  chartData: { date: string; count: number }[];
  timeRange: string;
  setTimeRange: (range: "all" | "week" | "month" | "past3" | "past7") => void;
}

export default function CuttingTrend(
  { chartData, timeRange, setTimeRange }: CuttingTrendProps,
) {
  const [chartType, setChartType] = useState<"line" | "bar">("line");

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Cutting Trend</CardTitle>
        <div className="flex space-x-2">
          <Select
            value={timeRange}
            onValueChange={(
              value: "all" | "week" | "month" | "past3" | "past7",
            ) => setTimeRange(value)}
          >
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
          <Button
            variant="outline"
            size="icon"
            onClick={() => setChartType(chartType === "line" ? "bar" : "line")}
            className="dark:bg-gray-700  dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {chartType === "line"
              ? <BarChart3 className="h-4 w-4" />
              : <LineChartIcon className="h-4 w-4" />}
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
          {chartType === "line"
            ? (
              <LineChart width={500} height={300} data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#888888" />
                <YAxis stroke="#888888" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-count)"
                  name="2x4's Cut"
                />
              </LineChart>
            )
            : (
              <BarChart width={500} height={300} data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#888888" />
                <YAxis stroke="#888888" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  name="2x4's Cut"
                />
              </BarChart>
            )}
        </ChartContainer>
      </CardContent>
    </>
  );
}
