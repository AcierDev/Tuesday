"use client";

import { Board, ColumnValue, Item } from "@/typings/types";
import { useMemo } from "react";

interface ActivityItem {
  id: string;
  action: string;
  status: string | undefined;
  credit: string | undefined;
  timestamp: number;
}

export function RecentActivityFeed({ board }: { board: Board }) {
  const getStatusColor = (text: string) => {
    const normalizedText = text.toLowerCase().trim();
    switch (normalizedText) {
      case "done":
        return "text-green-500";
      case "working on it":
        return "text-yellow-500";
      case "stuck":
        return "text-red-500";
      case "didn't start":
        return "text-gray-400";
      default:
        return "text-gray-600";
    }
  };

  const activities = useMemo(() => {
    const allActivities: ActivityItem[] = [];

    board.items_page.items.forEach((item: Item) => {
      item.values.forEach((value: ColumnValue) => {
        if ("lastModifiedTimestamp" in value) {
          allActivities.push({
            id: item.id,
            action: value.columnName,
            status: value.text,
            credit: value.credit?.join(", "),
            timestamp: value.lastModifiedTimestamp!,
          });
        }
      });
    });

    return allActivities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  }, [board.items_page.items]);

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={`${activity.id}-${activity.timestamp}`}
          className="flex items-center space-x-4"
        >
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              Updated {activity.action} to{" "}
              {!activity.status ? (
                <span className="text-gray-600 italic">Unknown Status</span>
              ) : (
                <span className={getStatusColor(activity.status)}>
                  {activity.status}
                </span>
              )}
            </p>
            <p className="text-xs font-medium flex items-center gap-1.5">
              <span className="text-gray-400">●</span>
              {!activity.credit ? (
                <span className="text-gray-400 italic">Unknown User</span>
              ) : (
                activity.credit
              )}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(activity.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
