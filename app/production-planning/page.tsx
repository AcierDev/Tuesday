"use client";

import { useMemo, useState, useEffect, useCallback, startTransition } from "react";
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
  DropAnimation,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { ProductionPlanningHeader } from "@/components/production-planning/ProductionPlanningHeader";
import { ProductionPlanningSidebar } from "@/components/production-planning/ProductionPlanningSidebar";
import { DroppableDayColumn } from "@/components/production-planning/DroppableDayColumn";
import { OrderCard } from "@/components/production-planning/OrderCard";
import { OrderContextMenu } from "@/components/production-planning/OrderContextMenu";
import { OrderMeta } from "@/components/production-planning/types";
import {
  POST_WIP_STATUSES,
  PRE_WIP_STATUSES,
} from "@/components/production-planning/constants";
import {
  AUTO_PLAN_WEIGHT_DEFAULTS,
  URGENT_PULL_LEVEL_TO_PER_DAY,
  type AutoPlanWeights,
} from "@/components/production-planning/AutoPlanSettingsDialog";
import { useOrderStore } from "@/stores/useOrderStore";
import { useWeeklyScheduleStore } from "@/stores/useWeeklyScheduleStore";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import {
  DayName,
  Item,
  ItemStatus,
  WeeklyScheduleData,
  ScheduledOrder,
} from "@/typings/types";
import { parseSquareSize } from "@/lib/production-metrics";
import { getDesignFamily } from "@/components/production-planning/design-family";

