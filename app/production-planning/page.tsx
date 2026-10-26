"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  addWeeks,
  endOfDay,
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
  defaultDropAnimationSideEffects,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DropAnimation,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { isAnyModalDialogOpen } from "@/utils/dnd-modal-guard";

import { ProductionPlanningHeader } from "@/components/production-planning/ProductionPlanningHeader";
import { ProductionPlanningSidebar } from "@/components/production-planning/ProductionPlanningSidebar";
import { DroppableDayColumn } from "@/components/production-planning/DroppableDayColumn";
import { OrderCard } from "@/components/production-planning/OrderCard";
import { OrderContextMenu } from "@/components/production-planning/OrderContextMenu";
import { OrderMeta } from "@/components/production-planning/types";
import { isOrderWip } from "@/lib/order-wip";
import {
  POST_WIP_STATUSES,
  PRE_WIP_STATUSES,
} from "@/components/production-planning/constants";
import { useOrderStore } from "@/stores/useOrderStore";
import {
  ScheduleConflictError,
  useWeeklyScheduleStore,
} from "@/stores/useWeeklyScheduleStore";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import {
  DayName,
  Item,
  ItemStatus,
  WeeklyScheduleData,
  ScheduledOrder,
} from "@/typings/types";
import {
  parseSquareSize,
  recentGluedWindow,
  summarizeGluedForecast,
} from "@/lib/production-metrics";
import { getDesignFamily } from "@/components/production-planning/design-family";
import {
  autoPlanStartDayKey,
  dayKeyToLocalDate,
  parseDueDay,
  planWeekStart,
  type AutoPlanTrigger,
} from "@/components/production-planning/planner-dates";
import { parseNameTokens } from "@/components/orders/name-tokens";
import { laDayKey, msUntilNextLaHour } from "@/lib/debt-metrics";
import { useGluedStats, useLaToday } from "@/lib/stats-shared";
import { scheduleVersion } from "@/app/api/weekly-schedules/version";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🚫 NO-DRAG WHILE MODAL OPEN                                          ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// Block sensor activation when a Radix dialog is open so background cards
// can't be dragged through the overlay.
class GuardedMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: "onMouseDown" as const,
      handler: ({ nativeEvent: event }: React.MouseEvent) => {
        if (event.button !== 0) return false;
        if (isAnyModalDialogOpen()) return false;
        return true;
      },
    },
  ];
}

class GuardedTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent: event }: React.TouchEvent) => {
        if (isAnyModalDialogOpen()) return false;
        if (event.touches.length > 1) return false;
        return true;
      },
    },
  ];
}

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

// Fallback used while the forecast endpoint is loading (or returns no data).
// Live capacity is the recency-weighted gluing forecast rounded UP to the
// nearest CAPACITY_ROUND_STEP, so the planner targets what the shop has
// actually been producing instead of a static 1000.
const DAILY_CAPACITY_FALLBACK_SQUARES = 1000;
const CAPACITY_ROUND_STEP = 50;
// Day total turns green once it crosses this fraction of the day's capacity.
// 0.85 matches the previous static 850/1000 ratio.
const DAILY_GREEN_THRESHOLD_RATIO = 0.85;

// Auto-plan lateness penalty. Each day a slot sits past an item's due date
// adds this many "negative squares" to its score, so anchor-grouping can
// never pull an item beyond its deadline. On-time slots are scored purely
// by anchor + earliness tiebreak — items are pulled forward to fill each
// day's capacity before spilling into the next.
const AUTO_PLAN_LATE_PENALTY_PER_DAY = 375;

// Nightly auto-plan: re-runs handleAutoFill at 8pm America/Los_Angeles every
// day so anything not glued today gets pulled forward (onto tomorrow onward)
// and any over-production rebalances the rest of the week. Client-side only —
// fires only when a planner tab is open at the trigger time; a server lease
// (/api/production-planning/nightly-auto-plan) lets exactly one tab run it.
const NIGHTLY_AUTO_PLAN_HOUR = 20; // 8pm LA
const NIGHTLY_AUTO_PLAN_BUFFER_MS = 500;
const NIGHTLY_AUTO_PLAN_LEASE_ENDPOINT =
  "/api/production-planning/nightly-auto-plan";
