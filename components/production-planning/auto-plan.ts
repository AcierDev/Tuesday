import { addDays, startOfDay } from "date-fns";

import type { DayName, Item, WeeklyScheduleData } from "@/typings/types";
import { isOrderWip } from "@/lib/order-wip";
import { parseSquareSize } from "@/lib/production-metrics";
import { laDayKey } from "@/lib/debt-metrics";
import { scheduleVersion } from "@/app/api/weekly-schedules/version";
import { parseNameTokens } from "@/components/orders/name-tokens";
import { PRE_WIP_STATUSES } from "@/components/production-planning/constants";
import { getDesignFamily } from "@/components/production-planning/design-family";
import {
  autoPlanStartDayKey,
  dayKeyToLocalDate,
  parseDueDay,
  type AutoPlanTrigger,
} from "@/components/production-planning/planner-dates";
import {
  DAY_OFFSET_FROM_WEEK_START,
  type AutoPlanDayMap,
} from "@/components/production-planning/planner-config";
import { calculateSquares } from "@/components/production-planning/planner-data";
import type { OrderMeta } from "@/components/production-planning/types";

// Auto-plan lateness penalty. Each day a slot sits past an item's due date
// adds this many "negative squares" to its score, so anchor-grouping can
// never pull an item beyond its deadline. On-time slots are scored purely
// by anchor + earliness tiebreak — items are pulled forward to fill each
// day's capacity before spilling into the next.
const AUTO_PLAN_LATE_PENALTY_PER_DAY = 375;

export type AutoPlanInput = {
  trigger: AutoPlanTrigger;
  thisWeekKey: string;
  nextWeekKey: string;
  autoPlanDays: AutoPlanDayMap;
  dailyCapacitySquares: number;
  allOrdersById: Map<string, OrderMeta>;
  availableOrders: Item[];
  excludedItemIds: Set<string>;
  // Live store reads, not a render's closure — the nightly run refreshes
  // schedules right before calling in, and a stale copy would replan over
  // (and conflict with) newer server state.
  getSchedules: () => WeeklyScheduleData[];
  createWeek: (weekKey: string) => Promise<void>;
  updateSchedule: (
    weekKey: string,
    schedule: WeeklyScheduleData & { version: number }
  ) => Promise<unknown>;
};

// Plans BOTH this and next week jointly: locked items (WIP+, pinned, or
// non-parseable size) stay put; the remaining pool is grouped by design
// family and packed across enabled days. Multi-item families bias toward
// the latest day that can hold them all (preserves slack and matches the
// "consolidate similar work" intent). Singletons keep the legacy earliest-
// valid behavior so the planner doesn't suddenly cram every item against
// its due date. Sat/Sun fold into Monday's capacity bucket.
// `trigger` "nightly" = the 8pm run: today's shop day is over, so slots
// start tomorrow and leftover work rolls forward instead of back onto today.
// Saves each week and returns the ids it placed, or null when a missing
// week couldn't be created.
export async function runAutoPlan({
  trigger,
  thisWeekKey,
  nextWeekKey,
  autoPlanDays,
  dailyCapacitySquares,
  allOrdersById,
  availableOrders,
  excludedItemIds,
  getSchedules,
  createWeek,
  updateSchedule,
}: AutoPlanInput): Promise<string[] | null> {
  const schedules = getSchedules();
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
        return null;
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
        getSchedules().find((s) => s.weekKey === weekKey)
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

  return placements.map((p) => p.entry.id);
}