function calculateSquares(item: { size?: string }): number {
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

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const DAILY_CAPACITY_SQUARES = 1000;
// Daily total turns green once it crosses this — the full capacity (1000) is
// the displayed denominator, but anything past 850 is "good enough" in practice.
const DAILY_GREEN_THRESHOLD_SQUARES = 850;

// Auto-plan due-date weighting. Each slot's score combines design-family
// "anchor" squares with a urgency bonus computed from how far the slot is
// from the entry's due date. Outside the urgent window the bonus is a mild
// tiebreaker (capped buffer × base weight), so design grouping still
// dominates. Within the urgent window, the bonus is multiplied so a
// time-sensitive order can override modest grouping pulls. User-tunable via
// the auto-plan settings dialog; defaults live in AutoPlanSettingsDialog.tsx.
const AUTO_PLAN_WEIGHTS_STORAGE_KEY = "production-planning:auto-plan-weights";

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
const EXCLUDED_ITEMS_STORAGE_KEY = "production-planning:excluded-item-ids";
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

const WEEK_SLIDE_OFFSET = 60;
const WEEK_SLIDE_VARIANTS = {
  enter: (dir: number) => ({ x: dir * WEEK_SLIDE_OFFSET, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -WEEK_SLIDE_OFFSET, opacity: 0 }),
};

const DROP_ANIMATION: DropAnimation = {
  duration: 180,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  keyframes: ({ transform }) => {
    const start = CSS.Transform.toString(transform.initial);
    return [
      { opacity: 1, transform: start },
      { opacity: 0, transform: start },
    ];
  },
};

export default function ProductionPlanningPage() {
  const { items, doneItems, scheduledItems, fetchItemsByIds, updateItem } =
    useOrderStore();
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

  // Right-click context menu for changing an order's status from the planner.
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    itemId: string;
  } | null>(null);
  const handleCardContextMenu = useCallback(
    (e: React.MouseEvent, itemId: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, itemId });
    },
    []
  );
  const handleSelectStatus = useCallback(
    async (itemId: string, status: ItemStatus) => {
      const target = [...items, ...doneItems, ...scheduledItems].find(
        (i) => i.id === itemId
      );
      if (!target) {
        console.error("Could not find that order");
        return;
      }
      if (target.status === status) return;
      try {
        await updateItem({
          ...target,
          prevStatus: target.status,
          status,
        });
      } catch (err) {
        console.error("Failed to update status", err);
      }
    },
    [items, doneItems, scheduledItems, updateItem]
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

  // Auto-plan scoring weights — tunable from the settings popover and
  // persisted to localStorage so the user's tuning sticks across reloads.
  const [autoPlanWeights, setAutoPlanWeights] = useState<AutoPlanWeights>(
    AUTO_PLAN_WEIGHT_DEFAULTS
  );
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUTO_PLAN_WEIGHTS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AutoPlanWeights>;
      setAutoPlanWeights({ ...AUTO_PLAN_WEIGHT_DEFAULTS, ...parsed });
    } catch (err) {
      console.warn("Failed to load auto-plan weights", err);
    }
  }, []);
  const updateAutoPlanWeights = useCallback((next: AutoPlanWeights) => {
    setAutoPlanWeights(next);
    try {
      window.localStorage.setItem(
        AUTO_PLAN_WEIGHTS_STORAGE_KEY,
        JSON.stringify(next)
      );
    } catch (err) {
      console.warn("Failed to save auto-plan weights", err);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Items the user has pinned-to-sidebar — auto-plan skips these entirely.
  // Persisted server-side via /api/production-planning/excluded-items so the
  // pin sticks across reloads and machines. Mirrored to localStorage so the
  // pinned state shows on first paint instead of flashing in after the fetch.
  const [excludedItemIds, setExcludedItemIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(EXCLUDED_ITEMS_STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? new Set(parsed.filter((v): v is string => typeof v === "string"))
        : new Set();
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    let cancelled = false;
    fetch("/api/production-planning/excluded-items")
      .then((r) => (r.ok ? r.json() : { itemIds: [] }))
      .then((data: { itemIds?: string[] }) => {
        if (cancelled) return;
        const ids = data.itemIds ?? [];
        setExcludedItemIds(new Set(ids));
        try {
          window.localStorage.setItem(
            EXCLUDED_ITEMS_STORAGE_KEY,
            JSON.stringify(ids)
          );
        } catch (err) {
          console.warn("Failed to cache sidebar pins", err);
        }
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
        const ids = data.itemIds ?? [];
        setExcludedItemIds(new Set(ids));
        try {
          window.localStorage.setItem(
            EXCLUDED_ITEMS_STORAGE_KEY,
            JSON.stringify(ids)
          );
        } catch (cacheErr) {
          console.warn("Failed to cache sidebar pins", cacheErr);
        }
      } catch (err) {
        console.error("Failed to toggle sidebar pin", err);
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

  // Stamped from useEffect so the date is always read from the *browser's*
  // clock — Vercel's SSR runs in UTC, which after ~5pm PT reads as the next
  // day and was making "today" jump to the wrong column. Defaults to the
  // start of the week-key Sunday so the page renders sanely pre-hydration.
  const [today, setToday] = useState<Date>(() =>
    startOfDay(parseISO(currentWeekKey))
  );
  useEffect(() => {
    setToday(startOfDay(new Date()));
  }, []);

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
  // 1000-squares-per-day target since they aren't square units.
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

  // Get current schedule
  const currentSchedule = useMemo(
    () => schedules.find((s) => s.weekKey === currentWeekKey),
    [schedules, currentWeekKey]
  );

  // Undo/redo for the current week's schedule. Stack resets when the
  // user switches between This Week and Next Week so cross-week ghosts
  // can't reappear.
  useUndoRedo<WeeklyScheduleData["schedule"] | undefined>({
    current: currentSchedule?.schedule,
    apply: (next) => {
      if (!next || !currentSchedule) return;
      updateSchedule(currentWeekKey, { ...currentSchedule, schedule: next });
    },
    isEqual: (a, b) => a === b,
    historyKey: currentWeekKey,
    enabled: !!currentSchedule,
  });

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

  // Group scheduled orders by day
  const dayGroups = useMemo(() => {
    const groups: Record<
      DayName,
      {
        orders: ScheduledDisplayOrder[];
        totalSquares: number;
        gluedSquares: number;
      }
    > = {
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

    // Insertion index follows the cursor. Dropping on an unpinned card
    // inserts before it (cursor on top half) or after it (bottom half) so the
    // user can land on either side of any card — including the very last
    // one when the column body is content-sized and there's no gap to hover
    // below it. Pinned cards always slot the new arrival at the top of
    // unpinned. Column body / empty area falls through to the end. Mirrors
    // the ghost-preview logic in DroppableDayColumn.
    const activeRect = active.rect.current.translated;
    const overRect = over.rect;
    const dropsAfterOver =
      !!activeRect &&
      !!overRect &&
      activeRect.top + activeRect.height / 2 >
        overRect.top + overRect.height / 2;
    const indexFromOver = (list: typeof newScheduleData.schedule[DayName]) => {
      if (!overId || overId === targetDay) return list.length;
      const idx = list.findIndex((item) => item.id === overId);
      if (idx === -1) return list.length;
      if (list[idx]?.pinned) {
        const firstUnpinnedIdx = list.findIndex((item) => !item.pinned);
        return firstUnpinnedIdx !== -1 ? firstUnpinnedIdx : list.length;
      }
      return idx + (dropsAfterOver ? 1 : 0);
    };

    if (activeContainer === "unscheduled") {
      const targetList = newScheduleData.schedule[targetDay];
      targetList.splice(indexFromOver(targetList), 0, {
        id: activeId,
        done: false,
      });
    } else {
      const activeDay = activeContainer as DayName;
      const sourceList = newScheduleData.schedule[activeDay];
      const activeIndex = sourceList.findIndex((item) => item.id === activeId);

      if (activeIndex === -1) {
        setActiveId(null);
        return;
      }

      if (activeDay === targetDay) {
        // Same-day reorder: use arrayMove semantics so the drop matches what
        // dnd-kit's sortable already animated during the drag (active swaps
        // into the over-card's slot). The previous logic computed
        // indexFromOver against the post-splice list, which produced an
        // off-by-one for "drop above an item I was already above" — the card
        // landed back at its source slot and looked like a snap-back.
        let newIndex: number;
        if (!overId || overId === targetDay) {
          newIndex = sourceList.length - 1;
        } else if (overId === activeId) {
          newIndex = activeIndex;
        } else {
          const overIdx = sourceList.findIndex((item) => item.id === overId);
          if (overIdx === -1) {
            newIndex = activeIndex;
          } else if (sourceList[overIdx]?.pinned) {
            const firstUnpinnedIdx = sourceList.findIndex((item) => !item.pinned);
            newIndex = firstUnpinnedIdx !== -1 ? firstUnpinnedIdx : activeIndex;
          } else {
            newIndex = overIdx;
          }
        }

        if (newIndex !== activeIndex) {
          const [moved] = sourceList.splice(activeIndex, 1);
          if (moved) sourceList.splice(newIndex, 0, moved);
        }
      } else {
        const [movedItem] = sourceList.splice(activeIndex, 1);
        if (!movedItem) {
          setActiveId(null);
          return;
        }
        const targetList = newScheduleData.schedule[targetDay];
        targetList.splice(indexFromOver(targetList), 0, movedItem);
      }
    }

    await updateSchedule(currentWeekKey, newScheduleData);

    setActiveId(null);
  };

  const activeMeta = useMemo(() => {
    if (!activeId) return undefined;
    return allOrdersById.get(activeId);
  }, [activeId, allOrdersById]);

  // Reference date for the floating drag overlay's due-badge. Without this the
  // overlay falls back to "today" and the badge flips numbers mid-drag, even
  // though the source slot in the day column keeps showing the day-relative
  // value. Sat/Sun fold into Monday's display column, so mirror that here.
  const activeReferenceDate = useMemo(() => {
    if (!activeId || !currentSchedule) return undefined;
    for (const [day, dayItems] of Object.entries(currentSchedule.schedule)) {
      if (!dayItems.some((i) => i.id === activeId)) continue;
      const dayName = day as DayName;
      const displayDay: DayName = DAYS_FOLDED_INTO_MONDAY.includes(dayName)
        ? "Monday"
        : dayName;
      return addDays(currentWeekStart, DAY_OFFSET_FROM_WEEK_START[displayDay]);
    }
    return undefined;
  }, [activeId, currentSchedule, currentWeekStart]);

  // Mirror the source card's pin state on the floating drag overlay so the
  // pin doesn't visually pop in/out as the user grabs a card.
  const activeIsPinned = useMemo(() => {
    if (!activeId) return false;
    if (excludedItemIds.has(activeId)) return true;
    if (!currentSchedule) return false;
    for (const dayItems of Object.values(currentSchedule.schedule)) {
      const entry = dayItems.find((i) => i.id === activeId);
      if (entry) return !!entry.pinned;
    }
    return false;
  }, [activeId, currentSchedule, excludedItemIds]);

  // Auto-fill Mon-Thu of a target week with the most-due standard-size orders.
  // IDs the auto-plan just placed — consumed by OrderCard for a one-shot
  // "land" animation. Cleared a moment after each run so re-runs flash again.
  const [recentlyPlacedIds, setRecentlyPlacedIds] = useState<Set<string>>(
    new Set()
  );

  // Plans BOTH this and next week jointly: locked items (WIP+, pinned, or
  // non-parseable size) stay put; the remaining pool is grouped by design
  // family and packed across enabled days. Multi-item families bias toward
  // the latest day that can hold them all (preserves slack and matches the
  // "consolidate similar work" intent). Singletons keep the legacy earliest-
  // valid behavior so the planner doesn't suddenly cram every item against
  // its due date. Sat/Sun fold into Monday's capacity bucket.
  const handleAutoFill = async () => {
    type SlotKey = string; // `${weekKey}|${day}`
    type Slot = {
      weekKey: string;
      day: DayName;
      date: Date;
      key: SlotKey;
      remaining: number;
    };
    type WeekPlan = {
      weekKey: string;
      weekStart: Date;
      lockedByDay: Record<
        DayName,
        { id: string; done: boolean; pinned?: boolean }[]
      >;
    };

    const targetWeekKeys = [thisWeekKey, nextWeekKey];

    //╔═══╗ ═══════════════════════════════════════════════════════════════ ╔═══╗
    //║ 🔒 PARTITION LOCKED VS MOVABLE                                       ║
    //╚═══╝ ═══════════════════════════════════════════════════════════════ ╚═══╝
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

      const lockedByDay: WeekPlan["lockedByDay"] = {
        Sunday: [], Monday: [], Tuesday: [], Wednesday: [],
        Thursday: [], Friday: [], Saturday: [],
      };
      (Object.keys(baseSchedule.schedule) as DayName[]).forEach((day) => {
        baseSchedule.schedule[day].forEach((entry) => {
          const item = allOrdersById.get(entry.id)?.item;
          const isMovable =
            !entry.pinned &&
            item &&
            PRE_WIP_STATUSES.has(item.status) &&
            parseSquareSize(item.size) !== null;
          if (!isMovable) lockedByDay[day].push(entry);
        });
      });

      plans.push({
        weekKey,
        weekStart: startOfDay(parseISO(weekKey)),
        lockedByDay,
      });
    }

    //╔═══╗ ═══════════════════════════════════════════════════════════════ ╔═══╗
    //║ 🗓️ BUILD CHRONOLOGICAL SLOT LIST WITH REMAINING CAPACITY             ║
    //╚═══╝ ═══════════════════════════════════════════════════════════════ ╚═══╝
    const enabledDays: DayName[] = (
      ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as DayName[]
    ).filter((d) => autoPlanDays[d]);

    // Skip days that have already passed — placing new pre-WIP work into a
    // past day is meaningless (e.g. running auto-plan on Tuesday should never
    // fill Monday's leftover capacity).
    const todayMs = startOfDay(new Date()).getTime();

    const slots: Slot[] = [];
    const slotByKey = new Map<SlotKey, Slot>();
    for (const plan of plans) {
      for (const day of enabledDays) {
        const date = startOfDay(
          addDays(plan.weekStart, DAY_OFFSET_FROM_WEEK_START[day])
        );
        if (date.getTime() < todayMs) continue;
        // Sat/Sun locked work folds into Monday's remaining capacity (matches
        // the column display rule — those items show on Monday).
        let lockedSquares = 0;
        const accumulate = (entries: { id: string }[]) => {
          for (const entry of entries) {
            const item = allOrdersById.get(entry.id)?.item;
            if (item) lockedSquares += calculateSquares(item);
          }
        };
        accumulate(plan.lockedByDay[day]);
        if (day === "Monday") {
          accumulate(plan.lockedByDay.Saturday);
          accumulate(plan.lockedByDay.Sunday);
        }
        const slot: Slot = {
          weekKey: plan.weekKey,
          day,
          date,
          key: `${plan.weekKey}|${day}`,
          remaining: Math.max(0, DAILY_CAPACITY_SQUARES - lockedSquares),
        };
        slots.push(slot);
        slotByKey.set(slot.key, slot);
      }
    }

    //╔═══╗ ═══════════════════════════════════════════════════════════════ ╔═══╗
    //║ ⚓ FAMILY ANCHOR SCORES (locked same-family squares per slot)        ║
    //╚═══╝ ═══════════════════════════════════════════════════════════════ ╚═══╝
    // Higher anchor score → that slot already has WIP/locked work in this
    // family, so dropping more there minimises color/setup churn.
    const anchorScore = new Map<string, number>();
    const anchorKey = (slot: Slot, family: string) => `${slot.key}::${family}`;
    const bumpAnchor = (slot: Slot, family: string, squares: number) => {
      const k = anchorKey(slot, family);
      anchorScore.set(k, (anchorScore.get(k) ?? 0) + squares);
    };
    for (const plan of plans) {
      for (const day of enabledDays) {
        const slot = slotByKey.get(`${plan.weekKey}|${day}`);
        if (!slot) continue; // past day — skipped above
        const accumulate = (entries: { id: string }[]) => {
          for (const entry of entries) {
            const item = allOrdersById.get(entry.id)?.item;
            if (!item) continue;
            bumpAnchor(
              slot,
              getDesignFamily(item.design, entry.id),
              calculateSquares(item)
            );
          }
        };
        accumulate(plan.lockedByDay[day]);
        if (day === "Monday") {
          accumulate(plan.lockedByDay.Saturday);
          accumulate(plan.lockedByDay.Sunday);
        }
      }
    }

    //╔═══╗ ═══════════════════════════════════════════════════════════════ ╔═══╗
    //║ 🪣 BUILD POOL OF MOVABLE ITEMS                                       ║
    //╚═══╝ ═══════════════════════════════════════════════════════════════ ╚═══╝
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

    type PoolEntry = {
      id: string;
      item: Item;
      squares: number;
      dueMs: number; // Infinity when no due date
      family: string;
    };
    const parseDueMs = (raw: string | undefined): number => {
      if (!raw) return Infinity;
      const t = startOfDay(new Date(raw)).getTime();
      // Invalid date strings → "no due" (no constraint).
      if (!Number.isFinite(t)) return Infinity;
      // Past dates are returned as-is so the sort can prioritize the
      // most-overdue item first. Eligibility for overdue items is handled
      // via a date-relaxed fallback further down.
      return t;
    };
    const pool: PoolEntry[] = availableOrders
      .filter(
        (item) =>
          !scheduledInOtherWeeks.has(item.id) &&
          !lockedItemIds.has(item.id) &&
          !excludedItemIds.has(item.id)
      )
      .map((item) => ({
        id: item.id,
        item,
        squares: calculateSquares(item),
        dueMs: parseDueMs(item.dueDate),
        family: getDesignFamily(item.design, item.id),
      }))
      .filter((entry) => entry.squares > 0);

    //╔═══╗ ═══════════════════════════════════════════════════════════════ ╔═══╗
    //║ 👨‍👩‍👧 GROUP BY FAMILY, ORDER FAMILIES BY URGENCY                       ║
    //╚═══╝ ═══════════════════════════════════════════════════════════════ ╚═══╝
    const families = new Map<string, PoolEntry[]>();
    for (const entry of pool) {
      const arr = families.get(entry.family);
      if (arr) arr.push(entry);
      else families.set(entry.family, [entry]);
    }
    // Within a family: most-urgent first, then largest squares first (puts
    // hardest-to-fit items at the head when we have to split the family).
    for (const arr of families.values()) {
      arr.sort((a, b) => {
        if (a.dueMs !== b.dueMs) return a.dueMs - b.dueMs;
        if (a.squares !== b.squares) return b.squares - a.squares;
        return a.id.localeCompare(b.id);
      });
    }
    // Across families: most-urgent earliest-due first; tiebreak by total
    // squares desc so big families claim a clean slot before fragments.
    const familyOrder = Array.from(families.keys()).sort((a, b) => {
      const aItems = families.get(a)!;
      const bItems = families.get(b)!;
      const aMin = aItems.reduce((m, e) => Math.min(m, e.dueMs), Infinity);
      const bMin = bItems.reduce((m, e) => Math.min(m, e.dueMs), Infinity);
      if (aMin !== bMin) return aMin - bMin;
      const aSq = aItems.reduce((s, e) => s + e.squares, 0);
      const bSq = bItems.reduce((s, e) => s + e.squares, 0);
      if (aSq !== bSq) return bSq - aSq;
      return a.localeCompare(b);
    });

    //╔═══╗ ═══════════════════════════════════════════════════════════════ ╔═══╗
    //║ 🎯 PLACE EACH FAMILY                                                 ║
    //╚═══╝ ═══════════════════════════════════════════════════════════════ ╚═══╝
    type Placement = { slotKey: SlotKey; entry: PoolEntry };
    const placements: Placement[] = [];

    // Earliness bonus pulled toward earlier slots — only kicks in once the
    // due date is within the urgent window. Outside the window, design
    // grouping rules unchallenged. Buffer is capped at the window so a
    // deadline 7 days out doesn't drag everything to Monday. Past-due slots
    // (negative buffer, only reachable via the date-relaxed fallback) are
    // penalized so the earliest available slot still wins.
    const MS_PER_DAY = 86400000;
    const { urgentWindowDays, urgentPullLevel } = autoPlanWeights;
    const urgentPullPerDay = urgentPullLevel * URGENT_PULL_LEVEL_TO_PER_DAY;
    const urgencyBonus = (slot: Slot, refDueMs: number): number => {
      if (!Number.isFinite(refDueMs)) return 0;
      const daysFromTodayToDue = (refDueMs - todayMs) / MS_PER_DAY;
      if (daysFromTodayToDue > urgentWindowDays) return 0;
      const bufferDays = (refDueMs - slot.date.getTime()) / MS_PER_DAY;
      const effectiveBuffer = Math.min(urgentWindowDays, bufferDays);
      return effectiveBuffer * urgentPullPerDay;
    };

    // Picks among candidates by:
    //   1. combined score = same-family anchor squares + due-date urgency bonus
    //      (higher wins → consolidation, but a near-due item can pull earlier)
    //   2. tiebreak by date (later wins for `preferLate`, earlier otherwise)
    const pickSlot = (
      candidates: Slot[],
      family: string,
      preferLate: boolean,
      refDueMs: number
    ): Slot | undefined => {
      let chosen: Slot | undefined;
      let bestScore = -Infinity;
      let bestDate = preferLate ? -Infinity : Infinity;
      for (const cand of candidates) {
        const anchor = anchorScore.get(anchorKey(cand, family)) ?? 0;
        const score = anchor + urgencyBonus(cand, refDueMs);
        const t = cand.date.getTime();
        if (score > bestScore) {
          bestScore = score;
          bestDate = t;
          chosen = cand;
        } else if (score === bestScore) {
          const better = preferLate ? t > bestDate : t < bestDate;
          if (better) {
            bestDate = t;
            chosen = cand;
          }
        }
      }
      return chosen;
    };

    const place = (slot: Slot, entry: PoolEntry) => {
      slot.remaining -= entry.squares;
      bumpAnchor(slot, entry.family, entry.squares);
      placements.push({ slotKey: slot.key, entry });
    };

    for (const family of familyOrder) {
      const items = families.get(family)!;
      const totalSquares = items.reduce((s, e) => s + e.squares, 0);
      const familyDeadline = items.reduce(
        (m, e) => Math.min(m, e.dueMs),
        Infinity
      );

      // ── Try whole-family fit on a single slot ──────────────────────────
      // Date-eligible: only slots before the family's earliest due. If that
      // window has no slot with the capacity, fall back to any slot with the
      // capacity so an overdue family still lands together somewhere.
      let wholeCandidates = slots.filter(
        (s) => s.date.getTime() <= familyDeadline && s.remaining >= totalSquares
      );
      if (wholeCandidates.length === 0) {
        wholeCandidates = slots.filter((s) => s.remaining >= totalSquares);
      }
      if (wholeCandidates.length > 0) {
        // Multi-item families: prefer LATEST valid slot (group + preserve
        // slack for incoming work). Singletons: keep current earliest-valid
        // load-balancing — anchor score still wins if a same-family
        // locked item exists somewhere.
        const chosen = pickSlot(
          wholeCandidates,
          family,
          /* preferLate */ items.length > 1,
          familyDeadline
        );
        if (chosen) {
          for (const entry of items) place(chosen, entry);
          continue;
        }
      }

      // ── Split: place items one at a time ───────────────────────────────
      // Each item respects its OWN due date (looser than familyDeadline for
      // some items). The anchor that grows as we place will pull subsequent
      // items toward the same day when capacity allows.
      for (const entry of items) {
        let eligible = slots.filter(
          (s) => s.date.getTime() <= entry.dueMs && s.remaining >= entry.squares
        );
        // Overdue items (or items whose entire date-eligible window is full)
        // would otherwise be silently dropped — fall back to any slot with
        // capacity so they still get scheduled. pickSlot below picks the
        // earliest slot among them, so overdue work bubbles to the front.
        if (eligible.length === 0) {
          eligible = slots.filter((s) => s.remaining >= entry.squares);
        }
        if (eligible.length === 0) continue; // truly too big for any day

        // For splits we want earliest-valid as the cold-start fallback (the
        // family already spans days, so spreading the head as early as
        // possible preserves the most slack). Anchor still wins if any slot
        // already holds same-family work.
        const chosen = pickSlot(
          eligible,
          family,
          /* preferLate */ false,
          entry.dueMs
        );
        if (chosen) place(chosen, entry);
      }
    }

    //╔═══╗ ═══════════════════════════════════════════════════════════════ ╔═══╗
    //║ 💾 PERSIST PER WEEK                                                  ║
    //╚═══╝ ═══════════════════════════════════════════════════════════════ ╚═══╝
    const placementsBySlot = new Map<SlotKey, { id: string; done: boolean }[]>();
    for (const p of placements) {
      const arr = placementsBySlot.get(p.slotKey);
      const placed = { id: p.entry.id, done: false };
      if (arr) arr.push(placed);
      else placementsBySlot.set(p.slotKey, [placed]);
    }
    for (const plan of plans) {
      const dayPlacements = (day: DayName) =>
        placementsBySlot.get(`${plan.weekKey}|${day}`) ?? [];
      const finalSchedule: WeeklyScheduleData = {
        weekKey: plan.weekKey,
        schedule: {
          Sunday: plan.lockedByDay.Sunday,
          Monday: [...plan.lockedByDay.Monday, ...dayPlacements("Monday")],
          Tuesday: [...plan.lockedByDay.Tuesday, ...dayPlacements("Tuesday")],
          Wednesday: [
            ...plan.lockedByDay.Wednesday,
            ...dayPlacements("Wednesday"),
          ],
          Thursday: [
            ...plan.lockedByDay.Thursday,
            ...dayPlacements("Thursday"),
          ],
          Friday: [...plan.lockedByDay.Friday, ...dayPlacements("Friday")],
          Saturday: plan.lockedByDay.Saturday,
        },
      };
      await updateSchedule(plan.weekKey, finalSchedule);
    }

    // Trigger the placement animation. Clear after the animation has had time
    // to play out so re-running auto-plan re-flashes.
    setRecentlyPlacedIds(new Set(placements.map((p) => p.entry.id)));
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

  // Today's column gets centered on mount in the mobile snap-scroller. Sat/Sun
  // fold into Monday's column to match the display rule. Computed in
  // useEffect (not useMemo) so it always uses the *browser's* local day —
  // SSR runs on Vercel in UTC, which after ~5pm PT already reads as the next
  // day, and a hydration mismatch on the highlighted column was sticking.
  const [todayColumnDay, setTodayColumnDay] = useState<DayName | null>(null);
  useEffect(() => {
    const dayName = format(new Date(), "EEEE") as DayName;
    setTodayColumnDay(
      DAYS_FOLDED_INTO_MONDAY.includes(dayName) ? "Monday" : dayName
    );
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden select-none">
        {/* Header — full width across the top, above sidebar + content. */}
        <ProductionPlanningHeader
          viewingNextWeek={viewingNextWeek}
          hasScheduledOrders={!!currentSchedule}
          scheduledItemCount={
            currentSchedule
              ? Object.values(currentSchedule.schedule).reduce(
                  (sum, dayItems) => sum + dayItems.length,
                  0
                )
              : 0
          }
          onToggleWeek={() =>
            startTransition(() => {
              setCurrentWeekKey(viewingNextWeek ? thisWeekKey : nextWeekKey);
            })
          }
          onAutoFill={() => handleAutoFill()}
          autoPlanWeights={autoPlanWeights}
          onAutoPlanWeightsChange={updateAutoPlanWeights}
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
            }
          }}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar — sits below the header so the header can stretch
              edge-to-edge across the page. */}
          <ProductionPlanningSidebar
            orders={unscheduledOrders}
            allOrdersById={allOrdersById}
            excludedItemIds={excludedItemIds}
            onToggleExcluded={toggleExcluded}
            onContextMenu={handleCardContextMenu}
          />

          {/* Day columns slide horizontally on week toggle. Direction is
              passed via AnimatePresence's `custom` so the latest value drives
              both the exiting and entering child. */}
          <div className="flex-1 p-3 md:p-6 overflow-hidden relative">
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
                className="flex items-start gap-4 h-full overflow-x-auto overflow-y-auto snap-x snap-mandatory md:snap-none md:min-w-[1000px] pb-20 md:pb-0"
                ref={(node) => {
                  if (!node) return;
                  // Center today's column on mount so the user lands on the
                  // right day instead of Monday. rAF lets layout settle first.
                  const todayEl = node.querySelector<HTMLElement>(
                    `[data-today-column="true"]`
                  );
                  if (!todayEl) return;
                  requestAnimationFrame(() => {
                    todayEl.scrollIntoView({
                      block: "nearest",
                      inline: "center",
                    });
                  });
                }}
              >
                {DAYS.map((day) => {
                  const date = addDays(
                    currentWeekStart,
                    DAY_OFFSET_FROM_WEEK_START[day]
                  );
                  const isToday =
                    !viewingNextWeek && day === todayColumnDay;
                  const isPastDay = date.getTime() < today.getTime();

                  return (
                    <div
                      key={day}
                      data-today-column={isToday ? "true" : undefined}
                      className="shrink-0 w-[66vw] snap-center md:w-auto md:flex-1 md:snap-align-none min-w-[150px] md:min-w-[200px]"
                    >
                      <DroppableDayColumn
                        day={day}
                        dateLabel={format(date, "MMM d")}
                        orders={dayGroups[day].orders}
                        ordersById={allOrdersById}
                        totalSquares={dayGroups[day].totalSquares}
                        gluedSquares={dayGroups[day].gluedSquares}
                        capacity={DAILY_CAPACITY_SQUARES}
                        greenThreshold={DAILY_GREEN_THRESHOLD_SQUARES}
                        onTogglePin={(id, actualDay) =>
                          toggleItemPinned(currentWeekKey, actualDay, id)
                        }
                        date={date}
                        autoPlanEnabled={autoPlanDays[day]}
                        onToggleAutoPlan={() => toggleAutoPlanDay(day)}
                        recentlyPlacedIds={recentlyPlacedIds}
                        onContextMenu={handleCardContextMenu}
                        isToday={isToday}
                        isPastDay={isPastDay}
                      />
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={DROP_ANIMATION}>
        {activeId && activeMeta ? (
          <div className="cursor-grabbing">
            <OrderCard
              meta={activeMeta}
              isScheduled={true}
              referenceDate={activeReferenceDate}
              isPinned={activeIsPinned}
              onTogglePin={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>

      {contextMenu && (
        <OrderContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          currentStatus={allOrdersById.get(contextMenu.itemId)?.item.status}
          onSelectStatus={(status) =>
            handleSelectStatus(contextMenu.itemId, status)
          }
          onClose={() => setContextMenu(null)}
        />
      )}
    </DndContext>
  );
}
