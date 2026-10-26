import {
  computeDebtBreakdown,
  dayDiffKeys,
  laDayKey,
  laDayRangeMs,
  shiftDayKey,
} from "@/lib/debt-metrics";
import {
  computeCurrentlyLate,
  computeHealthScore,
  computeLeadTimeStats,
  parseSquareSize,
} from "@/lib/production-metrics";
import { Item, ItemStatus } from "@/typings/types";

import { activeItems, itemRef, type StatsItemRef } from "./shared";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Backlog = work that still needs gluing. Post-Wip squares are already done,
// so they don't pull on glue capacity.
const BACKLOG_STATUSES: ReadonlySet<ItemStatus> = new Set([
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
]);
// Today page: open orders due within this many days are "at risk".
const AT_RISK_DAYS = 3;
// Forecast page.
const FORECAST_FALLBACK_LEAD_DAYS = 14;
const FORECAST_WINDOWS_DAYS = { within7: 7, within14: 14, within30: 30 } as const;
// Debt page health what-ifs: debt held at zero for this many days.
const WHAT_IF_SUSTAINED_DAYS = { oneWeek: 7, twoWeeks: 14 } as const;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type LateRow = { item: StatsItemRef; daysLate: number };

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧭 OVERVIEW — range-independent open-order totals                    ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type OverviewView = {
  debt: number;
  lateNow: number;
  wipTotal: number;
  wipSquares: number;
  backlogSquares: number;
};

const sumSquares = (list: Item[]) =>
  list.reduce((acc, i) => acc + (parseSquareSize(i.size)?.squares ?? 0), 0);

export function computeOverviewView(items: Item[]): OverviewView {
  const active = activeItems(items);
  return {
    debt: computeDebtBreakdown(active).total,
    lateNow: computeCurrentlyLate(active).length,
    wipTotal: active.length,
    wipSquares: sumSquares(active),
    backlogSquares: sumSquares(
      active.filter((i) => BACKLOG_STATUSES.has(i.status))
    ),
  };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⏰ LATE NOW — open orders past due (on-time page)                    ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type LateView = { rows: LateRow[] };

export function computeLateView(items: Item[]): LateView {
  return {
    rows: computeCurrentlyLate(activeItems(items)).map(({ item, daysLate }) => ({
      item: itemRef(item),
      daysLate,
    })),
  };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📅 TODAY                                                             ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type TodayView = {
  // The at-risk horizon, so the page labels it without its own copy.
  atRiskDays: number;
  completedToday: number;
  dueToday: StatsItemRef[];
  lateNow: LateRow[];
  atRisk: { item: StatsItemRef; daysToDue: number }[];
};

export function computeTodayView(items: Item[]): TodayView {
  const today = laDayKey();
  // Explicit LA-day bounds (DST-safe), independent of the server's zone.
  const { start: startOfToday, end: startOfTomorrow } = laDayRangeMs(today);

  // Reopened orders keep a stale completedAt, so only Done counts.
  const completedToday = items.filter(
    (i) =>
      i.status === ItemStatus.Done &&
      !!i.completedAt &&
      i.completedAt >= startOfToday &&
      i.completedAt < startOfTomorrow
  ).length;
  const dueToday = items
    .filter(
      (i) =>
        i.status !== ItemStatus.Done &&
        i.status !== ItemStatus.Hidden &&
        i.dueDate?.slice(0, 10) === today
    )
    .map(itemRef);
  const lateNow: LateRow[] = [];
  const atRisk: TodayView["atRisk"] = [];
  for (const item of items) {
    if (item.status === ItemStatus.Done || item.status === ItemStatus.Hidden)
      continue;
    const due = item.dueDate?.slice(0, 10);
    if (!due || due.length !== 10) continue;
    const diff = dayDiffKeys(due, today);
    if (diff > 0) lateNow.push({ item: itemRef(item), daysLate: diff });
    else if (diff < 0 && Math.abs(diff) <= AT_RISK_DAYS)
      atRisk.push({ item: itemRef(item), daysToDue: Math.abs(diff) });
  }
  lateNow.sort((a, b) => b.daysLate - a.daysLate);
  atRisk.sort((a, b) => a.daysToDue - b.daysToDue);
  return {
    atRiskDays: AT_RISK_DAYS,
    completedToday,
    dueToday,
    lateNow,
    atRisk,
  };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🔮 FORECAST — projected completion per open order                    ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type ForecastRow = {
  item: StatsItemRef;
  remainingDays: number;
  projectedDate: string;
};

export type ForecastView = {
  rows: ForecastRow[];
  within7: number;
  within14: number;
  within30: number;
  overallLead: number;
};

export function computeForecastView(items: Item[]): ForecastView {
  const stats = computeLeadTimeStats(items);
  const designAvg = new Map<string, number>();
  for (const r of stats.byDesign) designAvg.set(r.key, r.avgDays);
  const sizeAvg = new Map<string, number>();
  for (const r of stats.bySize) sizeAvg.set(r.key, r.avgDays);
  const overall = stats.avgDays || FORECAST_FALLBACK_LEAD_DAYS;

  const today = laDayKey();
  const now = Date.now();
  const rows = activeItems(items)
    .map((item) => {
      const designLead = item.design ? designAvg.get(item.design) : undefined;
      const sizeLead = item.size ? sizeAvg.get(item.size) : undefined;
      // A design/size with no usable history averages to NaN; fall through.
      const baseAvg =
        [designLead, sizeLead].find(
          (d) => d !== undefined && Number.isFinite(d)
        ) ?? overall;
      const ageDays = Number.isFinite(item.createdAt)
        ? (now - item.createdAt) / MS_PER_DAY
        : 0;
      const remainingDays = Math.max(1, baseAvg - ageDays);
      const projectedDate = shiftDayKey(today, Math.ceil(remainingDays));
      return { item: itemRef(item), remainingDays, projectedDate };
    })
    .sort((a, b) => a.remainingDays - b.remainingDays);

  const within = (days: number) =>
    rows.filter((r) => r.remainingDays <= days).length;
  return {
    rows,
    within7: within(FORECAST_WINDOWS_DAYS.within7),
    within14: within(FORECAST_WINDOWS_DAYS.within14),
    within30: within(FORECAST_WINDOWS_DAYS.within30),
    overallLead: overall,
  };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ❤️ HEALTH WHAT-IFS — debt page                                        ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

type HealthScore = ReturnType<typeof computeHealthScore>;

export type HealthWhatIfView = {
  current: HealthScore;
  ifDebtCleared: HealthScore;
  ifOneWeek: HealthScore;
  ifTwoWeeks: HealthScore;
};

export function computeHealthWhatIfView(items: Item[]): HealthWhatIfView {
  return {
    current: computeHealthScore(items),
    ifDebtCleared: computeHealthScore(items, { simulateDebtCleared: true }),
    ifOneWeek: computeHealthScore(items, {
      sustainedDebtFreeDays: WHAT_IF_SUSTAINED_DAYS.oneWeek,
    }),
    ifTwoWeeks: computeHealthScore(items, {
      sustainedDebtFreeDays: WHAT_IF_SUSTAINED_DAYS.twoWeeks,
    }),
  };
}
