"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Board,
  Item,
  ColumnValue,
  ColumnTitles,
  ItemStatus,
} from "@/typings/types";
import { useTheme } from "next-themes";

type TimeRange = "daily" | "weekly" | "monthly" | "yearly";

interface CompletionTimeData {
  date: string;
  averageTime: number;
}

export function AverageCompletionTimeChart({
  board,
  timeRange,
}: {
  board: Board;
  timeRange: TimeRange;
}) {
  const { theme } = useTheme();

  const data = useMemo(() => {
    const groupedData: { [key: string]: { total: number; count: number } } = {};

    board.items_page.items.forEach((item: Item) => {
      if (
        item.status === ItemStatus.Done &&
        !item.deleted &&
        item.completedAt &&
        item.createdAt
      ) {
        const completionTime =
          (item.completedAt - item.createdAt) / (1000 * 60 * 60 * 24); // Convert to days
        const date = new Date(item.completedAt);
        let key: string;

        switch (timeRange) {
          case "daily":
            key = date.toISOString().split("T")[0];
            break;
          case "weekly":
            const weekStart = new Date(
              date.setDate(date.getDate() - date.getDay())
            );
            key = weekStart.toISOString().split("T")[0];
            break;
          case "monthly":
            key = `${date.getFullYear()}-${(date.getMonth() + 1)
              .toString()
              .padStart(2, "0")}`;
            break;
          case "yearly":
            key = date.getFullYear().toString();
            break;
        }

        if (!groupedData[key]) {
          groupedData[key] = { total: 0, count: 0 };
        }
        groupedData[key].total += completionTime;
        groupedData[key].count++;
      }
    });

    return Object.entries(groupedData)
      .map(([date, { total, count }]) => ({ date, averageTime: total / count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [board.items_page.items, timeRange]);

  const chartColors = {
    light: {
      stroke: "#f0f0f0",
      text: "#888888",
      line: "#ff7300",
    },
    dark: {
      stroke: "#374151",
      text: "#9CA3AF",
      line: "#F59E0B",
    },
  };

  const colors = theme === "dark" ? chartColors.dark : chartColors.light;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.stroke} />
        <XAxis dataKey="date" stroke={colors.text} />
        <YAxis stroke={colors.text} />
        <Tooltip
          contentStyle={{
            background: theme === "dark" ? "#1F2937" : "#fff",
            border: `1px solid ${colors.stroke}`,
            borderRadius: "4px",
            color: colors.text,
          }}
          formatter={(value: number) => `${value.toFixed(2)} days`} // Changed to days
        />
        <Line
          type="monotone"
          dataKey="averageTime"
          stroke={colors.line}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
