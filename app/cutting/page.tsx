"use client";

import { useState, useEffect, useMemo } from "react";
import {
  format,
  startOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  isSameWeek,
} from "date-fns";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/functions";
import { CuttingData } from "@/typings/interfaces";
import { useInventoryContext } from "@/contexts/InventoryContext";
import {
  AlertTriangle,
  ArrowUpCircle,
  Repeat,
  Package2,
  History,
  Calculator,
  BarChart2,
} from "lucide-react";
import { LockedInventory } from "@/typings/types";
import StatCard from "@/components/cutting/StatCard";
import CuttingInput from "@/components/cutting/CuttingInput";
import CuttingTrend from "@/components/cutting/CuttingTrend";
import RecentEntries from "@/components/cutting/RecentEntries";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CuttingProvider } from "@/contexts/CuttingContext";

export default function Dashboard() {
  const [data, setData] = useState<CuttingData[]>([]);
  const [date, setDate] = useState<Date>(startOfDay(new Date()));
  const [timeRange, setTimeRange] = useState<
    "all" | "week" | "month" | "past3" | "past7"
  >("month");
  const [isLoading, setIsLoading] = useState(true);

  const { getItemByName } = useInventoryContext();
  const boardsInventory = getItemByName(LockedInventory.Boards);

  // Fetch cutting history data from the API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/cutting-history");
        if (!response.ok) {
          throw new Error("Failed to fetch cutting history");
        }
        const result = await response.json();
        setData(
          result.map((item: any) => ({
            date: startOfDay(new Date(item.date)),
            count: item.count,
          }))
        );
      } catch (error) {
        console.error("Error fetching cutting data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const chartData = useMemo(() => {
    let filteredData = data;
    const today = new Date();

    switch (timeRange) {
      case "week":
        const weekStart = startOfWeek(today);
        const weekEnd = endOfWeek(today);
        filteredData = data.filter(
          (item) => item.date >= weekStart && item.date <= weekEnd
        );
        break;
      case "month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        filteredData = data.filter(
          (item) => item.date >= monthStart && item.date <= monthEnd
        );
        break;
      case "past3":
        filteredData = data.filter((item) => item.date >= subDays(today, 2));
        break;
      case "past7":
        filteredData = data.filter((item) => item.date >= subDays(today, 6));
        break;
    }

    return filteredData
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((item) => ({
        date: format(item.date, "MM/dd"),
        count: item.count,
      }));
  }, [data, timeRange]);

  const stats = useMemo(() => {
    const totalCut = chartData.reduce((sum, item) => sum + item.count, 0);
    const averageCut =
      chartData.length > 0 ? Math.round(totalCut / chartData.length) : 0;

    const thisWeekTotal = data
      .filter((item) => isSameWeek(item.date, new Date()))
      .reduce((sum, item) => sum + item.count, 0);

    const lastWeekTotal = data
      .filter((item) => {
        const lastWeekStart = startOfWeek(subDays(new Date(), 7));
        const lastWeekEnd = endOfWeek(lastWeekStart);
        return item.date >= lastWeekStart && item.date <= lastWeekEnd;
      })
      .reduce((sum, item) => sum + item.count, 0);

    const weeklyChange = thisWeekTotal - lastWeekTotal;
    const weeklyChangePercentage =
      lastWeekTotal !== 0 ? (weeklyChange / lastWeekTotal) * 100 : 0;

    return { totalCut, averageCut, weeklyChange, weeklyChangePercentage };
  }, [data, chartData]);

  const lowInventoryThreshold = (boardsInventory?.restockQuantity || 0) * 1.2;

  // Add a function to handle saving new cutting data
  const saveCuttingData = async (date: Date, count: number) => {
    try {
      const response = await fetch("/api/cutting-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date: date.toISOString(), count }),
      });

      if (!response.ok) {
        throw new Error("Failed to save cutting data");
      }

      // Refresh the data after saving
      const updatedResponse = await fetch("/api/cutting-history");
      const result = await updatedResponse.json();
      setData(
        result.map((item: any) => ({
          date: startOfDay(new Date(item.date)),
          count: item.count,
        }))
      );
    } catch (error) {
      console.error("Error saving cutting data:", error);
      throw error;
    }
  };

  return (
    <CuttingProvider>
      <div className="container mx-auto p-4 space-y-8 animate-in fade-in-50 duration-500">
        {boardsInventory &&
          boardsInventory.quantity <= lowInventoryThreshold && (
            <Alert
              variant="destructive"
              className="dark:bg-red-900/20 dark:border-red-900"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Board inventory is running low! Current stock:{" "}
                {boardsInventory.quantity} boards
              </AlertDescription>
            </Alert>
          )}

        <div className="grid gap-4 md:grid-cols-5">
          {/* Left column stats */}
          <div className="space-y-4">
            <StatCard
              title="Current Board Inventory"
              value={boardsInventory?.quantity || 0}
              icon={<Package2 className="h-5 w-5" />}
              trend={
                boardsInventory?.quantity >
                (boardsInventory?.restockQuantity || 0)
                  ? "up"
                  : "down"
              }
              subtitle="boards in stock"
            />
            <StatCard
              title="Restock Quantity"
              value={boardsInventory?.restockQuantity || 0}
              icon={<ArrowUpCircle className="h-5 w-5" />}
              subtitle="minimum threshold"
            />
            <StatCard
              title="Last Count Date"
              value={
                boardsInventory?.countHistory.length
                  ? format(
                      new Date(
                        boardsInventory.countHistory[
                          boardsInventory.countHistory.length - 1
                        ]!.timestamp
                      ),
                      "PPP"
                    )
                  : "No counts recorded"
              }
              icon={<History className="h-5 w-5" />}
              subtitle="inventory check"
            />
          </div>

          {/* Main cutting dashboard */}
          <Card className="md:col-span-3 dark:bg-gray-800/50 dark:border-gray-700 dark:shadow-lg transition-all hover:dark:bg-gray-800/80">
            <CuttingInput
              date={date}
              setDate={setDate}
              onSave={saveCuttingData}
            />
          </Card>

          {/* Right column stats */}
          <div className="space-y-4">
            <StatCard
              title="Total Cut"
              value={stats.totalCut}
              icon={<Calculator className="h-5 w-5" />}
              subtitle={`in ${timeRange === "all" ? "all time" : timeRange}`}
            />
            <StatCard
              title="Daily Average"
              value={stats.averageCut}
              icon={<BarChart2 className="h-5 w-5" />}
              subtitle="boards per day"
            />
            <StatCard
              title="Weekly Change"
              value={
                <div className="flex items-center space-x-2">
                  <span
                    className={cn(
                      "text-2xl font-bold",
                      stats.weeklyChange >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    )}
                  >
                    {stats.weeklyChange >= 0 ? "+" : ""}
                    {stats.weeklyChange}
                  </span>
                  <span className="text-sm text-muted-foreground dark:text-gray-400">
                    ({stats.weeklyChangePercentage >= 0 ? "+" : ""}
                    {stats.weeklyChangePercentage.toFixed(1)}%)
                  </span>
                </div>
              }
              icon={<Repeat className="h-5 w-5" />}
              subtitle="vs last week"
              trend={stats.weeklyChange >= 0 ? "up" : "down"}
            />
          </div>
        </div>

        {/* Charts section */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="dark:bg-gray-800/50 dark:border-gray-700 dark:shadow-lg transition-all hover:dark:bg-gray-800/80">
            <CuttingTrend
              timeRange={timeRange}
              setTimeRange={setTimeRange}
              data={chartData}
            />
          </Card>
          <Card className="dark:bg-gray-800/50 dark:border-gray-700 dark:shadow-lg transition-all hover:dark:bg-gray-800/80">
            <RecentEntries data={data} />
          </Card>
        </div>
      </div>
    </CuttingProvider>
  );
}
