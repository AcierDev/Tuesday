"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ColumnTitles, DayName, ItemStatus } from "@/typings/types";
import { OrderMeta } from "./types";
import { cn } from "@/utils/functions";
import { Pin } from "lucide-react";
import { DesignBlends } from "@/typings/constants";
import { parseMinecraftColors } from "@/parseMinecraftColors";
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

  const text = diffDays === 0 ? "0" : diffDays > 0 ? `+${diffDays}` : `${diffDays}`;
  if (diffDays < 0) return { text, classes: "bg-red-500/70 text-white" };
  if (diffDays <= 2) return { text, classes: "bg-yellow-500/70 text-white" };
  return { text, classes: "bg-green-500/70 text-white" };
}

// Card tint mirrors the canonical STATUS_COLORS palette so a card's color
// matches the same status anywhere else in the app (orders board, badges,
// etc). A subtle light/dark surface tint plus a matching subtle border.
// Exception: OnDeck is rendered with the same neutral gray as New on the
// planner — once an item is on the planner the New/OnDeck distinction
// stops carrying signal, so we collapse them visually here only.
const STATUS_TINT: Record<ItemStatus, string> = {
  [ItemStatus.New]:
    "bg-white dark:bg-gray-900 border-y border-r border-gray-200 dark:border-gray-800",
  [ItemStatus.OnDeck]:
    "bg-white dark:bg-gray-900 border-y border-r border-gray-200 dark:border-gray-800", // intentionally same as New
  [ItemStatus.Wip]:
    "bg-orange-50 dark:bg-orange-950/40 border-y-orange-200 border-r-orange-200 dark:border-y-orange-900 dark:border-r-orange-900",
  [ItemStatus.Packaging]:
    "bg-red-50 dark:bg-red-950/40 border-y-red-200 border-r-red-200 dark:border-y-red-900 dark:border-r-red-900",
  [ItemStatus.At_The_Door]:
    "bg-lime-50 dark:bg-lime-950/40 border-y-lime-200 border-r-lime-200 dark:border-y-lime-900 dark:border-r-lime-900",
  [ItemStatus.Done]:
    "bg-emerald-50 dark:bg-emerald-950/40 border-y-emerald-200 border-r-emerald-200 dark:border-y-emerald-900 dark:border-r-emerald-900",
  [ItemStatus.Hidden]:
    "bg-white dark:bg-gray-900 border-y border-r border-gray-200 dark:border-gray-800",
};

function getStatusTint(status: ItemStatus | undefined): string {
  return STATUS_TINT[status ?? ItemStatus.New] ?? STATUS_TINT[ItemStatus.New];
}

interface OrderCardProps {
  meta: OrderMeta;
  isScheduled?: boolean;
  scheduledDay?: DayName | null;
  onSchedule?: (day: DayName) => void;
  showScheduleButtons?: boolean;
  referenceDate?: Date;
  // Pinned-state semantics depend on context:
  //   - In a day column: locked to that day, auto-plan won't move it.
  //   - In the sidebar: locked to the sidebar, auto-plan won't pull it in.
  isPinned?: boolean;
  onTogglePin?: () => void;
  // True for one render-cycle after the auto-plan placed this card. Drives a
  // staggered "drop in" animation; placeIndex tunes the per-card delay.
  justPlaced?: boolean;
  placeIndex?: number;
}

