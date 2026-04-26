"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  addWeeks,
  endOfWeek,
  format,
  isBefore,
  isWithinInterval,
  startOfDay,
  startOfWeek,
  addDays,
  parseISO,
} from "date-fns";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { ProductionPlanningHeader } from "@/components/production-planning/ProductionPlanningHeader";
import { ProductionPlanningSidebar } from "@/components/production-planning/ProductionPlanningSidebar";
import { DroppableDayColumn } from "@/components/production-planning/DroppableDayColumn";
import { OrderCard } from "@/components/production-planning/OrderCard";
import { OrderMeta } from "@/components/production-planning/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { useWeeklyScheduleStore } from "@/stores/useWeeklyScheduleStore";
import {
  DayName,
  ItemStatus,
  WeeklyScheduleData,
  ScheduledOrder,
} from "@/typings/types";
import { parseSquareSize } from "@/lib/production-metrics";

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

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const DAILY_CAPACITY_BLOCKS = 1000;
const SIDEBAR_MIN_COLUMNS_WIDTH = 1000;

const DAYS: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

// Day-of-week offsets from Sunday (week start). Used to compute a column's date.
const DAY_OFFSET_FROM_WEEK_START: Record<DayName, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

// Sat/Sun work folds into Monday's column for display.
const DAYS_FOLDED_INTO_MONDAY: DayName[] = ["Saturday", "Sunday"];

// Per-day opt-in for the auto-plan run. Stored in localStorage so the user's
// pick sticks across reloads. Defaults match the original Mon–Thu target set.
type AutoPlanDayMap = Record<DayName, boolean>;
const AUTO_PLAN_STORAGE_KEY = "production-planning:auto-plan-days";
const AUTO_PLAN_DEFAULTS: AutoPlanDayMap = {
  Sunday: false,
  Monday: true,
  Tuesday: true,
  Wednesday: true,
  Thursday: true,
  Friday: false,
  Saturday: false,
};

// Local extension of ScheduledOrder that carries the pinned flag through to
// the day column (so it can sort pinned entries to the bottom).
type ScheduledDisplayOrder = ScheduledOrder & { pinned: boolean };

function classifyDueBucket(
  dueValue: string | null | undefined,
  today: Date,
  thisWeekEnd: Date,
  nextWeekStart: Date,
  nextWeekEnd: Date
): { dueDate: Date | null; bucket: OrderMeta["bucket"] } {
  if (!dueValue) return { dueDate: null, bucket: "noDue" };
  const parsed = new Date(dueValue);
  if (Number.isNaN(parsed.getTime())) return { dueDate: null, bucket: "noDue" };

  const dueDate = startOfDay(parsed);
  if (isBefore(dueDate, today)) return { dueDate, bucket: "overdue" };
  if (isWithinInterval(dueDate, { start: today, end: thisWeekEnd }))
    return { dueDate, bucket: "thisWeek" };
  if (isWithinInterval(dueDate, { start: nextWeekStart, end: nextWeekEnd }))
    return { dueDate, bucket: "nextWeek" };
  return { dueDate, bucket: "future" };
}

// Pre-WIP statuses are the only ones eligible for auto-fill redistribution.
// Once an item hits Wip or beyond, its day-placement is treated as locked
// (the team has already committed to / completed the work).
const PRE_WIP_STATUSES: ReadonlySet<ItemStatus> = new Set([
  ItemStatus.New,
  ItemStatus.OnDeck,
]);

// Compares two items by due-date urgency: most overdue first, then earliest
// upcoming, then no-due last. Stable tiebreak on id so the result is
// deterministic across re-runs.
function compareByDueUrgency(
  a: { dueDate: Date | null; id: string },
  b: { dueDate: Date | null; id: string }
): number {
  if (a.dueDate && b.dueDate) {
    const diff = a.dueDate.getTime() - b.dueDate.getTime();
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  }
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return a.id.localeCompare(b.id);
}

