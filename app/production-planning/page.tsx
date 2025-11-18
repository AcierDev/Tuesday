"use client";

import { useMemo, useCallback } from "react";
import {
  addWeeks,
  subWeeks,
  endOfWeek,
  format,
  isBefore,
  isWithinInterval,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatsCard } from "@/components/production-planning/StatsCard";
import { WeeklyPlanner } from "@/components/production-planning/WeeklyPlanner";
import { UnscheduledOrdersList } from "@/components/production-planning/UnscheduledOrdersList";
import { OrderMeta } from "@/components/production-planning/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { useProductionPlanningStore } from "@/stores/useProductionPlanningStore";
import { ColumnTitles, ItemStatus, DayName } from "@/typings/types";

function calculateBlocks(item: { size?: string }): number {
  const sizeStr = item.size || "";
  const parts = sizeStr.split("x").slice(0, 2);
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

export default function ProductionPlanningPage() {
  const { items } = useOrderStore();
  const {
    scheduledOrders,
    currentWeekKey,
    scheduleOrder,
    unscheduleOrder,
    setCurrentWeek,
    clearWeek,
  } = useProductionPlanningStore();

  const today = useMemo(() => startOfDay(new Date()), []);
  
  // Calculate week boundaries based on currentWeekKey
  const currentWeekStart = useMemo(
    () => startOfWeek(new Date(currentWeekKey), { weekStartsOn: 0 }),
    [currentWeekKey]
  );
  const currentWeekEnd = useMemo(
    () => endOfWeek(currentWeekStart, { weekStartsOn: 0 }),
    [currentWeekStart]
  );
  const nextWeekStart = useMemo(() => addWeeks(currentWeekStart, 1), [currentWeekStart]);
  const nextWeekEnd = useMemo(
    () => endOfWeek(nextWeekStart, { weekStartsOn: 0 }),
    [nextWeekStart]
  );

  // Filter orders: New/On Deck, not deleted
  const availableOrders = useMemo(
    () =>
      items.filter(
        (item) =>
          (item.status === ItemStatus.New || item.status === ItemStatus.OnDeck) &&
          !item.deleted
      ),
    [items]
  );

  // Build order metadata with buckets
  const baseData = useMemo(() => {
    const metaList: OrderMeta[] = [];
    const metaById = new Map<string, OrderMeta>();

    availableOrders.forEach((item) => {
      const blocks = calculateBlocks(item);
      const dueValue = item.dueDate;

      let dueDate: Date | null = null;
      let bucket: "overdue" | "thisWeek" | "nextWeek" | "future" | "noDue" = "noDue";

      if (dueValue) {
        const parsed = new Date(dueValue);
        if (!Number.isNaN(parsed.getTime())) {
          dueDate = startOfDay(parsed);
          if (isBefore(dueDate, today)) {
            bucket = "overdue";
          } else if (
            isWithinInterval(dueDate, {
              start: today,
              end: currentWeekEnd,
            })
          ) {
            bucket = "thisWeek";
          } else if (
            isWithinInterval(dueDate, {
              start: nextWeekStart,
              end: nextWeekEnd,
            })
          ) {
            bucket = "nextWeek";
          } else {
            bucket = "future";
          }
        }
      }

      const meta: OrderMeta = {
        id: item.id,
        item,
        blocks,
        dueDate,
        bucket,
      };

      metaList.push(meta);
      metaById.set(item.id, meta);
    });

    return { metaList, metaById };
  }, [availableOrders, today, currentWeekEnd, nextWeekStart, nextWeekEnd]);

  // Get scheduled item IDs for current week
  const scheduledItemIds = useMemo(() => {
    const ids = new Set<string>();
    scheduledOrders.forEach((order) => {
      if (order.weekKey === currentWeekKey) {
        ids.add(order.itemId);
      }
    });
    return ids;
  }, [scheduledOrders, currentWeekKey]);

  // Unscheduled orders (not in current week schedule)
  const unscheduledOrders = useMemo(
    () => baseData.metaList.filter((meta) => !scheduledItemIds.has(meta.id)),
    [baseData.metaList, scheduledItemIds]
  );

  // Calculate stats (excluding scheduled orders from counts)
  const stats = useMemo(() => {
    let overdueBlocks = 0;
    let overdueOrders = 0;
    let thisWeekBlocks = 0;
    let thisWeekOrders = 0;
    let nextWeekBlocks = 0;
    let nextWeekOrders = 0;
    let totalBlocks = 0;
    let totalOrders = unscheduledOrders.length;

    unscheduledOrders.forEach((meta) => {
      totalBlocks += meta.blocks;

      switch (meta.bucket) {
        case "overdue":
          overdueBlocks += meta.blocks;
          overdueOrders += 1;
          break;
        case "thisWeek":
          thisWeekBlocks += meta.blocks;
          thisWeekOrders += 1;
          break;
        case "nextWeek":
          nextWeekBlocks += meta.blocks;
          nextWeekOrders += 1;
          break;
      }
    });

    return {
      overdue: { blocks: overdueBlocks, orders: overdueOrders },
      thisWeek: { blocks: thisWeekBlocks, orders: thisWeekOrders },
      nextWeek: { blocks: nextWeekBlocks, orders: nextWeekOrders },
      total: { blocks: totalBlocks, orders: totalOrders },
    };
  }, [unscheduledOrders]);

  const handleSchedule = useCallback(
    (itemId: string, day: DayName) => {
      scheduleOrder(itemId, currentWeekKey, day);
    },
    [currentWeekKey, scheduleOrder]
  );

  const handleUnschedule = useCallback(
    (itemId: string) => {
      unscheduleOrder(itemId);
    },
    [unscheduleOrder]
  );

  const handleClearWeek = useCallback(() => {
    clearWeek();
    toast.success("Week cleared");
  }, [clearWeek]);

  const handlePreviousWeek = useCallback(() => {
    const prevWeek = subWeeks(new Date(currentWeekKey), 1);
    const newWeekKey = format(startOfWeek(prevWeek, { weekStartsOn: 0 }), "yyyy-MM-dd");
    setCurrentWeek(newWeekKey);
  }, [currentWeekKey, setCurrentWeek]);

  const handleNextWeek = useCallback(() => {
    const nextWeek = addWeeks(new Date(currentWeekKey), 1);
    const newWeekKey = format(startOfWeek(nextWeek, { weekStartsOn: 0 }), "yyyy-MM-dd");
    setCurrentWeek(newWeekKey);
  }, [currentWeekKey, setCurrentWeek]);

  const handleToday = useCallback(() => {
    const todayKey = format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd");
    setCurrentWeek(todayKey);
  }, [setCurrentWeek]);

  const hasScheduledOrders = scheduledOrders.some(
    (o) => o.weekKey === currentWeekKey
  );

  const isCurrentWeek = currentWeekKey === format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-24">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Production Planning
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousWeek}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {format(currentWeekStart, "MMM d")} – {format(currentWeekEnd, "MMM d, yyyy")}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextWeek}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isCurrentWeek && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToday}
                  className="h-7 ml-2"
                >
                  Today
                </Button>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearWeek}
              disabled={!hasScheduledOrders}
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Clear
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Overdue"
            orders={stats.overdue.orders}
            blocks={stats.overdue.blocks}
            variant="overdue"
          />
          <StatsCard
            title="This Week"
            orders={stats.thisWeek.orders}
            blocks={stats.thisWeek.blocks}
            variant="thisWeek"
          />
          <StatsCard
            title="Next Week"
            orders={stats.nextWeek.orders}
            blocks={stats.nextWeek.blocks}
            variant="nextWeek"
          />
          <StatsCard
            title="Unscheduled"
            orders={stats.total.orders}
            blocks={stats.total.blocks}
            variant="total"
          />
        </div>

        {/* Weekly Planner */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wider">
            Week Schedule
          </h2>
          <WeeklyPlanner
            weekKey={currentWeekKey}
            scheduledOrders={scheduledOrders}
            ordersById={baseData.metaById}
            onUnschedule={handleUnschedule}
          />
        </div>

        {/* Unscheduled Orders List */}
        <Card className="bg-white dark:bg-gray-900 overflow-hidden flex flex-col min-h-[400px]">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              Unscheduled ({unscheduledOrders.length})
            </h2>
          </div>
          <UnscheduledOrdersList
            orders={unscheduledOrders}
            onSchedule={handleSchedule}
          />
        </Card>
      </div>
    </div>
  );
}