// Left-edge stripe matches the order's status section on the orders board,
// so each card visually inherits the column it came from.
const STATUS_LEFT_BORDER: Record<ItemStatus, string> = {
  [ItemStatus.New]: "border-l-gray-400 dark:border-l-gray-500",
  [ItemStatus.OnDeck]: "border-l-gray-400 dark:border-l-gray-500", // intentionally same as New (see STATUS_TINT note)
  [ItemStatus.Wip]: "border-l-orange-500",
  [ItemStatus.Packaging]: "border-l-red-500",
  [ItemStatus.At_The_Door]: "border-l-lime-500",
  [ItemStatus.Done]: "border-l-emerald-500",
  [ItemStatus.Hidden]: "border-l-gray-400 dark:border-l-gray-500",
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
  showScheduleButtons = false,
  referenceDate,
  isPinned = false,
  onTogglePin,
  justPlaced = false,
  placeIndex = 0,
}: OrderCardProps) {
  const { settings } = useOrderSettings();

  const size = meta.item.size || "N/A";
  const customerName = meta.item.customerName || "Unknown";
  const design = meta.item.design || "";

  const leftBorderColor =
    STATUS_LEFT_BORDER[meta.item.status ?? ItemStatus.New] ??
    STATUS_LEFT_BORDER[ItemStatus.New];
  const backgroundStyle = design ? createBackground(design) : undefined;

  // Parse customer name with Minecraft colors
  const parsedCustomerName = parseMinecraftColors(customerName);

  const badgeStatus = meta.item.dueDate
    ? getSolidDueBadge(new Date(meta.item.dueDate), referenceDate)
    : null;

  // Auto-plan placement animation: a quick scale+drop-in with an amber glow
  // pulse, staggered per card. We key the motion.div on justPlaced so React
  // remounts it fresh each run — no need to coordinate "have we already
  // animated?" state.
  return (
    <motion.div
      layout="position"
      key={justPlaced ? `placed-${placeIndex}` : "idle"}
      initial={
        justPlaced
          ? { scale: 0.5, opacity: 0, y: -16 }
          : false
      }
      animate={
        justPlaced
          ? {
              scale: [0.5, 1.05, 1],
              opacity: [0, 1, 1],
              y: [-16, 0, 0],
              boxShadow: [
                "0 0 0 0 rgba(245,158,11,0)",
                "0 0 8px 2px rgba(245,158,11,0.14)",
                "0 0 0 0 rgba(245,158,11,0)",
              ],
            }
          : { scale: 1, opacity: 1, y: 0 }
      }
      transition={
        justPlaced
          ? {
              delay: placeIndex * 0.04,
              duration: 0.7,
              times: [0, 0.55, 1],
              ease: "easeOut",
            }
          : { duration: 0.25, ease: [0.32, 0.72, 0, 1] }
      }
      className="rounded-md"
    >
    <Card
      className={cn(
        "group relative overflow-hidden border-l-[3px] transition-all hover:shadow-sm",
        leftBorderColor,
        getStatusTint(meta.item.status)
      )}
    >
      <div className="flex items-start justify-between gap-2 px-3 py-2.5">
        <div className="flex-1 min-w-0 space-y-[3px] md:space-y-1.5">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-snug">
            {parsedCustomerName}
          </div>
          <div className="flex items-center gap-[3px] md:gap-1.5 min-w-0">
            <div className="shrink-0 text-[0.625rem] md:text-xs text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md">
              {size}
            </div>
            {design && (
              <div
                className="min-w-0 truncate text-[0.5625rem] md:text-[0.6875rem] px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-gray-200 font-medium shadow-sm [text-shadow:_0_0_2px_rgba(0,0,0,0.7),_0_1px_1px_rgba(0,0,0,0.4)]"
                style={{ background: backgroundStyle }}
              >
                {design}
              </div>
            )}
            {badgeStatus && (
              <div
                className={cn(
                  "shrink-0 ml-auto tabular-nums text-[0.80625rem] px-2 py-0.5 min-w-[2.475rem] justify-center rounded-[10px] inline-flex items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_28%)]",
                  badgeStatus.classes
                )}
              >
                {badgeStatus.text}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-0.5 shrink-0 -mr-1 -mt-1">
          {/* Pin toggle: in a day column it locks to the day; in the sidebar
              it locks the item to the sidebar (auto-plan skips it). */}
          {onTogglePin && (
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
                  : "text-gray-400 hover:text-amber-500 opacity-50 group-hover:opacity-100"
              )}
              title={
                isPinned
                  ? isScheduled
                    ? "Unpin from this day"
                    : "Allow auto-plan to schedule this"
                  : isScheduled
                  ? "Pin to this day"
                  : "Lock to sidebar (skip auto-plan)"
              }
            >
              <Pin
                className={cn(
                  "h-3.5 w-3.5",
                  isPinned && "fill-current"
                )}
              />
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
              className="text-[0.625rem] h-6 flex-1 font-medium px-0 hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => onSchedule(day)}
            >
              {dayAbbr[day]}
            </Button>
          ))}
        </div>
      )}
    </Card>
    </motion.div>
  );
}
