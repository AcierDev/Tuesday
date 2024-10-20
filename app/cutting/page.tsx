"use client";

import { useEffect, useMemo, useState } from "react";
import {
  endOfWeek,
  format,
  isSameWeek,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/utils/functions";
import { CuttingData } from "@/typings/interfaces";
import { useRealmApp } from "@/hooks/useRealmApp";
import { useInventoryContext } from "@/contexts/InventoryContext";
import { TrendingUp } from "lucide-react";
import { LockedInventory } from "@/typings/types";
import StatCard from "@/components/cutting/StatCard";
import CuttingDashboard from "@/components/cutting/CuttingDashboard";
import CuttingTrend from "@/components/cutting/CuttingTrend";
import RecentEntries from "@/components/cutting/RecentEntries";

export default function Dashboard() {
  const { cuttingHistoryCollection } = useRealmApp();
  const [data, setData] = useState<CuttingData[]>([]);
  const [date, setDate] = useState<Date>(startOfDay(new Date()));
  const [timeRange, setTimeRange] = useState<
    "all" | "week" | "month" | "past3" | "past7"
  >("all");

  const { getItemByName } = useInventoryContext();
  const boardsInventory = getItemByName(LockedInventory.Boards);

  useEffect(() => {
    const fetchData = async () => {
      if (cuttingHistoryCollection) {
        const result = await cuttingHistoryCollection.find();
        setData(
          result.map((item) => ({
            date: startOfDay(new Date(item.date)),
            count: item.count,
          })),
        );
      }
    };
    fetchData();
  }, [cuttingHistoryCollection]);

  const getChartData = () => {
    let filteredData = data;
    const today = new Date();
    if (timeRange === "week") {
      const weekStart = startOfWeek(today);
      const weekEnd = endOfWeek(today);
      filteredData = data.filter((item) =>
        item.date >= weekStart && item.date <= weekEnd
      );
    } else if (timeRange === "month") {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      filteredData = data.filter((item) =>
        item.date >= monthStart && item.date <= monthEnd
      );
    } else if (timeRange === "past3") {
      const threeDaysAgo = subDays(today, 2);
      filteredData = data.filter((item) =>
        item.date >= threeDaysAgo && item.date <= today
      );
    } else if (timeRange === "past7") {
      const sevenDaysAgo = subDays(today, 6);
      filteredData = data.filter((item) =>
        item.date >= sevenDaysAgo && item.date <= today
      );
    }

    return filteredData
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((item) => ({
        date: format(item.date, "MM/dd"),
        count: item.count,
      }));
  };

  const chartData = getChartData();

  const totalCut = chartData.reduce((sum, item) => sum + item.count, 0);
  const averageCut = chartData.length > 0
    ? Math.round(totalCut / chartData.length)
    : 0;

  const thisWeekTotal = useMemo(
    () =>
      data.filter((item) => isSameWeek(item.date, new Date()))
        .reduce((sum, item) => sum + item.count, 0),
    [data],
  );

  const lastWeekTotal = useMemo(() => {
    const lastWeekStart = startOfWeek(
      new Date(new Date().setDate(new Date().getDate() - 7)),
    );
    const lastWeekEnd = endOfWeek(lastWeekStart);
    return data.filter((item) =>
      item.date >= lastWeekStart && item.date <= lastWeekEnd
    )
      .reduce((sum, item) => sum + item.count, 0);
  }, [data]);

  const weeklyChange = thisWeekTotal - lastWeekTotal;
  const weeklyChangePercentage = lastWeekTotal !== 0
    ? (weeklyChange / lastWeekTotal) * 100
    : 0;

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="grid gap-4 md:grid-cols-5">
        <div className="space-y-4">
          <StatCard
            title="Current Board Inventory"
            value={boardsInventory?.quantity || 0}
          />
          <StatCard
            title="Restock Quantity"
            value={boardsInventory?.restockQuantity || 0}
          />
          <StatCard
            title="Last Count Date"
            value={boardsInventory?.countHistory.length
              ? format(
                new Date(
                  boardsInventory
                    .countHistory[boardsInventory.countHistory.length - 1]!
                    .timestamp,
                ),
                "MM/dd/yyyy",
              )
              : "N/A"}
          />
        </div>
        <Card className="md:col-span-3 dark:bg-gray-800">
          <CuttingDashboard
            data={data}
            date={date}
            setDate={setDate}
            cuttingHistoryCollection={cuttingHistoryCollection}
          />
        </Card>
        <div className="space-y-4 md:col-span-1">
          <StatCard title="Total 2x4's Cut" value={totalCut} />
          <StatCard title="Average Cut per Day" value={averageCut} />
          <StatCard
            title="Weekly Change"
            value={
              <div className="flex items-center space-x-2">
                <TrendingUp
                  className={cn(
                    "h-4 w-4",
                    weeklyChange >= 0 ? "text-green-500" : "text-red-500",
                  )}
                />
                <span className="text-2xl font-bold">
                  {weeklyChange >= 0 ? "+" : ""}
                  {weeklyChange}
                </span>
                <span className="text-sm text-muted-foreground dark:text-gray-400">
                  ({weeklyChangePercentage >= 0 ? "+" : ""}
                  {weeklyChangePercentage.toFixed(2)}%)
                </span>
              </div>
            }
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="dark:bg-gray-800">
          <CuttingTrend
            chartData={chartData}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
          />
        </Card>
        <Card className="dark:bg-gray-800">
          <RecentEntries data={data} />
        </Card>
      </div>
    </div>
  );
}
