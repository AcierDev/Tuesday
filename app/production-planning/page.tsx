"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  addWeeks,
  subWeeks,
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
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
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
    pinItemToDay,
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
  const currentWeekEnd = useMemo(
    () => endOfWeek(currentWeekStart, { weekStartsOn: 0 }),
    [currentWeekStart]
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

  // Fetch done orders from DB if they're not in the store (similar to weekly-planner)
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

  // Stats
  const stats = useMemo(() => {
    let overdueBlocks = 0,
      overdueOrders = 0;
    let thisWeekBlocks = 0,
      thisWeekOrders = 0;
    let nextWeekBlocks = 0,
      nextWeekOrders = 0;
    let totalBlocks = 0;

    unscheduledOrders.forEach((meta) => {
      totalBlocks += meta.blocks;
      if (meta.bucket === "overdue") {
        overdueBlocks += meta.blocks;
        overdueOrders++;
      } else if (meta.bucket === "thisWeek") {
        thisWeekBlocks += meta.blocks;
        thisWeekOrders++;
      } else if (meta.bucket === "nextWeek") {
        nextWeekBlocks += meta.blocks;
        nextWeekOrders++;
      }
    });

    return {
      overdue: { blocks: overdueBlocks, orders: overdueOrders },
      thisWeek: { blocks: thisWeekBlocks, orders: thisWeekOrders },
      nextWeek: { blocks: nextWeekBlocks, orders: nextWeekOrders },
      total: { blocks: totalBlocks, orders: unscheduledOrders.length },
    };
  }, [unscheduledOrders]);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
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

    // Moving from Unscheduled to Day
    if (activeContainer === "unscheduled") {
      const newItem = { id: activeId, done: false };

      // Calculate index
      let newIndex = newScheduleData.schedule[targetDay].length;
      if (overId !== targetDay) {
        const overIndex = newScheduleData.schedule[targetDay].findIndex(
          (item) => item.id === overId
        );
        if (overIndex !== -1) newIndex = overIndex;
      }

      // Insert
      newScheduleData.schedule[targetDay].splice(newIndex, 0, newItem);
    }
    // Moving between days or reordering within day
    else {
      const activeDay = activeContainer as DayName;
      const activeIndex = newScheduleData.schedule[activeDay].findIndex(
        (item) => item.id === activeId
      );

      if (activeIndex === -1) return; // Should not happen

      // Remove from old
      const deletedItems = newScheduleData.schedule[activeDay].splice(
        activeIndex,
        1
      );
      const movedItem = deletedItems[0];

      if (!movedItem) return;

      let overIndex;
      if (overId === targetDay) {
        overIndex = newScheduleData.schedule[targetDay].length;
      } else {
        overIndex = newScheduleData.schedule[targetDay].findIndex(
          (item) => item.id === overId
        );
      }

      if (overIndex === -1)
        overIndex = newScheduleData.schedule[targetDay].length;

      // Insert into new
      newScheduleData.schedule[targetDay].splice(overIndex, 0, movedItem);
    }

    await updateSchedule(currentWeekKey, newScheduleData);

    setActiveId(null);
  };

  const activeMeta = useMemo(() => {
    if (!activeId) return undefined;
    return allOrdersById.get(activeId);
  }, [activeId, allOrdersById]);

  // Auto-fill Mon-Thu of a target week with the most-due standard-size orders.
  // Items already past pre-WIP (Wip / Packaging / Done etc.) keep their
  // existing day placement and consume that day's capacity — so a day already
  // overcapacity from completed work pushes new items forward, and a day with
  // spare room pulls earlier-due items back. Sat/Sun fold into Monday's
  // capacity bucket to match the display rule.
  const handleAutoFill = async (targetWeekKey: string) => {
    const existing = schedules.find((s) => s.weekKey === targetWeekKey);

    // Build a fresh schedule shell. If the week has no record yet, persist one.
    const baseSchedule: WeeklyScheduleData = existing
      ? structuredClone(existing)
      : {
          weekKey: targetWeekKey,
          schedule: {
            Sunday: [], Monday: [], Tuesday: [], Wednesday: [],
            Thursday: [], Friday: [], Saturday: [],
          },
        };

    if (!existing) {
      try {
        await createWeek(targetWeekKey);
      } catch (e) {
        console.error("Failed to create week", e);
        return;
      }
    }

    // Partition each day's existing items into:
    //   - locked: pinned entries, items past pre-WIP, or any item whose size
    //     we can't parse (custom/named sizes — we don't auto-place them and
    //     don't know their block contribution).
    //   - movable: unpinned pre-WIP + standard-size items, eligible for
    //     redistribution.
    // Pins always trump movability so "pin to this day" actually sticks.
    const lockedByDay: Record<
      DayName,
      { id: string; done: boolean; pinned?: boolean }[]
    > = {
      Sunday: [], Monday: [], Tuesday: [], Wednesday: [],
      Thursday: [], Friday: [], Saturday: [],
    };
    const lockedBlocksByDay: Record<DayName, number> = {
      Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0,
      Thursday: 0, Friday: 0, Saturday: 0,
    };
    const pulledFromTargetWeek = new Set<string>();

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
          pulledFromTargetWeek.add(entry.id);
        } else {
          lockedByDay[day].push(entry);
          lockedBlocksByDay[day] += blocks;
        }
      });
    });

    // Items currently scheduled in OTHER weeks are off-limits; we only shuffle
    // around what's unscheduled or what was sitting in the target week.
    const scheduledInOtherWeeks = new Set<string>();
    schedules.forEach((s) => {
      if (s.weekKey === targetWeekKey) return;
      Object.values(s.schedule).forEach((dayItems) => {
        dayItems.forEach((entry) => scheduledInOtherWeeks.add(entry.id));
      });
    });

    // Anything already locked into the target week (pinned, WIP, done, or
    // custom-size) is excluded from the pool to prevent double-placement.
    const lockedItemIds = new Set<string>();
    (Object.keys(lockedByDay) as DayName[]).forEach((d) =>
      lockedByDay[d].forEach((entry) => lockedItemIds.add(entry.id))
    );

    // Pool = standard-size pre-WIP items that aren't pinned elsewhere or
    // locked into the target week. Sort by due-date urgency so the most-due
    // land in the earliest day with capacity.
    const pool = availableOrders
      .filter(
        (item) =>
          !scheduledInOtherWeeks.has(item.id) && !lockedItemIds.has(item.id)
      )
      .map((item) => ({
        id: item.id,
        item,
        blocks: calculateBlocks(item),
        dueDate: item.dueDate ? startOfDay(new Date(item.dueDate)) : null,
      }))
      .filter((entry) => entry.blocks > 0)
      .sort(compareByDueUrgency);

    // Sat/Sun fold into Monday for capacity accounting (matches display).
    const remainingByTarget: Record<DayName, number> = {
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
      // Not auto-fill targets but typed for completeness.
      Sunday: 0, Saturday: 0,
    };
    // Honors the per-day checkbox on each column. Days the user has unchecked
    // are skipped entirely so the auto-plan never lands new work there.
    const TARGET_DAYS: DayName[] = (
      ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as DayName[]
    ).filter((d) => autoPlanDays[d]);
    const newPlacements: Record<DayName, { id: string; done: boolean }[]> = {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [],
      Sunday: [], Saturday: [],
    };

    let placed = 0;
    for (const entry of pool) {
      const day = TARGET_DAYS.find((d) => remainingByTarget[d] >= entry.blocks);
      if (!day) continue;
      remainingByTarget[day] -= entry.blocks;
      newPlacements[day].push({ id: entry.id, done: false });
      placed++;
    }

    const finalSchedule: WeeklyScheduleData = {
      weekKey: targetWeekKey,
      schedule: {
        Sunday: lockedByDay.Sunday,
        Monday: [...lockedByDay.Monday, ...newPlacements.Monday],
        Tuesday: [...lockedByDay.Tuesday, ...newPlacements.Tuesday],
        Wednesday: [...lockedByDay.Wednesday, ...newPlacements.Wednesday],
        Thursday: [...lockedByDay.Thursday, ...newPlacements.Thursday],
        Friday: lockedByDay.Friday,
        Saturday: lockedByDay.Saturday,
      },
    };

    await updateSchedule(targetWeekKey, finalSchedule);
    const pulled = pulledFromTargetWeek.size;
    toast.success(
      `Auto-filled ${placed} order${placed === 1 ? "" : "s"}` +
        (pulled > 0 ? ` (${pulled} re-shuffled)` : "")
    );
  };

  const thisWeekKey = format(
    startOfWeek(new Date(), { weekStartsOn: 0 }),
    "yyyy-MM-dd"
  );
  const nextWeekKey = format(
    addWeeks(startOfWeek(new Date(), { weekStartsOn: 0 }), 1),
    "yyyy-MM-dd"
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
        {/* Sidebar */}
        <ProductionPlanningSidebar
          orders={unscheduledOrders}
          onPinToDay={(itemId, day) =>
            pinItemToDay(currentWeekKey, day, itemId)
          }
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <ProductionPlanningHeader
            currentWeekStart={currentWeekStart}
            currentWeekEnd={currentWeekEnd}
            isCurrentWeek={
              currentWeekKey ===
              format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd")
            }
            hasScheduledOrders={!!currentSchedule}
            stats={stats}
            onPreviousWeek={() => {
              const prev = subWeeks(parseISO(currentWeekKey), 1);
              setCurrentWeekKey(
                format(startOfWeek(prev, { weekStartsOn: 0 }), "yyyy-MM-dd")
              );
            }}
            onNextWeek={() => {
              const next = addWeeks(parseISO(currentWeekKey), 1);
              setCurrentWeekKey(
                format(startOfWeek(next, { weekStartsOn: 0 }), "yyyy-MM-dd")
              );
            }}
            onToday={() => {
              setCurrentWeekKey(
                format(
                  startOfWeek(new Date(), { weekStartsOn: 0 }),
                  "yyyy-MM-dd"
                )
              );
            }}
            onAutoFillThisWeek={() => handleAutoFill(thisWeekKey)}
            onAutoFillNextWeek={() => handleAutoFill(nextWeekKey)}
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

          <div className="flex-1 p-6 overflow-x-auto overflow-y-hidden">
            <div
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
                    />
                  </div>
                );
              })}
            </div>
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
