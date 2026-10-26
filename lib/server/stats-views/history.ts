import { laDayStartMs, shiftDayKey } from "@/lib/debt-metrics";
import {
  computeDesignTrend,
  computeLeadTimeStats,
  computeMix,
  computeStatusDurations,
  computeWipAging,
  type LeadTimeStats,
  type MixRow,
  type StatusDurationRow,
} from "@/lib/production-metrics";
import { Activity, Item, ItemStatus } from "@/typings/types";

import { itemRef, type StatsItemRef } from "./shared";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Trending page: rows per table.
const TRENDING_TOP_ROWS = 12;
// Quality page: most recent reversals listed.
const QUALITY_RECENT_LIMIT = 50;

// Status forward order; a reversal moves backwards in this list.
const STATUS_FLOW: ItemStatus[] = [
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
  ItemStatus.Packaging,
  ItemStatus.At_The_Door,
  ItemStatus.Done,
];

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⏱️ LEAD TIME — Done items completed in [start, end]                  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export function computeLeadTimeView(
  items: Item[],
  start: string,
  end: string
): LeadTimeStats {
  // Half-open LA-day window [00:00 LA on start, 00:00 LA after end), so the
  // bounds don't shift with the zone or DST. Reopened orders keep a stale
  // completedAt, so only Done items count as completed.
  const startMs = laDayStartMs(start);
  const endExclusiveMs = laDayStartMs(shiftDayKey(end, 1));
  return computeLeadTimeStats(
    items.filter(
      (i) =>
        i.status === ItemStatus.Done &&
        !!i.completedAt &&
        i.completedAt >= startMs &&
        i.completedAt < endExclusiveMs
    )
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 MIX — orders created in [start, end]                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type MixView = { total: number; designs: MixRow[]; sizes: MixRow[] };

export function computeMixView(
  items: Item[],
  start: string,
  end: string
): MixView {
  return computeMix(items, start, end);
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📈 TRENDING — last `days` vs the `days` before                       ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type TrendRow = ReturnType<typeof computeDesignTrend>[number];
export type TrendingView = {
  rising: TrendRow[];
  falling: TrendRow[];
  dying: TrendRow[];
};

export function computeTrendingView(
  items: Item[],
  today: string,
  days: number
): TrendingView {
  const recentEnd = today;
  const recentStart = shiftDayKey(today, -(days - 1));
  const priorEnd = shiftDayKey(recentStart, -1);
  const priorStart = shiftDayKey(priorEnd, -(days - 1));
  const all = computeDesignTrend(
    items,
    recentStart,
    recentEnd,
    priorStart,
    priorEnd
  );
  return {
    rising: [...all]
      .filter((r) => r.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, TRENDING_TOP_ROWS),
    falling: [...all]
      .filter((r) => r.delta < 0)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, TRENDING_TOP_ROWS),
    dying: [...all]
      .filter((r) => r.recent === 0 && r.prior > 0)
      .sort((a, b) => b.prior - a.prior)
      .slice(0, TRENDING_TOP_ROWS),
  };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧱 WIP AGING + BOTTLENECKS — full status history                     ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type WipView = { rows: { item: StatsItemRef; daysInStatus: number }[] };

export function computeWipView(items: Item[], activities: Activity[]): WipView {
  return {
    rows: computeWipAging(items, activities).map(({ item, daysInStatus }) => ({
      item: itemRef(item),
      daysInStatus,
    })),
  };
}

export type BottlenecksView = { rows: StatusDurationRow[] };

// The server reads the whole status history, so no item is skipped for a
// truncated feed (historyStartMs = null).
export function computeBottlenecksView(
  items: Item[],
  activities: Activity[]
): BottlenecksView {
  return {
    rows: computeStatusDurations(items, activities, null).filter(
      (r) => r.status !== ItemStatus.Hidden
    ),
  };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ↩️ QUALITY — status reversals                                         ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type ReversalRow = {
  itemId: string;
  from: string;
  to: string;
  timestamp: number;
  customerName?: string;
};

export type QualityView = {
  total: number;
  distinctItems: number;
  recent: ReversalRow[];
};

function flowIndex(status: string): number {
  return STATUS_FLOW.indexOf(status as ItemStatus);
}

export function computeQualityView(
  items: Item[],
  activities: Activity[]
): QualityView {
  const events: Omit<ReversalRow, "customerName">[] = [];
  for (const a of activities) {
    if (a.type !== "status_change") continue;
    const change = a.changes.find((c) => c.field === "status");
    if (!change) continue;
    const fromIdx = flowIndex(change.oldValue ?? "");
    const toIdx = flowIndex(change.newValue);
    if (fromIdx === -1 || toIdx === -1) continue;
    if (toIdx < fromIdx) {
      events.push({
        itemId: a.itemId,
        from: change.oldValue ?? "",
        to: change.newValue,
        timestamp: a.timestamp,
      });
    }
  }
  events.sort((a, b) => b.timestamp - a.timestamp);
  const names = new Map(items.map((i) => [i.id, i.customerName]));
  return {
    total: events.length,
    distinctItems: new Set(events.map((e) => e.itemId)).size,
    recent: events
      .slice(0, QUALITY_RECENT_LIMIT)
      .map((e) => ({ ...e, customerName: names.get(e.itemId) })),
  };
}
