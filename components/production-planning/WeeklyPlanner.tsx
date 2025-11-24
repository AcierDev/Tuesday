"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DayName } from "@/typings/types";
import { ScheduledOrder } from "@/stores/useProductionPlanningStore";
import { OrderMeta } from "./types";
import { OrderCard } from "./OrderCard";
import { cn } from "@/utils/functions";

import { Progress } from "@/components/ui/progress";

interface WeeklyPlannerProps {
  weekKey: string;
  scheduledOrders: ScheduledOrder[];
  ordersById: Map<string, OrderMeta>;
  onUnschedule: (itemId: string) => void;
}

const DAYS: DayName[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
];

const dayAbbr: Record<DayName, string> = {
  Sunday: "Sun",
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
};

const CAPACITY_BLOCKS = 1000;

export function WeeklyPlanner({
  weekKey,
  scheduledOrders,
  ordersById,
  onUnschedule,
}: WeeklyPlannerProps) {
  const dayGroups = useMemo(() => {
    const groups: Record<
      DayName,
      { orders: ScheduledOrder[]; totalBlocks: number }
    > = {
      Sunday: { orders: [], totalBlocks: 0 },
      Monday: { orders: [], totalBlocks: 0 },
      Tuesday: { orders: [], totalBlocks: 0 },
      Wednesday: { orders: [], totalBlocks: 0 },
      Thursday: { orders: [], totalBlocks: 0 },
      Friday: { orders: [], totalBlocks: 0 },
      Saturday: { orders: [], totalBlocks: 0 },
    };

    scheduledOrders.forEach((scheduled) => {
      if (scheduled.weekKey === weekKey && DAYS.includes(scheduled.day)) {
        const meta = ordersById.get(scheduled.itemId);
        if (meta) {
          groups[scheduled.day].orders.push(scheduled);
          groups[scheduled.day].totalBlocks += meta.blocks;
        }
      }
    });

    return groups;
  }, [scheduledOrders, weekKey, ordersById]);

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {DAYS.map((day) => {
          const group = dayGroups[day];
          const isOverCapacity = group.totalBlocks > CAPACITY_BLOCKS;
          const percentage = (group.totalBlocks / CAPACITY_BLOCKS) * 100;

          let progressColorClass = "[&>div]:bg-green-500";
          if (percentage > 100) progressColorClass = "[&>div]:bg-red-500";
          else if (percentage >= 80)
            progressColorClass = "[&>div]:bg-yellow-500";

          return (
            <div key={day} className="flex flex-col">
              <div className="mb-3">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {dayAbbr[day]}
                </div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span
                    className={cn(
                      "text-xl font-bold tabular-nums",
                      isOverCapacity
                        ? "text-red-600 dark:text-red-400"
                        : percentage >= 80
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-gray-700 dark:text-gray-300"
                    )}
                  >
                    {group.totalBlocks}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    / {CAPACITY_BLOCKS.toLocaleString()}
                  </span>
                </div>
                <Progress
                  value={percentage}
                  className={cn("h-1.5", progressColorClass)}
                />
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto max-h-[600px]">
                {group.orders.length === 0 ? (
                  <div className="text-xs text-gray-400 dark:text-gray-600 text-center py-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    —
                  </div>
                ) : (
                  group.orders.map((scheduled) => {
                    const meta = ordersById.get(scheduled.itemId);
                    if (!meta) return null;

                    return (
                      <OrderCard
                        key={scheduled.itemId}
                        meta={meta}
                        isScheduled
                        scheduledDay={scheduled.day}
                        onUnschedule={() => onUnschedule(scheduled.itemId)}
                      />
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
