"use client";

import { useEffect, useMemo, useState } from "react";

import { useOrderStore } from "@/stores/useOrderStore";
import { Item, ItemStatus } from "@/typings/types";
import { STATUS_COLORS } from "@/typings/constants";
import {
  computeDebtBreakdown,
  dayDiffKeys,
  laDayKey,
} from "@/lib/debt-metrics";
import {
  ChartPoint,
  DEFAULT_RANGE,
  RangeKey,
  RangeSelector,
  StatTile,
  TimeSeriesChart,
  resolveRangeKey,
  useAllItems,
} from "@/lib/stats-shared";
import { computeHealthScore } from "@/lib/production-metrics";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const RECENT_VELOCITY_DAYS = 7;
const DEBT_CHART_COLOR = "rgb(248 113 113)";

const STATUS_LABELS: Record<ItemStatus, string> = {
  [ItemStatus.New]: "New",
  [ItemStatus.OnDeck]: "On Deck",
  [ItemStatus.Wip]: "WIP",
  [ItemStatus.Packaging]: "Packaging",
  [ItemStatus.At_The_Door]: "At The Door",
  [ItemStatus.Done]: "Done",
  [ItemStatus.Hidden]: "Hidden",
};

type SeriesPoint = { date: string; totalDebt: number; recorded?: boolean };

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📊 STATS                                                             ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

interface SeriesStats {
  peak: number;
  trough: number;
  average: number;
  median: number;
  startValue: number;
  endValue: number;
  deltaFromStart: number;
  daysInDebt: number;
  daysDebtFree: number;
  recordedDays: number;
  longestDebtStreak: number;
  biggestJump: number;
  biggestDrop: number;
  recentAverage: number;
  priorAverage: number;
}

