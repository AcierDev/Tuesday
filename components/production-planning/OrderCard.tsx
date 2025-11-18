"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ColumnTitles, DayName } from "@/typings/types";
import { OrderMeta, DueBucket } from "./types";
import { cn } from "@/utils/functions";
import { X } from "lucide-react";
import { DesignBlends } from "@/typings/constants";
import { parseMinecraftColors } from "@/parseMinecraftColors";
import { useTheme } from "next-themes";

interface OrderCardProps {
  meta: OrderMeta;
  isScheduled?: boolean;
  scheduledDay?: DayName | null;
  onSchedule?: (day: DayName) => void;
  onUnschedule?: () => void;
  showScheduleButtons?: boolean;
}

const bucketColors: Record<DueBucket, string> = {
  overdue: "border-l-red-500",
  thisWeek: "border-l-amber-500",
  nextWeek: "border-l-emerald-500",
  future: "border-l-blue-500",
  noDue: "border-l-gray-400",
};

const dayAbbr: Record<DayName, string> = {
  Sunday: "S",
  Monday: "M",
  Tuesday: "T",
  Wednesday: "W",
  Thursday: "Th",
  Friday: "F",
  Saturday: "Sa",
};

const workDays: DayName[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

const createBackground = (design: string) => {
  const colors = DesignBlends[design as keyof typeof DesignBlends];
  if (colors && colors.length > 0) {
    return `linear-gradient(to right, ${colors.join(", ")})`;
  }
  return "#6b7280"; // fallback gray
};

export function OrderCard({
  meta,
  isScheduled = false,
  scheduledDay,
  onSchedule,
  onUnschedule,
  showScheduleButtons = false,
}: OrderCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const size = meta.item.size || "N/A";
  const customerName = meta.item.customerName || "Unknown";
  const design = meta.item.design || "";

  const bucketColor = bucketColors[meta.bucket];
  const backgroundStyle = design ? createBackground(design) : undefined;

  // Parse customer name with Minecraft colors
  const parsedCustomerName = parseMinecraftColors(customerName, isDark);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-l-4 transition-all hover:shadow-sm",
        bucketColor,
        "bg-white dark:bg-gray-900 border-y border-r border-gray-200 dark:border-gray-800"
      )}
    >
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {parsedCustomerName}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {size}
            </div>
            {design && (
              <div
                className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                style={{ background: backgroundStyle }}
              >
                {design}
              </div>
            )}
          </div>
        </div>
        
        {isScheduled && onUnschedule && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onUnschedule}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {showScheduleButtons && !isScheduled && onSchedule && (
        <div className="flex gap-1 px-3 pb-3 border-t border-gray-100 dark:border-gray-800 pt-2">
          {workDays.map((day) => (
            <Button
              key={day}
              variant="outline"
              size="sm"
              className="text-xs h-7 flex-1 font-medium"
              onClick={() => onSchedule(day)}
            >
              {dayAbbr[day]}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}

