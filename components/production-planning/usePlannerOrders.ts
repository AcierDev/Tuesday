"use client";

import { useMemo } from "react";
import { addDays, endOfDay } from "date-fns";

import { ItemStatus, type Item, type WeeklyScheduleData } from "@/typings/types";
import { parseSquareSize } from "@/lib/production-metrics";
import { planWeekStart } from "@/components/production-planning/planner-dates";
import {
  calculateSquares,
  classifyDueBucket,
} from "@/components/production-planning/planner-data";
import type { OrderMeta } from "@/components/production-planning/types";

type PlannerOrdersInput = {
  items: Item[];
  doneItems: Item[];
  scheduledItems: Item[];
  schedules: WeeklyScheduleData[];
  today: Date;
};

// Planner order pools: the schedulable orders, the ones not on any week yet,
// and metadata for every known order (done ones included) keyed by id.
export function usePlannerOrders({
  items,
  doneItems,
  scheduledItems,
  schedules,
  today,
}: PlannerOrdersInput) {
  // Calculate week boundaries. The planning week runs Sat→Fri (a new week
  // starts Saturday morning), but is keyed by the Sunday inside that span
  // for DB-backwards compat. So a week with key Sun X covers Sat X-1 → Fri X+5.
  const todayWeekStart = useMemo(() => planWeekStart(today), [today]);
  const todayWeekEnd = useMemo(
    () => endOfDay(addDays(todayWeekStart, 5)), // Friday end-of-day
    [todayWeekStart]
  );
  const todayNextWeekStart = useMemo(
    () => addDays(todayWeekStart, 6), // Saturday — start of next planning week
    [todayWeekStart]
  );
  const todayNextWeekEnd = useMemo(
    () => endOfDay(addDays(todayWeekStart, 12)), // following Friday
    [todayWeekStart]
  );

  // Filter orders: must be unfinished production, not deleted, not
  // held, and have a parseable W×H size. Custom/named sizes don't count toward
  // the daily-square capacity target since they aren't square units. Held items
  // are parked in On Deck and must never be auto-scheduled onto the calendar,
  // so they're excluded from the planner pool (and its auto-fill) entirely.
  const availableOrders = useMemo(
    () =>
      items.filter(
        (item) =>
          !item.deleted &&
          !item.onHold &&
          (item.status === ItemStatus.New ||
            item.status === ItemStatus.OnDeck ||
            item.status === ItemStatus.Wip) &&
          parseSquareSize(item.size) !== null
      ),
    [items]
  );

  // Build metadata
  const baseData = useMemo(() => {
    const metaList: OrderMeta[] = [];
    const metaById = new Map<string, OrderMeta>();

    availableOrders.forEach((item) => {
      const { dueDate, bucket } = classifyDueBucket(
        item.dueDate,
        today,
        todayWeekEnd,
        todayNextWeekStart,
        todayNextWeekEnd
      );

      const meta: OrderMeta = {
        id: item.id,
        item,
        squares: calculateSquares(item),
        dueDate,
        bucket,
      };
      metaList.push(meta);
      metaById.set(item.id, meta);
    });

    return { metaList, metaById };
  }, [
    availableOrders,
    today,
    todayWeekEnd,
    todayNextWeekStart,
    todayNextWeekEnd,
  ]);

  // Combine all known items for looking up scheduled items (which might be done)
  const allKnownItems = useMemo(() => {
    const itemMap = new Map<string, (typeof items)[0]>();
    items.forEach((i) => itemMap.set(i.id, i));
    doneItems.forEach((i) => itemMap.set(i.id, i));
    scheduledItems.forEach((i) => itemMap.set(i.id, i));
    return Array.from(itemMap.values());
  }, [items, doneItems, scheduledItems]);

  // Scheduled items for all weeks
  const scheduledItemIds = useMemo(() => {
    const ids = new Set<string>();
    schedules.forEach((schedule) => {
      Object.values(schedule.schedule).forEach((dayItems) => {
        dayItems.forEach((item) => ids.add(item.id));
      });
    });
    return ids;
  }, [schedules]);

  // Unscheduled orders
  const unscheduledOrders = useMemo(
    () => baseData.metaList.filter((meta) => !scheduledItemIds.has(meta.id)),
    [baseData.metaList, scheduledItemIds]
  );

  // Create a combined ordersById map that includes all items (including done ones)
  const allOrdersById = useMemo(() => {
    const combined = new Map<string, OrderMeta>(baseData.metaById);

    allKnownItems.forEach((item) => {
      if (combined.has(item.id)) return;
      const { dueDate, bucket } = classifyDueBucket(
        item.dueDate,
        today,
        todayWeekEnd,
        todayNextWeekStart,
        todayNextWeekEnd
      );
      combined.set(item.id, {
        id: item.id,
        item,
        squares: calculateSquares(item),
        dueDate,
        bucket,
      });
    });

    return combined;
  }, [
    baseData.metaById,
    allKnownItems,
    today,
    todayWeekEnd,
    todayNextWeekStart,
    todayNextWeekEnd,
  ]);

  return { availableOrders, unscheduledOrders, allOrdersById };
}
