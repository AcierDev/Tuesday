"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ColumnTitles, DayName, ItemStatus } from "@/typings/types";
import { OrderMeta, DueBucket } from "./types";
import { cn } from "@/utils/functions";
import { Pin, X } from "lucide-react";
import { DesignBlends } from "@/typings/constants";
import { parseMinecraftColors } from "@/parseMinecraftColors";
import { useTheme } from "next-themes";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";

// Solid, number-only due-date badge (overdue=red, due-soon=amber, on-time=emerald).
// `referenceDate` lets a scheduled card show the diff relative to its day rather
// than today.
function getSolidDueBadge(
  dueDate: Date | null | undefined,
  referenceDate: Date | undefined
): { text: string; classes: string } {
  if (!dueDate) {
    return { text: "?", classes: "bg-gray-500 text-white" };
  }
  const ref = new Date(referenceDate ?? new Date());
  ref.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(
    (due.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24)
  );

  const text = diffDays > 0 ? `+${diffDays}` : `${diffDays}`;
  if (diffDays < 0) return { text, classes: "bg-red-500 text-white" };
  if (diffDays <= 2) return { text, classes: "bg-amber-500 text-white" };
  return { text, classes: "bg-emerald-500 text-white" };
}

// Production status maps the item's current ItemStatus to a card tint:
//   "done" (green)    — past WIP: Packaging, At The Door, Done
//   "wip"  (orange)   — currently being worked on
//   "pending" (none)  — New / OnDeck / anything else
type ProductionStatus = "done" | "wip" | "pending";

function getProductionStatus(status: ItemStatus | undefined): ProductionStatus {
  switch (status) {
    case ItemStatus.Packaging:
    case ItemStatus.At_The_Door:
    case ItemStatus.Done:
      return "done";
    case ItemStatus.Wip:
      return "wip";
    default:
      return "pending";
  }
}

const STATUS_TINT: Record<ProductionStatus, string> = {
  done: "bg-emerald-50 dark:bg-emerald-950/40 border-y-emerald-200 border-r-emerald-200 dark:border-y-emerald-900 dark:border-r-emerald-900",
  wip: "bg-amber-50 dark:bg-amber-950/40 border-y-amber-200 border-r-amber-200 dark:border-y-amber-900 dark:border-r-amber-900",
  pending: "bg-white dark:bg-gray-900 border-y border-r border-gray-200 dark:border-gray-800",
};

interface OrderCardProps {
  meta: OrderMeta;
  isScheduled?: boolean;
  scheduledDay?: DayName | null;
  onSchedule?: (day: DayName) => void;
  onUnschedule?: () => void;
  showScheduleButtons?: boolean;
  referenceDate?: Date;
  isPinned?: boolean;
  // Toggle pin on a scheduled card. Called when isScheduled=true.
  onTogglePin?: () => void;
  // Pin an unscheduled card to a specific day. Called when isScheduled=false.
  onPinToDay?: (day: DayName) => void;
}

// Day options exposed in the sidebar pin picker. Mon–Thu match the auto-plan
// target days; we deliberately omit Fri/Sat/Sun since those aren't normal
// production days.
const PIN_TARGET_DAYS: DayName[] = ["Monday", "Tuesday", "Wednesday", "Thursday"];

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
  referenceDate,
  isPinned = false,
  onTogglePin,
  onPinToDay,
}: OrderCardProps) {
  const { theme } = useTheme();
  const { settings } = useOrderSettings();
  const isDark = theme === "dark";
  const [pinPickerOpen, setPinPickerOpen] = useState(false);

  const size = meta.item.size || "N/A";
  const customerName = meta.item.customerName || "Unknown";
  const design = meta.item.design || "";

  const bucketColor = bucketColors[meta.bucket];
  const backgroundStyle = design ? createBackground(design) : undefined;

  // Parse customer name with Minecraft colors
  const parsedCustomerName = parseMinecraftColors(customerName, isDark);

  const badgeStatus = meta.item.dueDate
    ? getSolidDueBadge(new Date(meta.item.dueDate), referenceDate)
    : null;

  const productionStatus = getProductionStatus(meta.item.status);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-l-[3px] transition-all hover:shadow-sm",
        bucketColor,
        STATUS_TINT[productionStatus]
      )}
    >
      <div className="flex items-start justify-between gap-2 px-3 py-2.5">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-snug">
            {parsedCustomerName}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
              {size}
            </div>
            {design && (
              <div
                className="text-[11px] px-2 py-1 rounded-full text-white font-medium shadow-sm"
                style={{ background: backgroundStyle }}
              >
                {design}
              </div>
            )}
            {badgeStatus && (
              <div
                className={cn(
                  "text-[11px] px-2 py-1 rounded-full font-bold tabular-nums shadow-sm",
                  badgeStatus.classes
                )}
              >
                {badgeStatus.text}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-0.5 shrink-0 -mr-1 -mt-1">
          {/* Pin (scheduled): direct toggle. Sidebar: opens day picker. */}
          {isScheduled && onTogglePin && (
            <Button
              variant="ghost"
              size="icon"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
              }}
              className={cn(
                "h-6 w-6 transition-opacity",
                isPinned
                  ? "text-amber-600 dark:text-amber-400 opacity-100"
                  : "text-gray-400 hover:text-amber-500 opacity-0 group-hover:opacity-100"
              )}
              title={isPinned ? "Unpin from this day" : "Pin to this day"}
            >
              {isPinned ? (
                <Pin className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Pin className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          {!isScheduled && onPinToDay && (
            <Popover open={pinPickerOpen} onOpenChange={setPinPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onPointerDown={(e) => e.stopPropagation()}
                  className="h-6 w-6 text-gray-400 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Pin to a specific day"
                >
                  <Pin className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-2 w-auto"
                align="end"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="text-[10px] uppercase tracking-wider text-gray-500 px-1 pb-1">
                  Pin to
                </div>
                <div className="flex gap-1">
                  {PIN_TARGET_DAYS.map((day) => (
                    <Button
                      key={day}
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPinToDay(day);
                        setPinPickerOpen(false);
                      }}
                    >
                      {dayAbbr[day]}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          {isScheduled && onUnschedule && (
            <Button
              variant="ghost"
              size="icon"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onUnschedule();
              }}
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
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
