import { isBefore, isWithinInterval } from "date-fns";

import type {
  DayName,
  ScheduledOrder,
  WeeklyScheduleData,
} from "@/typings/types";
import { POST_WIP_STATUSES } from "@/components/production-planning/constants";
import { DAYS_FOLDED_INTO_MONDAY } from "@/components/production-planning/planner-config";
import { parseDueDay } from "@/components/production-planning/planner-dates";
import type { OrderMeta } from "@/components/production-planning/types";

export function calculateSquares(item: { size?: string }): number {
  const sizeStr = item.size || "";
  // Accept any of x / X / × (Unicode mult sign) as the dimension separator —
  // the size-picker can emit any of them depending on entry method, and the
  // capacity indicator was undercounting × sizes (e.g. "60×20" → 60, not 1200)
  // which made day totals appear capped below the real square count.
  const parts = sizeStr.split(/[x×X]/).slice(0, 2);
  const [width, height] = parts.map((part) => {
    const value = parseFloat(part.trim());
    return Number.isFinite(value) ? value : null;
  });

  if (width && height) {
    return width * height;
  }

  if (width || height) {
    return (width || height) ?? 0;
  }

  return 0;
}

export function classifyDueBucket(
  dueValue: string | null | undefined,
  today: Date,
  thisWeekEnd: Date,
  nextWeekStart: Date,
  nextWeekEnd: Date
): { dueDate: Date | null; bucket: OrderMeta["bucket"] } {
  const dueDate = parseDueDay(dueValue);
  if (!dueDate) return { dueDate: null, bucket: "noDue" };
  if (isBefore(dueDate, today)) return { dueDate, bucket: "overdue" };
  if (isWithinInterval(dueDate, { start: today, end: thisWeekEnd }))
    return { dueDate, bucket: "thisWeek" };
  if (isWithinInterval(dueDate, { start: nextWeekStart, end: nextWeekEnd }))
    return { dueDate, bucket: "nextWeek" };
  return { dueDate, bucket: "future" };
}

// Local extension of ScheduledOrder that carries the pinned flag through to
// the day column (so it can sort pinned entries to the bottom).
export type ScheduledDisplayOrder = ScheduledOrder & { pinned: boolean };

export type DayGroup = {
  orders: ScheduledDisplayOrder[];
  totalSquares: number;
  gluedSquares: number;
};

// Group the week's scheduled orders by display column with square totals.
export function buildDayGroups(
  currentSchedule: WeeklyScheduleData | undefined,
  allOrdersById: Map<string, OrderMeta>,
  currentWeekKey: string
): Record<DayName, DayGroup> {
  const groups: Record<DayName, DayGroup> = {
    Sunday: { orders: [], totalSquares: 0, gluedSquares: 0 },
    Monday: { orders: [], totalSquares: 0, gluedSquares: 0 },
    Tuesday: { orders: [], totalSquares: 0, gluedSquares: 0 },
    Wednesday: { orders: [], totalSquares: 0, gluedSquares: 0 },
    Thursday: { orders: [], totalSquares: 0, gluedSquares: 0 },
    Friday: { orders: [], totalSquares: 0, gluedSquares: 0 },
    Saturday: { orders: [], totalSquares: 0, gluedSquares: 0 },
  };

  if (currentSchedule) {
    Object.entries(currentSchedule.schedule).forEach(([day, items]) => {
      const dayName = day as DayName;
      // Sat/Sun work folds into Monday's display column.
      const targetDay: DayName = DAYS_FOLDED_INTO_MONDAY.includes(dayName)
        ? "Monday"
        : dayName;
      if (!groups[targetDay]) return;
      items.forEach((item) => {
        const meta = allOrdersById.get(item.id);
        if (!meta) return;
        groups[targetDay].orders.push({
          itemId: item.id,
          weekKey: currentWeekKey,
          day: dayName,
          pinned: !!item.pinned,
        });
        groups[targetDay].totalSquares += meta.squares;
        if (POST_WIP_STATUSES.has(meta.item.status)) {
          groups[targetDay].gluedSquares += meta.squares;
        }
      });
    });
  }

  return groups;
}
