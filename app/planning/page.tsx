"use client";

import { useCallback, useMemo, useState } from "react";
import {
  addWeeks,
  endOfWeek,
  format,
  isBefore,
  isWithinInterval,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlanningStatsCard } from "@/components/planning/PlanningStatsCard";
import { ScheduledOrdersPreview } from "@/components/planning/ScheduledOrdersPreview";
import { UnscheduledOrdersList } from "@/components/planning/UnscheduledOrdersList";
import { OrderMeta, ScheduledPlacement, DueBucket } from "@/components/planning/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { useWeeklyScheduleStore } from "@/stores/useWeeklyScheduleStore";
import {
  ColumnTitles,
  DayName,
  Item,
  ItemStatus,
} from "@/typings/types";

const DEFAULT_DAY: DayName = "Monday";

const dayOrder: Record<DayName, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

type BucketTotals = Record<DueBucket, { orders: number; blocks: number }>;

type BaseData = {
  metaList: OrderMeta[];
  metaById: Map<string, OrderMeta>;
  bucketTotals: BucketTotals;
  totalBlocks: number;
};

function calculateBlocks(item: Item): number {
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

export default function PlanningDashboard() {
  const { items } = useOrderStore();
  const {
    schedules,
    addItemToDay,
    createWeek,
  } = useWeeklyScheduleStore();

  const [scheduledOrders, setScheduledOrders] = useState<
    Map<string, ScheduledPlacement>
  >(new Map());
  const [isApplying, setIsApplying] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);
  const currentWeekStart = useMemo(
    () => startOfWeek(today, { weekStartsOn: 0 }),
    [today]
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

  const onOrderItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (item.status === ItemStatus.New || item.status === ItemStatus.OnDeck) &&
          !item.deleted &&
          !item.isScheduled
      ),
    [items]
  );

  const baseData: BaseData = useMemo(() => {
    const bucketTotals: BucketTotals = {
      overdue: { orders: 0, blocks: 0 },
      thisWeek: { orders: 0, blocks: 0 },
      nextWeek: { orders: 0, blocks: 0 },
      future: { orders: 0, blocks: 0 },
      noDue: { orders: 0, blocks: 0 },
    };

    const metaList: OrderMeta[] = [];
    const metaById = new Map<string, OrderMeta>();
    let totalBlocks = 0;

    onOrderItems.forEach((item) => {
      const blocks = calculateBlocks(item);
      const dueValue = item.dueDate;

      let dueDate: Date | null = null;
      let bucket: DueBucket = "noDue";

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

      bucketTotals[bucket].orders += 1;
      bucketTotals[bucket].blocks += blocks;
      totalBlocks += blocks;

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

    return { metaList, metaById, bucketTotals, totalBlocks };
  }, [onOrderItems, today, currentWeekEnd, nextWeekStart, nextWeekEnd]);

  const unscheduledOrders = useMemo(
    () => baseData.metaList.filter((meta) => !scheduledOrders.has(meta.id)),
    [baseData.metaList, scheduledOrders]
  );

  const scheduledGroups = useMemo(() => {
    const current: { meta: OrderMeta; placement: ScheduledPlacement }[] = [];
    const next: { meta: OrderMeta; placement: ScheduledPlacement }[] = [];

    scheduledOrders.forEach((placement, id) => {
      const meta = baseData.metaById.get(id);
      if (!meta) return;
      if (placement.week === "current") {
        current.push({ meta, placement });
      } else {
        next.push({ meta, placement });
      }
    });

    const sortByDay = (
      items: { meta: OrderMeta; placement: ScheduledPlacement }[]
    ) =>
      items.sort((a, b) => {
        const dayA = a.placement.day;
        const dayB = b.placement.day;
        if (!dayA && !dayB) return 0;
        if (!dayA) return 1;
        if (!dayB) return -1;
        return dayOrder[dayA] - dayOrder[dayB];
      });

    sortByDay(current);
    sortByDay(next);

    return { current, next };
  }, [scheduledOrders, baseData.metaById]);

  const stats = useMemo(() => {
    let blocksThisWeek = baseData.bucketTotals.thisWeek.blocks;
    let ordersThisWeek = baseData.bucketTotals.thisWeek.orders;
    let blocksNextWeek = baseData.bucketTotals.nextWeek.blocks;
    let ordersNextWeek = baseData.bucketTotals.nextWeek.orders;
    let overdueBlocks = baseData.bucketTotals.overdue.blocks;
    let overdueOrders = baseData.bucketTotals.overdue.orders;
    let unscheduledBlocks = baseData.totalBlocks;
    let unscheduledOrders = baseData.metaList.length;

    scheduledOrders.forEach((_, id) => {
      const meta = baseData.metaById.get(id);
      if (!meta) return;

      unscheduledBlocks -= meta.blocks;
      unscheduledOrders -= 1;

      switch (meta.bucket) {
        case "thisWeek":
          blocksThisWeek -= meta.blocks;
          ordersThisWeek -= 1;
          break;
        case "nextWeek":
          blocksNextWeek -= meta.blocks;
          ordersNextWeek -= 1;
          break;
        case "overdue":
          overdueBlocks -= meta.blocks;
          overdueOrders -= 1;
          break;
        default:
          break;
      }
    });

    const clamp = (value: number) => Math.max(0, value);

    return {
      thisWeek: {
        blocks: clamp(blocksThisWeek),
        orders: clamp(ordersThisWeek),
      },
      nextWeek: {
        blocks: clamp(blocksNextWeek),
        orders: clamp(ordersNextWeek),
      },
      overdue: {
        blocks: clamp(overdueBlocks),
        orders: clamp(overdueOrders),
      },
      unscheduled: {
        blocks: clamp(unscheduledBlocks),
        orders: clamp(unscheduledOrders),
      },
    };
  }, [baseData, scheduledOrders]);

  const handleSchedule = useCallback(
    (itemId: string, placement: ScheduledPlacement) => {
      setScheduledOrders((prev) => {
        const next = new Map(prev);
        next.set(itemId, placement);
        return next;
      });
    },
    []
  );

  const handleUnschedule = useCallback((itemId: string) => {
    setScheduledOrders((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setScheduledOrders(new Map());
    toast.success("Cleared planning scenario");
  }, []);

  const existingScheduledIds = useMemo(() => {
    const ids = new Set<string>();
    schedules.forEach((schedule) => {
      Object.values(schedule.schedule).forEach((dayItems) => {
        dayItems.forEach((entry) => ids.add(entry.id));
      });
    });
    return ids;
  }, [schedules]);

  const handleApply = useCallback(async () => {
    if (scheduledOrders.size === 0) return;

    setIsApplying(true);
    try {
      let appliedCount = 0;

      for (const [itemId, placement] of scheduledOrders.entries()) {
        if (existingScheduledIds.has(itemId)) {
          continue;
        }

        const meta = baseData.metaById.get(itemId);
        if (!meta) {
          continue;
        }

        const targetWeekStart =
          placement.week === "current" ? currentWeekStart : nextWeekStart;
        const weekKey = format(targetWeekStart, "yyyy-MM-dd");
        const targetDay = placement.day ?? DEFAULT_DAY;

        const weekExists = schedules.some((s) => s.weekKey === weekKey);
        if (!weekExists) {
          await createWeek(weekKey);
        }

        await addItemToDay(weekKey, targetDay, itemId);
        appliedCount += 1;
      }

      if (appliedCount > 0) {
        toast.success(`Scheduled ${appliedCount} order${appliedCount === 1 ? "" : "s"}`);
      } else {
        toast.info("No new orders were scheduled");
      }

      setScheduledOrders(new Map());
    } catch (error) {
      console.error("Failed to apply schedule:", error);
      toast.error("Failed to apply scheduling changes");
    } finally {
      setIsApplying(false);
    }
  }, [
    scheduledOrders,
    existingScheduledIds,
    baseData.metaById,
    currentWeekStart,
    nextWeekStart,
    schedules,
    addItemToDay,
    createWeek,
  ]);

  const changesCount = scheduledOrders.size;
  const hasChanges = changesCount > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-24">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              Production Planning
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Week of {format(currentWeekStart, "MMM d")} – {format(currentWeekEnd, "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges || isApplying}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              onClick={handleApply}
              disabled={!hasChanges || isApplying}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isApplying ? "Applying..." : "Apply to Planner"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr] xl:grid-cols-[400px_1fr]">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PlanningStatsCard
                title="Blocks Due This Week"
                orders={stats.thisWeek.orders}
                blocks={stats.thisWeek.blocks}
                variant="warning"
              />
              <PlanningStatsCard
                title="Blocks Due Next Week"
                orders={stats.nextWeek.orders}
                blocks={stats.nextWeek.blocks}
                variant="success"
              />
              <PlanningStatsCard
                title="Overdue Blocks"
                orders={stats.overdue.orders}
                blocks={stats.overdue.blocks}
                variant="danger"
              />
              <PlanningStatsCard
                title="Total Unscheduled"
                orders={stats.unscheduled.orders}
                blocks={stats.unscheduled.blocks}
                variant="default"
              />
            </div>

            <Card className="p-5 bg-white/90 dark:bg-gray-900/85 backdrop-blur-sm border-gray-200 dark:border-gray-800">
              <ScheduledOrdersPreview
                scheduledThisWeek={scheduledGroups.current}
                scheduledNextWeek={scheduledGroups.next}
                onUnschedule={handleUnschedule}
              />
            </Card>
          </div>

          <Card className="h-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
            <UnscheduledOrdersList
              orders={unscheduledOrders}
              onSchedule={handleSchedule}
            />
          </Card>
        </div>

        <div className="fixed left-1/2 bottom-6 z-30 w-[90%] max-w-3xl -translate-x-1/2">
          <Card className="flex items-center justify-between gap-4 px-5 py-4 shadow-xl border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {hasChanges
                ? `${changesCount} change${changesCount === 1 ? "" : "s"} ready to apply`
                : "No pending changes"}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!hasChanges || isApplying}
              >
                Reset
              </Button>
              <Button
                onClick={handleApply}
                disabled={!hasChanges || isApplying}
              >
                {isApplying ? "Applying..." : "Apply"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}


