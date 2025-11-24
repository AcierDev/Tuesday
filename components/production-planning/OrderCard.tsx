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
        "group relative overflow-hidden border-l-[3px] transition-all hover:shadow-sm",
        bucketColor,
        "bg-white dark:bg-gray-900 border-y border-r border-gray-200 dark:border-gray-800"
      )}
    >
      <div className="flex items-start justify-between gap-2 p-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
            {parsedCustomerName}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">
              {size}
            </div>
            {design && (
              <div
                className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium shadow-sm"
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
            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -mr-1 -mt-1 text-gray-400 hover:text-red-500"
            onClick={onUnschedule}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {showScheduleButtons && !isScheduled && onSchedule && (
        <div className="flex gap-1 px-2 pb-2 border-t border-gray-100 dark:border-gray-800 pt-1.5">
          {workDays.map((day) => (
            <Button
              key={day}
              variant="secondary"
              size="sm"
              className="text-[10px] h-6 flex-1 font-medium px-0 hover:bg-primary hover:text-primary-foreground transition-colors"
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