const WEEK_SLIDE_OFFSET = 60;
const WEEK_SLIDE_VARIANTS = {
  enter: (dir: number) => ({ x: dir * WEEK_SLIDE_OFFSET, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -WEEK_SLIDE_OFFSET, opacity: 0 }),
};

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5",
      },
    },
  }),
};

export default function ProductionPlanningPage() {
  const { items, doneItems, scheduledItems, fetchItemsByIds } = useOrderStore();
  const {
    schedules,
    updateSchedule,
    createWeek,
    removeItemFromDay,
    fetchSchedules,
    toggleItemPinned,
  } = useWeeklyScheduleStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentWeekKey, setCurrentWeekKey] = useState(() =>
    format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd")
  );

  const [autoPlanDays, setAutoPlanDays] =
    useState<AutoPlanDayMap>(AUTO_PLAN_DEFAULTS);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUTO_PLAN_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AutoPlanDayMap>;
      setAutoPlanDays({ ...AUTO_PLAN_DEFAULTS, ...parsed });
    } catch (err) {
      console.warn("Failed to load auto-plan day prefs", err);
    }
  }, []);
  const toggleAutoPlanDay = useCallback((day: DayName) => {
    setAutoPlanDays((prev) => {
      const next = { ...prev, [day]: !prev[day] };
      try {
        window.localStorage.setItem(
          AUTO_PLAN_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch (err) {
        console.warn("Failed to save auto-plan day prefs", err);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Items the user has pinned-to-sidebar — auto-plan skips these entirely.
  // Persisted server-side via /api/production-planning/excluded-items so the
  // pin sticks across reloads and machines.
  const [excludedItemIds, setExcludedItemIds] = useState<Set<string>>(
    new Set()
  );
  useEffect(() => {
    let cancelled = false;
    fetch("/api/production-planning/excluded-items")
      .then((r) => (r.ok ? r.json() : { itemIds: [] }))
      .then((data: { itemIds?: string[] }) => {
        if (cancelled) return;
        setExcludedItemIds(new Set(data.itemIds ?? []));
      })
      .catch((err) => console.warn("Failed to load sidebar pins", err));
    return () => {
      cancelled = true;
    };
  }, []);
  const toggleExcluded = useCallback(
    async (itemId: string, excluded: boolean) => {
      // Optimistic update so the pin pops immediately; reconcile from response.
      setExcludedItemIds((prev) => {
        const next = new Set(prev);
        if (excluded) next.add(itemId);
        else next.delete(itemId);
        return next;
      });
      try {
        const res = await fetch(
          "/api/production-planning/excluded-items",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId, excluded }),
          }
        );
        if (!res.ok) throw new Error("Server rejected pin update");
        const data: { itemIds?: string[] } = await res.json();
        setExcludedItemIds(new Set(data.itemIds ?? []));
      } catch (err) {
        console.error("Failed to toggle sidebar pin", err);
        toast.error("Failed to update pin");
        // Roll back on failure.
        setExcludedItemIds((prev) => {
          const next = new Set(prev);
          if (excluded) next.delete(itemId);
          else next.add(itemId);
          return next;
        });
      }
    },
    []
  );

  const today = useMemo(() => startOfDay(new Date()), []);

  // Calculate week boundaries
  const todayWeekStart = useMemo(
    () => startOfWeek(today, { weekStartsOn: 0 }),
    [today]
  );
  const todayWeekEnd = useMemo(
    () => endOfWeek(todayWeekStart, { weekStartsOn: 0 }),
    [todayWeekStart]
  );
  const todayNextWeekStart = useMemo(
    () => addWeeks(todayWeekStart, 1),
    [todayWeekStart]
  );
  const todayNextWeekEnd = useMemo(
    () => endOfWeek(todayNextWeekStart, { weekStartsOn: 0 }),
    [todayNextWeekStart]
  );

  const currentWeekStart = useMemo(
    () => startOfWeek(parseISO(currentWeekKey), { weekStartsOn: 0 }),
    [currentWeekKey]
  );

  // Filter orders: must be unscheduled-ready (New / OnDeck), not deleted, and
  // have a parseable W×H size. Custom/named sizes don't count toward the
  // 1000-blocks-per-day target since they aren't square units.
  const availableOrders = useMemo(
    () =>
      items.filter(
        (item) =>
          !item.deleted &&
          (item.status === ItemStatus.New ||
            item.status === ItemStatus.OnDeck) &&
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
        blocks: calculateBlocks(item),
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

  // Get current schedule
  const currentSchedule = useMemo(
    () => schedules.find((s) => s.weekKey === currentWeekKey),
    [schedules, currentWeekKey]
  );

  // Fetch done orders from DB if they're not in the store
  useEffect(() => {
    if (!currentSchedule) return;
    const allScheduledIds = Object.values(currentSchedule.schedule)
      .flat()
      .map((i) => i.id);

    if (allScheduledIds.length > 0) {
      fetchItemsByIds(allScheduledIds);
    }
  }, [currentSchedule, fetchItemsByIds]);

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
        blocks: calculateBlocks(item),
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

  // Group scheduled orders by day
  const dayGroups = useMemo(() => {
    const groups: Record<
      DayName,
      { orders: ScheduledDisplayOrder[]; totalBlocks: number }
    > = {
      Sunday: { orders: [], totalBlocks: 0 },
      Monday: { orders: [], totalBlocks: 0 },
      Tuesday: { orders: [], totalBlocks: 0 },
      Wednesday: { orders: [], totalBlocks: 0 },
      Thursday: { orders: [], totalBlocks: 0 },
      Friday: { orders: [], totalBlocks: 0 },
      Saturday: { orders: [], totalBlocks: 0 },
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
          groups[targetDay].totalBlocks += meta.blocks;
        });
      });
    }

    return groups;
  }, [currentSchedule, allOrdersById, currentWeekKey]);

  // DnD Sensors. Mouse activates on a small drag distance; touch waits a beat
  // so vertical scrolling on the card lists doesn't get hijacked into drags.
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findContainer = (id: string) => {
    if (unscheduledOrders.find((o) => o.id === id)) return "unscheduled";
    if (id === "unscheduled") return "unscheduled";

    // Check scheduled orders
    if (currentSchedule) {
      for (const [day, items] of Object.entries(currentSchedule.schedule)) {
        if (items.find((i) => i.id === id)) return day as DayName;
      }
    }

    // Check if it's a day column ID
    if (DAYS.includes(id as DayName)) return id as DayName;

    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id as string;
    const overId = over?.id as string;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) {
      setActiveId(null);
      return;
    }

    // 1. Drop on Unscheduled (Sidebar)
    if (overContainer === "unscheduled") {
      if (activeContainer !== "unscheduled") {
        await removeItemFromDay(
          currentWeekKey,
          activeContainer as DayName,
          activeId
        );
      }
      setActiveId(null);
      return;
    }

    // 2. Drop on a Day Column
    const targetDay = overContainer as DayName;

    // We need to construct the new schedule
    let newScheduleData: WeeklyScheduleData;

    if (!currentSchedule) {
      // Initialize if it doesn't exist
      newScheduleData = {
        weekKey: currentWeekKey,
        schedule: {
          Sunday: [],
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: [],
          Saturday: [],
        },
      };
      try {
        await createWeek(currentWeekKey);
      } catch (e) {
        console.error("Failed to create week", e);
        return;
      }
    } else {
      newScheduleData = structuredClone(currentSchedule);
    }

    // Drops always land at the end of the day's list. Display splits by the
    // `pinned` flag, so this puts new arrivals at the bottom of the unpinned
    // section regardless of array layout.
    if (activeContainer === "unscheduled") {
      newScheduleData.schedule[targetDay].push({ id: activeId, done: false });
    } else {
      const activeDay = activeContainer as DayName;
      const sourceList = newScheduleData.schedule[activeDay];
      const activeIndex = sourceList.findIndex((item) => item.id === activeId);

      if (activeIndex === -1) {
        setActiveId(null);
        return;
      }

      const [movedItem] = sourceList.splice(activeIndex, 1);
      if (!movedItem) {
        setActiveId(null);
        return;
      }

      newScheduleData.schedule[targetDay].push(movedItem);
    }

    await updateSchedule(currentWeekKey, newScheduleData);

    setActiveId(null);
  };

  const activeMeta = useMemo(() => {
    if (!activeId) return undefined;
    return allOrdersById.get(activeId);
  }, [activeId, allOrdersById]);

  // Auto-fill Mon-Thu of a target week with the most-due standard-size orders.
  // IDs the auto-plan just placed — consumed by OrderCard for a one-shot
  // "land" animation. Cleared a moment after each run so re-runs flash again.
  const [recentlyPlacedIds, setRecentlyPlacedIds] = useState<Set<string>>(
    new Set()
  );

  // Plans BOTH this and next week in a single pass: pre-WIP items locked into
  // either week stay put, then the remaining pool is greedy-packed across
  // this-Mon → this-Thu → next-Mon → next-Thu by due-date urgency. Sat/Sun
  // fold into Monday's capacity bucket to match the display rule.
  const handleAutoFill = async () => {
    type DaySlot = { weekKey: string; day: DayName };
    const targetWeekKeys = [thisWeekKey, nextWeekKey];

    // Per-week working state.
    type WeekPlan = {
      weekKey: string;
      lockedByDay: Record<
        DayName,
        { id: string; done: boolean; pinned?: boolean }[]
      >;
      lockedBlocksByDay: Record<DayName, number>;
      remaining: Record<DayName, number>;
      newPlacements: Record<DayName, { id: string; done: boolean }[]>;
      pulled: Set<string>;
    };

    const plans: WeekPlan[] = [];

    for (const weekKey of targetWeekKeys) {
      const existing = schedules.find((s) => s.weekKey === weekKey);
      const baseSchedule: WeeklyScheduleData = existing
        ? structuredClone(existing)
        : {
            weekKey,
            schedule: {
              Sunday: [], Monday: [], Tuesday: [], Wednesday: [],
              Thursday: [], Friday: [], Saturday: [],
            },
          };
      if (!existing) {
        try {
          await createWeek(weekKey);
        } catch (e) {
          console.error("Failed to create week", e);
          return;
        }
      }

      // Partition each day's existing items into locked vs pulled. Pinned
      // entries always count as locked.
      const lockedByDay: WeekPlan["lockedByDay"] = {
        Sunday: [], Monday: [], Tuesday: [], Wednesday: [],
        Thursday: [], Friday: [], Saturday: [],
      };
      const lockedBlocksByDay: Record<DayName, number> = {
        Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0,
        Thursday: 0, Friday: 0, Saturday: 0,
      };
      const pulled = new Set<string>();

      (Object.keys(baseSchedule.schedule) as DayName[]).forEach((day) => {
        baseSchedule.schedule[day].forEach((entry) => {
          const item = allOrdersById.get(entry.id)?.item;
          const blocks = item ? calculateBlocks(item) : 0;
          const isMovable =
            !entry.pinned &&
            item &&
            PRE_WIP_STATUSES.has(item.status) &&
            parseSquareSize(item.size) !== null;

          if (isMovable) {
            pulled.add(entry.id);
          } else {
            lockedByDay[day].push(entry);
            lockedBlocksByDay[day] += blocks;
          }
        });
      });

      const remaining: Record<DayName, number> = {
        Monday: Math.max(
          0,
          DAILY_CAPACITY_BLOCKS -
            lockedBlocksByDay.Monday -
            lockedBlocksByDay.Sunday -
            lockedBlocksByDay.Saturday
        ),
        Tuesday: Math.max(0, DAILY_CAPACITY_BLOCKS - lockedBlocksByDay.Tuesday),
        Wednesday: Math.max(0, DAILY_CAPACITY_BLOCKS - lockedBlocksByDay.Wednesday),
        Thursday: Math.max(0, DAILY_CAPACITY_BLOCKS - lockedBlocksByDay.Thursday),
        Friday: Math.max(0, DAILY_CAPACITY_BLOCKS - lockedBlocksByDay.Friday),
        Sunday: 0, Saturday: 0,
      };

      plans.push({
        weekKey,
        lockedByDay,
        lockedBlocksByDay,
        remaining,
        newPlacements: {
          Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [],
          Sunday: [], Saturday: [],
        },
        pulled,
      });
    }

    // Anything locked across either target week is off-limits for the pool —
    // prevents double placement. Items in OTHER weeks (further out) are also
    // off-limits.
    const lockedItemIds = new Set<string>();
    plans.forEach((p) =>
      (Object.keys(p.lockedByDay) as DayName[]).forEach((d) =>
        p.lockedByDay[d].forEach((entry) => lockedItemIds.add(entry.id))
      )
    );
    const targetWeekSet = new Set(targetWeekKeys);
    const scheduledInOtherWeeks = new Set<string>();
    schedules.forEach((s) => {
      if (targetWeekSet.has(s.weekKey)) return;
      Object.values(s.schedule).forEach((dayItems) =>
        dayItems.forEach((entry) => scheduledInOtherWeeks.add(entry.id))
      );
    });

    const pool = availableOrders
      .filter(
        (item) =>
          !scheduledInOtherWeeks.has(item.id) &&
          !lockedItemIds.has(item.id) &&
          !excludedItemIds.has(item.id)
      )
      .map((item) => ({
        id: item.id,
        item,
        blocks: calculateBlocks(item),
        dueDate: item.dueDate ? startOfDay(new Date(item.dueDate)) : null,
      }))
      .filter((entry) => entry.blocks > 0)
      .sort(compareByDueUrgency);

    // Build the slot order: for each week (this → next), each enabled day
    // (Mon → Fri minus user-unchecked). Most-due items land in the earliest
    // slot with room.
    const enabledDays: DayName[] = (
      ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as DayName[]
    ).filter((d) => autoPlanDays[d]);
    const slots: DaySlot[] = plans.flatMap((p) =>
      enabledDays.map((day) => ({ weekKey: p.weekKey, day }))
    );
    const planByWeekKey = new Map(plans.map((p) => [p.weekKey, p]));

    const placedIds = new Set<string>();
    for (const entry of pool) {
      const slot = slots.find((s) => {
        const plan = planByWeekKey.get(s.weekKey)!;
        return plan.remaining[s.day] >= entry.blocks;
      });
      if (!slot) continue;
      const plan = planByWeekKey.get(slot.weekKey)!;
      plan.remaining[slot.day] -= entry.blocks;
      plan.newPlacements[slot.day].push({ id: entry.id, done: false });
      placedIds.add(entry.id);
    }

    // Persist each affected week.
    for (const plan of plans) {
      const finalSchedule: WeeklyScheduleData = {
        weekKey: plan.weekKey,
        schedule: {
          Sunday: plan.lockedByDay.Sunday,
          Monday: [...plan.lockedByDay.Monday, ...plan.newPlacements.Monday],
          Tuesday: [...plan.lockedByDay.Tuesday, ...plan.newPlacements.Tuesday],
          Wednesday: [
            ...plan.lockedByDay.Wednesday,
            ...plan.newPlacements.Wednesday,
          ],
          Thursday: [...plan.lockedByDay.Thursday, ...plan.newPlacements.Thursday],
          Friday: [...plan.lockedByDay.Friday, ...plan.newPlacements.Friday],
          Saturday: plan.lockedByDay.Saturday,
        },
      };
      await updateSchedule(plan.weekKey, finalSchedule);
    }

    // Trigger the placement animation. Clear after the animation has had time
    // to play out so re-running auto-plan re-flashes.
    setRecentlyPlacedIds(placedIds);
    setTimeout(() => setRecentlyPlacedIds(new Set()), 1600);
  };

  const thisWeekKey = format(
    startOfWeek(new Date(), { weekStartsOn: 0 }),
    "yyyy-MM-dd"
  );
  const nextWeekKey = format(
    addWeeks(startOfWeek(new Date(), { weekStartsOn: 0 }), 1),
    "yyyy-MM-dd"
  );
  const viewingNextWeek = currentWeekKey === nextWeekKey;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
        {/* Header — full width across the top, above sidebar + content. */}
        <ProductionPlanningHeader
          viewingNextWeek={viewingNextWeek}
          hasScheduledOrders={!!currentSchedule}
          onToggleWeek={() =>
            setCurrentWeekKey(viewingNextWeek ? thisWeekKey : nextWeekKey)
          }
          onAutoFill={() => handleAutoFill()}
          onClearWeek={() => {
            if (currentSchedule) {
              const clearedSchedule = {
                ...currentSchedule,
                schedule: {
                  Sunday: [],
                  Monday: [],
                  Tuesday: [],
                  Wednesday: [],
                  Thursday: [],
                  Friday: [],
                  Saturday: [],
                },
              };
              updateSchedule(currentWeekKey, clearedSchedule);
              toast.success("Week cleared");
            }
          }}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar — sits below the header so the header can stretch
              edge-to-edge across the page. */}
          <ProductionPlanningSidebar
            orders={unscheduledOrders}
            excludedItemIds={excludedItemIds}
            onToggleExcluded={toggleExcluded}
          />

          {/* Day columns slide horizontally on week toggle. Direction is
              passed via AnimatePresence's `custom` so the latest value drives
              both the exiting and entering child. */}
          <div className="flex-1 p-6 overflow-x-auto overflow-y-hidden relative">
            <AnimatePresence
              initial={false}
              mode="wait"
              custom={viewingNextWeek ? 1 : -1}
            >
              <motion.div
                key={currentWeekKey}
                custom={viewingNextWeek ? 1 : -1}
                variants={WEEK_SLIDE_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                className="flex gap-4 h-full"
                style={{ minWidth: SIDEBAR_MIN_COLUMNS_WIDTH }}
              >
                {DAYS.map((day) => {
                  const date = addDays(
                    currentWeekStart,
                    DAY_OFFSET_FROM_WEEK_START[day]
                  );

                  return (
                    <div key={day} className="flex-1 min-w-[200px] h-full">
                      <DroppableDayColumn
                        day={day}
                        dateLabel={format(date, "MMM d")}
                        orders={dayGroups[day].orders}
                        ordersById={allOrdersById}
                        totalBlocks={dayGroups[day].totalBlocks}
                        capacity={DAILY_CAPACITY_BLOCKS}
                        onUnschedule={(id, actualDay) =>
                          removeItemFromDay(currentWeekKey, actualDay, id)
                        }
                        onTogglePin={(id, actualDay) =>
                          toggleItemPinned(currentWeekKey, actualDay, id)
                        }
                        date={date}
                        autoPlanEnabled={autoPlanDays[day]}
                        onToggleAutoPlan={() => toggleAutoPlanDay(day)}
                        recentlyPlacedIds={recentlyPlacedIds}
                      />
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeId && activeMeta ? (
          <div className="opacity-80 rotate-2 cursor-grabbing">
            <OrderCard meta={activeMeta} isScheduled={true} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
