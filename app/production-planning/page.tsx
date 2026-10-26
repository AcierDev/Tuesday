"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  addWeeks,
  format,
  startOfDay,
  startOfWeek,
  addDays,
  parseISO,
} from "date-fns";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { ProductionPlanningHeader } from "@/components/production-planning/ProductionPlanningHeader";
import { ProductionPlanningSidebar } from "@/components/production-planning/ProductionPlanningSidebar";
import { OrderContextMenu } from "@/components/production-planning/OrderContextMenu";
import { PlannerWeekBoard } from "@/components/production-planning/PlannerWeekBoard";
import { PlannerDragOverlay } from "@/components/production-planning/PlannerDragOverlay";
import { useOrderStore } from "@/stores/useOrderStore";
import { useWeeklyScheduleStore } from "@/stores/useWeeklyScheduleStore";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import {
  DayName,
  ItemStatus,
  WeeklyScheduleData,
} from "@/typings/types";
import {
  recentGluedWindow,
  summarizeGluedForecast,
} from "@/lib/production-metrics";
import {
  dayKeyToLocalDate,
  planWeekStart,
  type AutoPlanTrigger,
} from "@/components/production-planning/planner-dates";
import {
  DAY_OFFSET_FROM_WEEK_START,
  DAYS_FOLDED_INTO_MONDAY,
} from "@/components/production-planning/planner-config";
import { buildDayGroups } from "@/components/production-planning/planner-data";
import {
  applyPlannerDrop,
  findPlannerContainer,
} from "@/components/production-planning/planner-drop";
import {
  GuardedMouseSensor,
  GuardedTouchSensor,
} from "@/components/production-planning/planner-sensors";
import { runAutoPlan } from "@/components/production-planning/auto-plan";
import { useNightlyAutoPlan } from "@/components/production-planning/useNightlyAutoPlan";
import {
  useAutoPlanDays,
  useExcludedItemIds,
} from "@/components/production-planning/usePlannerPrefs";
import { usePlannerDayScroller } from "@/components/production-planning/usePlannerDayScroller";
import { usePlannerOrders } from "@/components/production-planning/usePlannerOrders";
import { laDayKey } from "@/lib/debt-metrics";
import { useGluedStats, useLaToday } from "@/lib/stats-shared";

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

const PLANNER_DAY_CHECK_INTERVAL_MS = 60_000;
const AUTO_PLAN_FLASH_MS = 1600;

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

  const { autoPlanDays, toggleAutoPlanDay } = useAutoPlanDays();

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const { excludedItemIds, toggleExcluded } = useExcludedItemIds();

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

  const { availableOrders, unscheduledOrders, allOrdersById } =
    usePlannerOrders({ items, doneItems, scheduledItems, schedules, today });

  const currentWeekStart = useMemo(
    () => startOfWeek(parseISO(currentWeekKey), { weekStartsOn: 0 }),
    [currentWeekKey]
  );

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

  // Group scheduled orders by day
  const dayGroups = useMemo(
    () => buildDayGroups(currentSchedule, allOrdersById, currentWeekKey),
    [currentSchedule, allOrdersById, currentWeekKey]
  );

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

    const activeContainer = findPlannerContainer(
      activeId,
      unscheduledOrders,
      currentSchedule
    );
    const overContainer = findPlannerContainer(
      overId,
      unscheduledOrders,
      currentSchedule
    );

    if (!activeContainer || !overContainer) {
      setActiveId(null);
      return;
    }

    // 1. Drop on Unscheduled (Sidebar)
    if (overContainer === "unscheduled") {
      if (activeContainer !== "unscheduled") {
        try {
          await removeItemFromDay(currentWeekKey, activeContainer, activeId);
        } catch (err) {
          // Conflicts reload the week; nothing else to undo here.
          console.warn("Planner change not saved", err);
        }
      }
      setActiveId(null);
      return;
    }

    // 2. Drop on a Day Column
    const targetDay = overContainer;

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

    const activeRect = active.rect.current.translated;
    const overRect = over.rect;
    const dropsAfterOver =
      !!activeRect &&
      !!overRect &&
      activeRect.top + activeRect.height / 2 >
        overRect.top + overRect.height / 2;

    const applied = applyPlannerDrop(newScheduleData.schedule, {
      activeId,
      activeContainer,
      overId,
      targetDay,
      dropsAfterOver,
    });
    if (!applied) {
      setActiveId(null);
      return;
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

  // Plans this and next week jointly (see runAutoPlan), then flashes the
  // placed cards.
  const handleAutoFill = async (trigger: AutoPlanTrigger = "manual") => {
    const placedIds = await runAutoPlan({
      trigger,
      thisWeekKey,
      nextWeekKey,
      autoPlanDays,
      dailyCapacitySquares,
      allOrdersById,
      availableOrders,
      excludedItemIds,
      getSchedules: () => useWeeklyScheduleStore.getState().schedules,
      createWeek,
      updateSchedule,
    });
    if (!placedIds) return;

    // Trigger the placement animation. Clear after the animation has had time
    // to play out so re-running auto-plan re-flashes.
    setRecentlyPlacedIds(new Set(placedIds));
    setTimeout(() => setRecentlyPlacedIds(new Set()), AUTO_PLAN_FLASH_MS);
  };

  useNightlyAutoPlan(handleAutoFill);

  const viewingNextWeek = currentWeekKey === nextWeekKey;
  const viewingPastWeek = currentWeekKey < thisWeekKey;

  const { todayColumnDay, scrollerRefCallback, activeDayName } =
    usePlannerDayScroller({
      laTodayKey,
      currentWeekKey,
      viewingNextWeek,
      viewingPastWeek,
    });

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

          <PlannerWeekBoard
            currentWeekKey={currentWeekKey}
            currentWeekStart={currentWeekStart}
            today={today}
            viewingNextWeek={viewingNextWeek}
            todayColumnDay={todayColumnDay}
            activeDayName={activeDayName}
            scrollerRef={scrollerRefCallback}
            dayGroups={dayGroups}
            allOrdersById={allOrdersById}
            dailyCapacitySquares={dailyCapacitySquares}
            dailyGreenThresholdSquares={dailyGreenThresholdSquares}
            autoPlanDays={autoPlanDays}
            onToggleAutoPlanDay={toggleAutoPlanDay}
            onTogglePin={(id, actualDay) =>
              toggleItemPinned(currentWeekKey, actualDay, id).catch(
                (err) => console.warn("Pin not saved", err)
              )
            }
            recentlyPlacedIds={recentlyPlacedIds}
            onContextMenu={handleCardContextMenu}
          />
        </div>
      </div>

      <PlannerDragOverlay
        activeId={activeId}
        activeMeta={activeMeta}
        referenceDate={activeReferenceDate}
        isPinned={activeIsPinned}
      />

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