// Tabs that lose the lease reload schedules after the winner has had time to
// save, so every open planner shows tonight's plan.
const NIGHTLY_FOLLOWER_REFRESH_MS = 60_000;
const PLANNER_DAY_CHECK_INTERVAL_MS = 60_000;
const AUTO_PLAN_FLASH_MS = 1600;

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
  const dueDate = parseDueDay(dueValue);
  if (!dueDate) return { dueDate: null, bucket: "noDue" };
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

// Drop animation: defaults to dnd-kit's keyframes which morph the overlay
// from its current (cursor) transform to the source-rect transform. Because
// updateSchedule applies optimistically before setActiveId(null), the source
// rect is already the destination slot by the time the animation runs — so
// the card visually flies from cursor → drop slot instead of fading in place.
// sideEffects fades the underlying card during the flight so we don't see a
// duplicate at the destination.
const DROP_ANIMATION: DropAnimation = {
  duration: 260,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0" } },
  }),
};

// Pickup lift: tiny scale-up + shadow so grabbing a card feels like detaching
// it from its slot rather than a duplicate flashing in over the source.
const DRAG_OVERLAY_VARIANTS = {
  initial: { scale: 0.96, boxShadow: "0 0 0 rgba(0,0,0,0)" },
  animate: {
    scale: 1.04,
    boxShadow: "0 16px 30px -10px rgba(0,0,0,0.32)",
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
    format(planWeekStart(dayKeyToLocalDate(laDayKey())), "yyyy-MM-dd")
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
    let currentDayKey = laDayKey();
    setToday(startOfDay(parseISO(currentDayKey)));
    const checkDay = () => {
      const nextDayKey = laDayKey();
      if (nextDayKey === currentDayKey) return;
      currentDayKey = nextDayKey;
      setToday(startOfDay(parseISO(nextDayKey)));
      void fetchSchedules();
    };
    const timer = window.setInterval(checkDay, PLANNER_DAY_CHECK_INTERVAL_MS);
    window.addEventListener("focus", checkDay);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", checkDay);
    };
  }, [fetchSchedules]);

  // Live daily capacity = recency-weighted gluing forecast rounded UP to the
  // nearest CAPACITY_ROUND_STEP. Falls back to DAILY_CAPACITY_FALLBACK_SQUARES
  // until the forecast resolves. Shares one cached request with the header
  // badge and nav badges (same window), and averages complete days only.
  const laTodayKey = useLaToday();
  const { start: forecastStart, end: forecastEnd } =
    recentGluedWindow(laTodayKey);
  const { data: gluedRecent } = useGluedStats({
    start: forecastStart,
    end: forecastEnd,
  });
  const forecastPerDay = useMemo(
    () =>
      gluedRecent
        ? summarizeGluedForecast(gluedRecent.buckets, laTodayKey)
            .weightedAvgActive
        : null,
    [gluedRecent, laTodayKey]
  );
  const dailyCapacitySquares = useMemo(() => {
    if (!forecastPerDay || forecastPerDay <= 0) {
      return DAILY_CAPACITY_FALLBACK_SQUARES;
    }
    return Math.ceil(forecastPerDay / CAPACITY_ROUND_STEP) * CAPACITY_ROUND_STEP;
  }, [forecastPerDay]);
  const dailyGreenThresholdSquares = Math.round(
    dailyCapacitySquares * DAILY_GREEN_THRESHOLD_RATIO
  );

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

  const currentWeekStart = useMemo(
    () => startOfWeek(parseISO(currentWeekKey), { weekStartsOn: 0 }),
    [currentWeekKey]
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
      updateSchedule(currentWeekKey, {
        ...currentSchedule,
        schedule: next,
      }).catch((err) => console.warn("Undo/redo not saved", err));
    },
    isEqual: (a, b) => a === b,
    historyKey: currentWeekKey,
    enabled: !!currentSchedule,
  });

  // Pre-fetch items referenced by both this-week and next-week so toggling
  // between them doesn't block on a fetch (the store dedups by ID, so this is
  // cheap when most items are already loaded). Also covers any past week the
  // user navigates to via the history popover.
  const thisWeekKey = format(
    planWeekStart(dayKeyToLocalDate(laTodayKey)),
    "yyyy-MM-dd"
  );
  const nextWeekKey = format(
    addWeeks(planWeekStart(dayKeyToLocalDate(laTodayKey)), 1),
    "yyyy-MM-dd"
  );

  useEffect(() => {
    if (schedules.length === 0) return;
    const ids = new Set<string>();
    for (const s of schedules) {
      if (
        s.weekKey === thisWeekKey ||
        s.weekKey === nextWeekKey ||
        s.weekKey === currentWeekKey
      ) {
        Object.values(s.schedule)
          .flat()
          .forEach((i) => ids.add(i.id));
      }
    }
    if (ids.size > 0) fetchItemsByIds(Array.from(ids));
  }, [schedules, currentWeekKey, thisWeekKey, nextWeekKey, fetchItemsByIds]);

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
    useSensor(GuardedMouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(GuardedTouchSensor, {
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
        try {
          await removeItemFromDay(
            currentWeekKey,
            activeContainer as DayName,
            activeId
          );
        } catch (err) {
          // Conflicts reload the week; nothing else to undo here.
          console.warn("Planner change not saved", err);
        }
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
        setActiveId(null);
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

    try {
      await updateSchedule(currentWeekKey, newScheduleData);
    } catch (err) {
      // A 409 means another tab / reconcile changed this week first; the
      // store already reloaded it, so the drop is simply not applied.
      console.warn("Planner change not saved", err);
    }

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
  // `trigger` "nightly" = the 8pm run: today's shop day is over, so slots
  // start tomorrow and leftover work rolls forward instead of back onto today.
  const handleAutoFill = async (trigger: AutoPlanTrigger = "manual") => {
    // Read schedules from the store, not this render's closure — the nightly
    // run refreshes them right before calling in, and a stale copy would
    // replan over (and conflict with) newer server state.
    const schedules = useWeeklyScheduleStore.getState().schedules;
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
      baseVersion: number;
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
            !isOrderWip(item) &&
            parseSquareSize(item.size) !== null;
          if (!isMovable) lockedByDay[day].push(entry);
        });
      });

      plans.push({
        weekKey,
        weekStart: dayKeyToLocalDate(weekKey),
        baseVersion: scheduleVersion(
          useWeeklyScheduleStore
            .getState()
            .schedules.find((s) => s.weekKey === weekKey)
        ),
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
    // fill Monday's leftover capacity). LA calendar day, and tomorrow for
    // the nightly run.
    const firstSlotMs = dayKeyToLocalDate(
      autoPlanStartDayKey(laDayKey(), trigger)
    ).getTime();

    const slots: Slot[] = [];
    const slotByKey = new Map<SlotKey, Slot>();
    for (const plan of plans) {
      for (const day of enabledDays) {
        const date = startOfDay(
          addDays(plan.weekStart, DAY_OFFSET_FROM_WEEK_START[day])
        );
        if (date.getTime() < firstSlotMs) continue;
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
          remaining: Math.max(0, dailyCapacitySquares - lockedSquares),
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
      rushed: boolean;
    };
    const parseDueMs = (raw: string | undefined): number => {
      // Missing/invalid → "no due" (no constraint). Parsed as a calendar day
      // (same local-midnight frame as slot dates), never via new Date(key).
      const due = parseDueDay(raw);
      // Past dates are returned as-is so the sort can prioritize the
      // most-overdue item first. Eligibility for overdue items is handled
      // via a date-relaxed fallback further down.
      return due ? due.getTime() : Infinity;
    };
    const pool: PoolEntry[] = availableOrders
      .filter(
        (item) =>
          PRE_WIP_STATUSES.has(item.status) &&
          !isOrderWip(item) &&
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
        rushed: parseNameTokens(item.customerName ?? "").isRushed,
      }))
      .filter((entry) => entry.squares > 0);

    //╔═══╗ ═══════════════════════════════════════════════════════════════ ╔═══╗
    //║ 🎯 PLACE EACH ITEM (DUE-DATE FIRST, ANCHOR AS TIEBREAKER)            ║
    //╚═══╝ ═══════════════════════════════════════════════════════════════ ╚═══╝
    type Placement = { slotKey: SlotKey; entry: PoolEntry };
    const placements: Placement[] = [];

    // Score a slot for a given item:
    //   1. Past-due slots get a heavy per-day penalty so anchor-grouping
    //      can never pull an item beyond its deadline.
    //   2. On-time slots score 0 from due-date alone — anchor + earliest-
    //      tiebreak decides, which packs items forward into the earliest
    //      slot with capacity (and same-family pull when present).
    const MS_PER_DAY = 86400000;
    const dueDateScore = (slot: Slot, refDueMs: number): number => {
      if (!Number.isFinite(refDueMs)) return 0;
      // Rounded: both are local midnights, so a DST day (23/25h) still
      // counts as one whole calendar day.
      const bufferDays = Math.round(
        (refDueMs - slot.date.getTime()) / MS_PER_DAY
      );
      if (bufferDays < 0) return bufferDays * AUTO_PLAN_LATE_PENALTY_PER_DAY;
      return 0;
    };

    const pickSlot = (
      candidates: Slot[],
      family: string,
      refDueMs: number
    ): Slot | undefined => {
      let chosen: Slot | undefined;
      let bestScore = -Infinity;
      let bestDate = Infinity;
      for (const cand of candidates) {
        const anchor = anchorScore.get(anchorKey(cand, family)) ?? 0;
        const score = anchor + dueDateScore(cand, refDueMs);
        const t = cand.date.getTime();
        // Higher score wins; tiebreak by earlier date so overdue work
        // bubbles to the front and ties resolve consistently.
        if (score > bestScore || (score === bestScore && t < bestDate)) {
          bestScore = score;
          bestDate = t;
          chosen = cand;
        }
      }
      return chosen;
    };

    const place = (slot: Slot, entry: PoolEntry) => {
      slot.remaining -= entry.squares;
      bumpAnchor(slot, entry.family, entry.squares);
      placements.push({ slotKey: slot.key, entry });
    };

    // Process items globally by due date. Iterating per-family caused the
    // largest family (e.g. ocean palette) to monopolize early-week capacity
    // before urgent singletons in other families got a chance — pushing
    // their orders past their own due dates "to make room for grouping."
    // Global iteration interleaves families naturally; same-family anchor
    // still pulls related items together when capacity allows.
    const sortedPool = [...pool].sort((a, b) => {
      if (a.dueMs !== b.dueMs) return a.dueMs - b.dueMs;
      if (a.squares !== b.squares) return b.squares - a.squares;
      return a.id.localeCompare(b.id);
    });

    for (const entry of sortedPool) {
      let eligible = slots.filter(
        (s) =>
          s.date.getTime() <= entry.dueMs && s.remaining >= entry.squares
      );
      if (eligible.length === 0 && !entry.rushed) {
        // Overdue items (or items whose date-eligible window is full)
        // fall back to any slot with capacity. Rushed items skip this
        // fallback — leaving them unscheduled is better than placing
        // them past their due date.
        eligible = slots.filter((s) => s.remaining >= entry.squares);
      }
      if (eligible.length === 0) continue; // too big or rushed-overflow

      const chosen = pickSlot(eligible, entry.family, entry.dueMs);
      if (chosen) place(chosen, entry);
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
      const finalSchedule: WeeklyScheduleData & { version: number } = {
        weekKey: plan.weekKey,
        version: plan.baseVersion,
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
    setTimeout(() => setRecentlyPlacedIds(new Set()), AUTO_PLAN_FLASH_MS);
  };

  // Latest handleAutoFill in a ref so the nightly scheduler can call the
  // freshest closure (with up-to-date stores) without resetting its timeout
  // every render.
  const handleAutoFillRef = useRef(handleAutoFill);
  useEffect(() => {
    handleAutoFillRef.current = handleAutoFill;
  });

  // Nightly auto-plan tick at 8pm LA. Recursive setTimeout so each fire
  // recomputes the next 20:00 LA as a zoned instant (DST-safe). Every open
  // tab arms a timer, but only the tab that claims the day's server lease
  // runs; the rest reload schedules a minute later to show the result.
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let followerRefreshId: ReturnType<typeof setTimeout> | null = null;

    const runNightly = async () => {
      const res = await fetch(NIGHTLY_AUTO_PLAN_LEASE_ENDPOINT, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Lease HTTP ${res.status}`);
      const { claimed } = (await res.json()) as { claimed?: boolean };
      if (cancelled) return;
      if (!claimed) {
        followerRefreshId = setTimeout(() => {
          if (!cancelled) void useWeeklyScheduleStore.getState().fetchSchedules();
        }, NIGHTLY_FOLLOWER_REFRESH_MS);
        return;
      }
      await useWeeklyScheduleStore.getState().fetchSchedules();
      if (cancelled) return;
      try {
        await handleAutoFillRef.current("nightly");
      } catch (err) {
        // A week changed under us mid-run (another tab saved). The store has
        // reloaded it; replan once on the fresh state.
        if (!(err instanceof ScheduleConflictError) || cancelled) throw err;
        await useWeeklyScheduleStore.getState().fetchSchedules();
        await handleAutoFillRef.current("nightly");
      }
    };

    const schedule = () => {
      const delay =
        msUntilNextLaHour(NIGHTLY_AUTO_PLAN_HOUR) + NIGHTLY_AUTO_PLAN_BUFFER_MS;
      // The LA day this timer is for. A suspended laptop can fire it hours
      // late; past that day, planning "from tomorrow" would skip a real day.
      const targetDayKey = laDayKey(new Date(Date.now() + delay));
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        if (laDayKey() === targetDayKey) {
          runNightly().catch((err) =>
            console.warn("Nightly auto-plan failed", err)
          );
        }
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (followerRefreshId) clearTimeout(followerRefreshId);
    };
  }, []);

  const viewingNextWeek = currentWeekKey === nextWeekKey;
  const viewingPastWeek = currentWeekKey < thisWeekKey;

  // Today's column gets centered on mount in the mobile snap-scroller. Sat/Sun
  // fold into Monday's column to match the display rule. Computed in
  // useEffect (not useMemo) so the highlighted column is only set after
  // hydration; the weekday is the LA day's, and follows midnight rollover.
  const [todayColumnDay, setTodayColumnDay] = useState<DayName | null>(null);
  useEffect(() => {
    const dayName = format(dayKeyToLocalDate(laTodayKey), "EEEE") as DayName;
    setTodayColumnDay(
      DAYS_FOLDED_INTO_MONDAY.includes(dayName) ? "Monday" : dayName
    );
  }, [laTodayKey]);

  // Scroller node — driven by a ref callback so the IntersectionObserver
  // effect below + the centering effect can both react to mount/unmount.
  const [scrollerNode, setScrollerNode] = useState<HTMLDivElement | null>(null);
  const scrollerRefCallback = useCallback(
    (node: HTMLDivElement | null) => setScrollerNode(node),
    []
  );

  // Center today's column. Runs once per (week, today) tuple so a re-render
  // (item placed, drag, etc.) doesn't yank the user back. Driven by useEffect
  // rather than the ref callback because, with AnimatePresence mode="wait",
  // the new scroller mounts AFTER the old finishes exiting — useEffect picks
  // that up via scrollerNode + currentWeekKey changing.
  const centeredKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!scrollerNode) {
      // AnimatePresence mode="wait" unmounts the scroller on week toggle.
      // Reset so the next (fresh) node re-centers — without this, toggling
      // away and back leaves the new node stuck at scrollLeft=0 (Sunday on
      // mobile snap-x), which looks like the week failed to load.
      centeredKeyRef.current = null;
      return;
    }
    if (!todayColumnDay || viewingNextWeek || viewingPastWeek) return;
    const key = `${currentWeekKey}|${todayColumnDay}`;
    if (centeredKeyRef.current === key) return;
    let cancelled = false;
    // rAF lets the snap-scroller's layout settle before we measure.
    const rafId = requestAnimationFrame(() => {
      if (cancelled) return;
      const todayEl = scrollerNode.querySelector<HTMLElement>(
        `[data-today-column="true"]`
      );
      if (!todayEl) return;
      centeredKeyRef.current = key;
      const target =
        todayEl.offsetLeft -
        (scrollerNode.clientWidth - todayEl.clientWidth) / 2;
      scrollerNode.scrollLeft = Math.max(0, target);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [
    scrollerNode,
    todayColumnDay,
    viewingNextWeek,
    viewingPastWeek,
    currentWeekKey,
  ]);

  // Tracks which day column is currently snapped into the mobile viewport.
  // Only the active day allows vertical scroll on mobile — so swiping between
  // days can't accidentally drag the next day's list down. Threshold of 0.9
  // means a column has to be ~fully snapped before it becomes scrollable;
  // mid-swipe both columns stay locked. Desktop ignores this (always scrolls).
  const ACTIVE_DAY_VISIBILITY_THRESHOLD = 0.9;
  const [activeDayName, setActiveDayName] = useState<DayName | null>(null);
  useEffect(() => {
    if (!scrollerNode) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= ACTIVE_DAY_VISIBILITY_THRESHOLD) {
            const day = entry.target.getAttribute(
              "data-day-column"
            ) as DayName | null;
            if (day) setActiveDayName(day);
            break;
          }
        }
      },
      { root: scrollerNode, threshold: [0, 0.5, 0.9, 1] }
    );
    const dayEls =
      scrollerNode.querySelectorAll<HTMLElement>("[data-day-column]");
    dayEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [scrollerNode, currentWeekKey]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* h-dvh (dynamic viewport) instead of h-screen so the bottom of the
          sidebar/day columns isn't hidden behind the browser's bottom toolbar
          on iPad/iOS Safari and on tab bars that overlay the viewport. */}
      <div className="flex flex-col h-dvh bg-gray-50 dark:bg-gray-950 overflow-hidden select-none">
        {/* Header — full width across the top, above sidebar + content. */}
        <ProductionPlanningHeader
          viewingNextWeek={viewingNextWeek}
          viewingPastWeek={viewingPastWeek}
          hasScheduledOrders={!!currentSchedule}
          scheduledItemCount={
            currentSchedule
              ? Object.values(currentSchedule.schedule).reduce(
                  (sum, dayItems) => sum + dayItems.length,
                  0
                )
              : 0
          }
          currentWeekKey={currentWeekKey}
          thisWeekKey={thisWeekKey}
          onToggleWeek={() =>
            setCurrentWeekKey(viewingNextWeek ? thisWeekKey : nextWeekKey)
          }
          onSelectWeek={(weekKey) => setCurrentWeekKey(weekKey)}
          onAutoFill={() =>
            handleAutoFill().catch((err) =>
              console.warn("Auto-plan not saved", err)
            )
          }
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
              updateSchedule(currentWeekKey, clearedSchedule).catch((err) =>
                console.warn("Clear week not saved", err)
              );
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
                className="flex gap-4 h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory md:snap-none md:min-w-[1000px] pb-20 md:pb-0"
                ref={scrollerRefCallback}
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
                      data-day-column={day}
                      className="shrink-0 w-[70vw] h-full snap-center md:w-auto md:flex-1 md:snap-align-none min-w-[150px] md:min-w-[200px]"
                    >
                      <DroppableDayColumn
                        day={day}
                        dateLabel={format(date, "MMM d")}
                        orders={dayGroups[day].orders}
                        ordersById={allOrdersById}
                        totalSquares={dayGroups[day].totalSquares}
                        gluedSquares={dayGroups[day].gluedSquares}
                        capacity={dailyCapacitySquares}
                        greenThreshold={dailyGreenThresholdSquares}
                        onTogglePin={(id, actualDay) =>
                          toggleItemPinned(currentWeekKey, actualDay, id).catch(
                            (err) => console.warn("Pin not saved", err)
                          )
                        }
                        date={date}
                        autoPlanEnabled={autoPlanDays[day]}
                        onToggleAutoPlan={() => toggleAutoPlanDay(day)}
                        recentlyPlacedIds={recentlyPlacedIds}
                        onContextMenu={handleCardContextMenu}
                        isToday={isToday}
                        isPastDay={isPastDay}
                        isActiveColumn={activeDayName === day}
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
          <motion.div
            variants={DRAG_OVERLAY_VARIANTS}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="cursor-grabbing rounded-md"
          >
            <OrderCard
              meta={activeMeta}
              isScheduled={true}
              referenceDate={activeReferenceDate}
              isPinned={activeIsPinned}
              onTogglePin={() => {}}
            />
          </motion.div>
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
