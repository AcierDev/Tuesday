import { useState, useMemo } from "react";
import {
  format,
  startOfDay,
  startOfWeek,
  startOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isSameDay,
  isSameWeek,
  isSameMonth,
  subMonths,
  subDays,
  isSaturday,
  parseISO,
} from "date-fns";
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { BarChart3, LineChart as LineChartIcon, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCuttingData } from "@/contexts/CuttingContext";

interface RawDataPoint {
  date: string;
  count: number;
}

interface AggregatedDataPoint {
  date: Date;
  totalCount: number;
  entries: number;
}

interface ChartDataPoint {
  date: string;
  rawDate?: string; // Added to store the actual date for week end detection
  count: number;
  average?: number;
}

type ViewMode = "day" | "week" | "month";

export default function CuttingTrend({
  timeRange,
  setTimeRange,
}: {
  timeRange: "all" | "week" | "month" | "past3" | "past7";
  setTimeRange: (range: "all" | "week" | "month" | "past3" | "past7") => void;
}) {
  const { data, isLoading } = useCuttingData();
  const [chartType, setChartType] = useState<"line" | "bar">("bar");
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [showDataLabels, setShowDataLabels] = useState(true);
  const [includeEmptyDays, setIncludeEmptyDays] = useState(true);

  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    const end = now;

    switch (timeRange) {
      case "past3":
        start = subDays(now, 2);
        break;
      case "past7":
        start = subDays(now, 6);
        break;
      case "week":
        start = startOfWeek(now);
        break;
      case "month":
        start = startOfMonth(now);
        break;
      case "all":
      default:
        start = subMonths(now, 3);
    }

    return { start: startOfDay(start), end: startOfDay(end) };
  }, [timeRange]);

  const aggregatedData = useMemo(() => {
    const aggregated = new Map<string, AggregatedDataPoint>();

    data.forEach((item) => {
      try {
        const date = startOfDay(item.date);
        const dateKey = date.toISOString();

        if (date >= dateRange.start && date <= dateRange.end) {
          if (aggregated.has(dateKey)) {
            const existing = aggregated.get(dateKey)!;
            aggregated.set(dateKey, {
              date,
              totalCount: existing.totalCount + (item.count || 0),
              entries: existing.entries + 1,
            });
          } else {
            aggregated.set(dateKey, {
              date,
              totalCount: item.count || 0,
              entries: 1,
            });
          }
        }
      } catch (error) {
        console.error(`Error processing date:`, error);
      }
    });

    return Array.from(aggregated.values());
  }, [data, dateRange]);

  const processedData = useMemo(() => {
    let dateRangeArray: Date[];

    switch (viewMode) {
      case "month":
        dateRangeArray = eachMonthOfInterval(dateRange);
        break;
      case "week":
        dateRangeArray = eachWeekOfInterval(dateRange);
        break;
      case "day":
      default:
        dateRangeArray = eachDayOfInterval(dateRange);
    }

    const chartData: ChartDataPoint[] = dateRangeArray.map((date) => {
      let relevantData: AggregatedDataPoint[] = [];

      switch (viewMode) {
        case "month":
          relevantData = aggregatedData.filter((d) =>
            isSameMonth(d.date, date)
          );
          break;
        case "week":
          relevantData = aggregatedData.filter((d) => isSameWeek(d.date, date));
          break;
        case "day":
        default:
          relevantData = aggregatedData.filter((d) => isSameDay(d.date, date));
      }

      const totalCount = relevantData.reduce((sum, d) => sum + d.totalCount, 0);
      const totalEntries = relevantData.reduce((sum, d) => sum + d.entries, 0);

      return {
        date: format(
          date,
          viewMode === "day" ? "MM/dd" : viewMode === "week" ? "'W'w" : "MMM"
        ),
        rawDate: date.toISOString(), // Store the actual date for week end detection
        count: totalCount,
        ...(viewMode !== "day" && {
          average: totalEntries ? Math.round(totalCount / totalEntries) : 0,
        }),
      };
    });

    return includeEmptyDays ? chartData : chartData.filter((d) => d.count > 0);
  }, [aggregatedData, viewMode, includeEmptyDays, dateRange]);

  const weekEndDates = useMemo(() => {
    if (viewMode !== "day") return [];
    return processedData
      .filter((d) => d.rawDate && isSaturday(parseISO(d.rawDate)))
      .map((d) => d.date);
  }, [processedData, viewMode]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 p-3 rounded-lg shadow-lg">
          <p className="text-gray-300 mb-1">{label}</p>
          <p className="text-blue-400 font-medium">
            Total: {payload[0].value.toLocaleString()}
          </p>
          {viewMode !== "day" && payload[1] && (
            <p className="text-green-400 font-medium">
              Average: {Math.round(payload[1].value).toLocaleString()}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      width: "100%",
      height: "100%",
      data: processedData,
    };

    const commonAxisProps = {
      className: "dark:fill-gray-400",
      tick: { fill: "currentColor" },
    };

    const renderWeekEndLines = () =>
      weekEndDates.map((date) => (
        <ReferenceLine
          key={date}
          x={date}
          stroke="white"
          strokeDasharray="solid"
          label={{
            value: "Week End",
            position: "top",
            fill: "rgb(156, 163, 175)",
            fontSize: 10,
          }}
        />
      ));

    if (chartType === "line") {
      return (
        <LineChart {...commonProps}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="dark:stroke-gray-700"
          />
          <XAxis dataKey="date" {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {viewMode === "day" && renderWeekEndLines()}
          <Line
            type="monotone"
            dataKey="count"
            name="Total Cut"
            stroke="rgb(59, 130, 246)"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            label={
              showDataLabels
                ? {
                    position: "top",
                    fill: "rgb(156, 163, 175)",
                    fontSize: 12,
                  }
                : false
            }
          />
          {viewMode !== "day" && (
            <Line
              type="monotone"
              dataKey="average"
              name="Daily Average"
              stroke="rgb(34, 197, 94)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              label={
                showDataLabels
                  ? {
                      position: "bottom",
                      fill: "rgb(156, 163, 175)",
                      fontSize: 12,
                    }
                  : false
              }
            />
          )}
        </LineChart>
      );
    }

    return (
      <BarChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-700" />
        <XAxis dataKey="date" {...commonAxisProps} />
        <YAxis {...commonAxisProps} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        {viewMode === "day" && renderWeekEndLines()}
        <Bar
          dataKey="count"
          name="Total Cut"
          fill="rgb(59, 130, 246)"
          label={
            showDataLabels
              ? {
                  position: "top",
                  fill: "rgb(156, 163, 175)",
                  fontSize: 12,
                }
              : false
          }
        />
        {viewMode !== "day" && (
          <Bar
            dataKey="average"
            name="Daily Average"
            fill="rgb(34, 197, 94)"
            label={
              showDataLabels
                ? {
                    position: "top",
                    fill: "rgb(156, 163, 175)",
                    fontSize: 12,
                  }
                : false
            }
          />
        )}
      </BarChart>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <>
      <CardHeader>
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <CardTitle>Cutting Trend</CardTitle>
            <div className="flex items-center space-x-2">
              <Select
                value={timeRange}
                onValueChange={(
                  value: "all" | "week" | "month" | "past3" | "past7"
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
                onClick={() =>
                  setChartType(chartType === "line" ? "bar" : "line")
                }
                className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                {chartType === "line" ? (
                  <BarChart3 className="h-4 w-4" />
                ) : (
                  <LineChartIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg p-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Select
                value={viewMode}
                onValueChange={(value: ViewMode) => setViewMode(value)}
              >
                <SelectTrigger className="w-[100px] dark:bg-gray-700">
                  <SelectValue placeholder="View by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-labels"
                checked={showDataLabels}
                onCheckedChange={setShowDataLabels}
              />
              <Label htmlFor="show-labels" className="text-sm">
                Show Values
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="include-empty"
                checked={includeEmptyDays}
                onCheckedChange={setIncludeEmptyDays}
              />
              <Label htmlFor="include-empty" className="text-sm">
                Include Zero Days
              </Label>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </>
  );
}
