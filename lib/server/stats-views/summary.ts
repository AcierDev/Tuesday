import { laDayKey } from "@/lib/debt-metrics";
import {
  countCompletionsByDay,
  countOnTimeByDay,
  countShippedSquaresByDay,
  type DayCounts,
  type OnTimeDays,
} from "@/lib/production-metrics";
import type { Item } from "@/typings/types";

import { computeOverviewView, type OverviewView } from "./active";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📊 SUMMARY — all-history per-day totals shared by most stats pages   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// One small response replaces downloading every item: throughput, records,
// calendar, anomalies, year-over-year, day patterns, goals, on-time and the
// overview window any range client-side with the production-metrics helpers
// (bucketDayCounts, onTimeStatsFromDays, …), so range switches stay instant.
// The overview's range-independent open-order totals ride along, saving it a
// second request.
export type StatsSummaryView = {
  // Done items per LA completion day.
  completions: DayCounts;
  // Dated Done items per LA completion day: on-time / late counts.
  onTime: OnTimeDays;
  // Squares of Done items per LA completion day.
  shippedSquares: DayCounts;
  // Records page: every item carrying a completedAt (any status) and the LA
  // day of the earliest one.
  lifetimeCompleted: number;
  firstCompletedKey: string | null;
  // Overview tiles: debt, late now, WIP and backlog squares.
  openOrders: OverviewView;
};

export function computeSummaryView(items: Item[]): StatsSummaryView {
  let lifetimeCompleted = 0;
  let firstCompletedAt = Infinity;
  for (const item of items) {
    if (!item.completedAt) continue;
    lifetimeCompleted += 1;
    if (item.completedAt < firstCompletedAt) firstCompletedAt = item.completedAt;
  }
  return {
    completions: countCompletionsByDay(items),
    onTime: countOnTimeByDay(items),
    shippedSquares: countShippedSquaresByDay(items),
    lifetimeCompleted,
    firstCompletedKey: Number.isFinite(firstCompletedAt)
      ? laDayKey(new Date(firstCompletedAt))
      : null,
    openOrders: computeOverviewView(items),
  };
}