function summarizeSeries(series: SeriesPoint[]): SeriesStats {
  // Stats only consider days with real recorded snapshots — carry-forward
  // gap-fillers don't represent observed state.
  const recorded = series.filter((p) => p.recorded !== false);
  if (recorded.length === 0) {
    return {
      peak: 0,
      trough: 0,
      average: 0,
      median: 0,
      startValue: 0,
      endValue: 0,
      deltaFromStart: 0,
      daysInDebt: 0,
      daysDebtFree: 0,
      recordedDays: 0,
      longestDebtStreak: 0,
      biggestJump: 0,
      biggestDrop: 0,
      recentAverage: 0,
      priorAverage: 0,
    };
  }
  const values = recorded.map((p) => p.totalDebt);
  const peak = Math.max(...values);
  const trough = Math.min(...values);
  const average = values.reduce((s, v) => s + v, 0) / values.length;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
      : sorted[mid] ?? 0;

  const startValue = values[0] ?? 0;
  const endValue = values[values.length - 1] ?? 0;
  const deltaFromStart = endValue - startValue;

  let daysInDebt = 0;
  let daysDebtFree = 0;
  let currentStreak = 0;
  let longestDebtStreak = 0;
  for (const v of values) {
    if (v > 0) {
      daysInDebt += 1;
      currentStreak += 1;
      if (currentStreak > longestDebtStreak) longestDebtStreak = currentStreak;
    } else {
      daysDebtFree += 1;
      currentStreak = 0;
    }
  }

  let biggestJump = 0;
  let biggestDrop = 0;
  for (let i = 1; i < values.length; i++) {
    const a = values[i - 1] ?? 0;
    const b = values[i] ?? 0;
    const diff = b - a;
    if (diff > biggestJump) biggestJump = diff;
    if (diff < biggestDrop) biggestDrop = diff;
  }

  const recentSlice = values.slice(-RECENT_VELOCITY_DAYS);
  const priorSlice = values.slice(
    -RECENT_VELOCITY_DAYS * 2,
    -RECENT_VELOCITY_DAYS
  );
  const recentAverage = recentSlice.length
    ? recentSlice.reduce((s, v) => s + v, 0) / recentSlice.length
    : 0;
  const priorAverage = priorSlice.length
    ? priorSlice.reduce((s, v) => s + v, 0) / priorSlice.length
    : recentAverage;

  return {
    peak,
    trough,
    average,
    median,
    startValue,
    endValue,
    deltaFromStart,
    daysInDebt,
    daysDebtFree,
    recordedDays: recorded.length,
    longestDebtStreak,
    biggestJump,
    biggestDrop,
    recentAverage,
    priorAverage,
  };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function DebtPage() {
  const items = useOrderStore((state) => state.items);
  const loadItems = useOrderStore((state) => state.loadItems);
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);
  const [seriesByRange, setSeriesByRange] = useState<
    Partial<Record<RangeKey, SeriesPoint[]>>
  >({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (seriesByRange[range]) return;
    let cancelled = false;
    setLoading(true);
    const { start, end } = resolveRangeKey(range);
    (async () => {
      try {
        const res = await fetch(
          `/api/debt-snapshots?start=${start}&end=${end}`
        );
        if (!res.ok) return;
        const json = (await res.json()) as { series: SeriesPoint[] };
        if (cancelled) return;
        setSeriesByRange((prev) => ({ ...prev, [range]: json.series }));
      } catch (err) {
        console.error("Failed to load debt snapshots", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range, seriesByRange]);

  const series = seriesByRange[range] ?? [];
  const chartSeries = useMemo<ChartPoint[]>(
    () => series.map((p) => ({ date: p.date, value: p.totalDebt })),
    [series]
  );

  const activeItems = useMemo(
    () =>
      (items ?? []).filter(
        (i) => i.status !== ItemStatus.Done && i.status !== ItemStatus.Hidden
      ),
    [items]
  );

  const { total: totalDebt } = useMemo(
    () => computeDebtBreakdown(activeItems),
    [activeItems]
  );

  const overdueItems = useMemo(() => {
    const today = laDayKey();
    type Row = { item: Item; daysOverdue: number };
    const rows: Row[] = [];
    for (const item of activeItems) {
      const due = item.dueDate?.slice(0, 10);
      if (!due || due.length !== 10) continue;
      const diff = dayDiffKeys(due, today);
      if (diff > 0) rows.push({ item, daysOverdue: diff });
    }
    rows.sort((a, b) => b.daysOverdue - a.daysOverdue);
    return rows;
  }, [activeItems]);

  // Health-score what-if. We need all items (including Done/Hidden) so the
  // on-time rate component reflects historical shipments.
  const { items: allItems } = useAllItems();
  const healthCurrent = useMemo(
    () => (allItems ? computeHealthScore(allItems) : null),
    [allItems]
  );
  const healthIfDebtCleared = useMemo(
    () =>
      allItems
        ? computeHealthScore(allItems, { simulateDebtCleared: true })
        : null,
    [allItems]
  );
  const healthIf1Week = useMemo(
    () =>
      allItems
        ? computeHealthScore(allItems, { sustainedDebtFreeDays: 7 })
        : null,
    [allItems]
  );
  const healthIf2Weeks = useMemo(
    () =>
      allItems
        ? computeHealthScore(allItems, { sustainedDebtFreeDays: 14 })
        : null,
    [allItems]
  );
  const healthDelta =
    healthCurrent && healthIfDebtCleared
      ? healthIfDebtCleared.total - healthCurrent.total
      : 0;
  const healthChangedRows = useMemo(() => {
    if (!healthCurrent || !healthIfDebtCleared) return [];
    return healthCurrent.breakdown
      .map((row, i) => {
        const projected = healthIfDebtCleared.breakdown[i];
        if (!projected) return null;
        const diff = projected.earned - row.earned;
        if (Math.abs(diff) < 0.05) return null;
        return {
          label: row.label,
          before: row.earned,
          after: projected.earned,
          diff,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [healthCurrent, healthIfDebtCleared]);

  const stats = useMemo(() => summarizeSeries(series), [series]);
  const { days, label: rangeLabel } = resolveRangeKey(range);
  const debtFreePct = stats.recordedDays
    ? Math.round((stats.daysDebtFree / stats.recordedDays) * 100)
    : 0;
  const velocityDelta = stats.recentAverage - stats.priorAverage;
  const velocityTone: "good" | "bad" | "neutral" =
    velocityDelta < -0.5 ? "good" : velocityDelta > 0.5 ? "bad" : "neutral";
  const startTone: "good" | "bad" | "neutral" =
    stats.deltaFromStart < 0
      ? "good"
      : stats.deltaFromStart > 0
        ? "bad"
        : "neutral";

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Total overdue time debt
          </p>
          <div
            className={cn(
              "mt-1 text-6xl font-bold tabular-nums leading-none",
              totalDebt > 0
                ? "text-red-500 dark:text-red-400"
                : "text-emerald-500 dark:text-emerald-400"
            )}
          >
            {totalDebt > 0 ? `−${totalDebt}` : "0"}
            <span className="text-2xl font-medium ml-2 text-slate-400">
              day{totalDebt === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Across {overdueItems.length} overdue item
            {overdueItems.length === 1 ? "" : "s"}
          </p>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </header>

      {healthCurrent &&
        healthIfDebtCleared &&
        healthIf1Week &&
        healthIf2Weeks &&
        totalDebt > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <section className="rounded-2xl glass-surface p-5">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Health if debt cleared
                  </p>
                  <div className="mt-1 text-5xl font-bold tabular-nums leading-none text-emerald-500 dark:text-emerald-400">
                    {healthIfDebtCleared.total}
                    <span className="text-xl font-medium ml-2 text-slate-400">
                      / 100
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Currently {healthCurrent.total}
                    {healthDelta > 0 && (
                      <>
                        {" · "}
                        <span className="text-emerald-500 dark:text-emerald-400 font-semibold">
                          +{healthDelta} pts
                        </span>{" "}
                        from clearing debt
                      </>
                    )}
                  </p>
                </div>
                {healthChangedRows.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {healthChangedRows.map((row) => (
                      <div
                        key={row.label}
                        className="rounded-lg bg-white/5 border border-white/10 px-3 py-2"
                      >
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">
                          {row.label}
                        </div>
                        <div className="mt-0.5 tabular-nums">
                          <span className="text-slate-400">
                            {row.before.toFixed(1)}
                          </span>
                          <span className="mx-1 text-slate-500">→</span>
                          <span className="font-semibold text-emerald-500 dark:text-emerald-400">
                            {row.after.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl glass-surface p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                If sustained debt-free
              </p>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-4xl font-bold tabular-nums leading-none text-emerald-500 dark:text-emerald-400">
                    {healthIf1Week.total}
                    <span className="text-base font-medium ml-1.5 text-slate-400">
                      / 100
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    after 1 week
                    {healthIf1Week.total - healthCurrent.total > 0 && (
                      <>
                        {" · "}
                        <span className="text-emerald-500 dark:text-emerald-400 font-semibold">
                          +{healthIf1Week.total - healthCurrent.total} pts
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <div className="text-4xl font-bold tabular-nums leading-none text-emerald-500 dark:text-emerald-400">
                    {healthIf2Weeks.total}
                    <span className="text-base font-medium ml-1.5 text-slate-400">
                      / 100
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    after 2 weeks
                    {healthIf2Weeks.total - healthCurrent.total > 0 && (
                      <>
                        {" · "}
                        <span className="text-emerald-500 dark:text-emerald-400 font-semibold">
                          +{healthIf2Weeks.total - healthCurrent.total} pts
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                Recent shipments retroactively count as on-time (couldn't have
                shipped late without the item being briefly overdue).
              </p>
            </section>
          </div>
        )}

      <section className="rounded-2xl glass-surface p-5 mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            {rangeLabel} trend
          </h2>
          {loading && (
            <span className="text-xs text-slate-400">Loading…</span>
          )}
        </div>
        <TimeSeriesChart
          series={chartSeries}
          color={DEBT_CHART_COLOR}
          gradientId="debt-area"
          formatValue={(v) => `${v} d`}
          emptyLabel="No time debt history yet — check back tomorrow."
          showWeekBoundaries={days <= 90}
        />
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        <StatTile
          label={`${rangeLabel} peak`}
          value={`${stats.peak} d`}
          sublabel="worst day"
        />
        <StatTile
          label={`${rangeLabel} avg`}
          value={`${Math.round(stats.average)} d`}
          sublabel={`median ${Math.round(stats.median)} d`}
        />
        <StatTile
          label="Δ vs start"
          value={`${stats.deltaFromStart > 0 ? "+" : stats.deltaFromStart < 0 ? "−" : ""}${Math.abs(stats.deltaFromStart)} d`}
          sublabel={`from ${stats.startValue} d`}
          tone={startTone}
        />
        <StatTile
          label="7-day velocity"
          value={`${velocityDelta > 0 ? "+" : velocityDelta < 0 ? "−" : ""}${Math.abs(Math.round(velocityDelta))} d`}
          sublabel={`vs prior 7d`}
          tone={velocityTone}
        />
        <StatTile
          label="Time-debt-free days"
          value={`${stats.daysDebtFree} d`}
          sublabel={`${debtFreePct}% of ${stats.recordedDays} tracked`}
          tone={debtFreePct > 0 ? "good" : "neutral"}
        />
        <StatTile
          label="Days in time debt"
          value={`${stats.daysInDebt} d`}
          sublabel={`${100 - debtFreePct}% of ${stats.recordedDays} tracked`}
          tone={stats.daysInDebt > 0 ? "bad" : "neutral"}
        />
        <StatTile
          label="Longest time debt streak"
          value={`${stats.longestDebtStreak} d`}
          sublabel="consecutive days"
          tone={stats.longestDebtStreak > 0 ? "bad" : "neutral"}
        />
        <StatTile
          label="Biggest swings"
          value={`+${stats.biggestJump} / −${Math.abs(stats.biggestDrop)} d`}
          sublabel="day-over-day"
        />
      </section>

      <section className="rounded-2xl glass-surface p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Overdue items
          </h2>
          <span className="text-xs text-slate-400">
            {overdueItems.length} item
            {overdueItems.length === 1 ? "" : "s"}
          </span>
        </div>
        {overdueItems.length === 0 ? (
          <p className="text-sm text-slate-400">
            No overdue items right now.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Due</th>
                  <th className="px-3 py-2 font-medium text-right">
                    Days overdue
                  </th>
                </tr>
              </thead>
              <tbody>
                {overdueItems.map(({ item, daysOverdue }) => {
                  const color = STATUS_COLORS[item.status];
                  return (
                    <tr
                      key={item.id}
                      className="border-t border-white/5 hover:bg-white/5 transition"
                    >
                      <td className="px-3 py-2 font-medium">
                        {item.customerName || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide bg-white/5",
                            `text-${color}`
                          )}
                        >
                          {STATUS_LABELS[item.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-400">
                        {item.dueDate?.slice(0, 10) ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-red-500 dark:text-red-400">
                        −{daysOverdue}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
