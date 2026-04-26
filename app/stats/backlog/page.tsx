"use client";

import { useEffect, useMemo, useState } from "react";

import { useOrderStore } from "@/stores/useOrderStore";
import { Item, ItemStatus } from "@/typings/types";
import { STATUS_COLORS } from "@/typings/constants";
import { parseSquareSize } from "@/lib/production-metrics";
import {
  ChartPoint,
  DEFAULT_RANGE,
  RANGE_OPTIONS,
  RangeKey,
  RangeSelector,
  StatTile,
  TimeSeriesChart,
} from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const RECENT_VELOCITY_DAYS = 7;
const BACKLOG_CHART_COLOR = "rgb(56 189 248)";
const TOP_ITEMS_LIMIT = 25;

const BACKLOG_STATUSES: ItemStatus[] = [
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
];

const STATUS_LABELS: Partial<Record<ItemStatus, string>> = {
  [ItemStatus.New]: "New",
  [ItemStatus.OnDeck]: "On Deck",
  [ItemStatus.Wip]: "WIP",
};

type SeriesPoint = { date: string; squares: number; recorded?: boolean };

function formatSquares(n: number): string {
  if (n < 1000) return n.toString();
  return (n / 1000).toFixed(1) + "k";
}

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
  recordedDays: number;
  biggestJump: number;
  biggestDrop: number;
  recentAverage: number;
  priorAverage: number;
}

function summarizeSeries(series: SeriesPoint[]): SeriesStats {
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
      recordedDays: 0,
      biggestJump: 0,
      biggestDrop: 0,
      recentAverage: 0,
      priorAverage: 0,
    };
  }
  const values = recorded.map((p) => p.squares);
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
    recordedDays: recorded.length,
    biggestJump,
    biggestDrop,
    recentAverage,
    priorAverage,
  };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function BacklogPage() {
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

  // Record today's snapshot on mount so the chart reflects live state even
  // when the user lands directly on /stats/backlog without visiting /orders.
  // Mirrors the same POST that /orders/page.tsx fires.
  useEffect(() => {
    fetch("/api/backlog-snapshots", { method: "POST" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (seriesByRange[range]) return;
    let cancelled = false;
    setLoading(true);
    const days = RANGE_OPTIONS.find((r) => r.key === range)?.days ?? 30;
    (async () => {
      try {
        const res = await fetch(`/api/backlog-snapshots?days=${days}`);
        if (!res.ok) return;
        const json = (await res.json()) as { series: SeriesPoint[] };
        if (cancelled) return;
        setSeriesByRange((prev) => ({ ...prev, [range]: json.series }));
      } catch (err) {
        console.error("Failed to load backlog snapshots", err);
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
    () => series.map((p) => ({ date: p.date, value: p.squares })),
    [series]
  );

  // Per-item squares for the backlog statuses, computed from current items.
  // Items whose size doesn't parse are excluded from totals (they have no
  // square count to attribute).
  const backlogItems = useMemo(() => {
    type Row = { item: Item; squares: number };
    const rows: Row[] = [];
    for (const item of items ?? []) {
      if (!BACKLOG_STATUSES.includes(item.status)) continue;
      const parsed = parseSquareSize(item.size);
      if (!parsed) continue;
      rows.push({ item, squares: parsed.squares });
    }
    rows.sort((a, b) => b.squares - a.squares);
    return rows;
  }, [items]);

  const totalSquares = useMemo(
    () => backlogItems.reduce((s, r) => s + r.squares, 0),
    [backlogItems]
  );

  const byStatus = useMemo(() => {
    const counts: Partial<Record<ItemStatus, { squares: number; items: number }>> = {};
    for (const { item, squares } of backlogItems) {
      const bucket = counts[item.status] ?? { squares: 0, items: 0 };
      bucket.squares += squares;
      bucket.items += 1;
      counts[item.status] = bucket;
    }
    return counts;
  }, [backlogItems]);

  const stats = useMemo(() => summarizeSeries(series), [series]);
  const rangeLabel = RANGE_OPTIONS.find((r) => r.key === range)?.label ?? "";
  const velocityDelta = stats.recentAverage - stats.priorAverage;
  // For backlog: shrinking is good, growing is bad.
  const velocityTone: "good" | "bad" | "neutral" =
    velocityDelta < -10 ? "good" : velocityDelta > 10 ? "bad" : "neutral";

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Current backlog
          </p>
          <div
            className={cn(
              "mt-1 text-6xl font-bold tabular-nums leading-none",
              totalSquares > 0
                ? "text-sky-400"
                : "text-emerald-500 dark:text-emerald-400"
            )}
          >
            {formatSquares(totalSquares)}
            <span className="text-2xl font-medium ml-2 text-slate-400">
              square{totalSquares === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Across {backlogItems.length} item
            {backlogItems.length === 1 ? "" : "s"} in New / On Deck / WIP
          </p>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </header>

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
          color={BACKLOG_CHART_COLOR}
          gradientId="backlog-area"
          formatValue={(v) => `${formatSquares(Math.round(v))} sq`}
          emptyLabel="No backlog history yet — check back tomorrow."
          showWeekBoundaries={range === "30d" || range === "90d"}
        />
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        <StatTile
          label={`${rangeLabel} peak`}
          value={`${formatSquares(stats.peak)} sq`}
          sublabel="biggest day"
        />
        <StatTile
          label={`${rangeLabel} trough`}
          value={`${formatSquares(stats.trough)} sq`}
          sublabel="smallest day"
        />
        <StatTile
          label={`${rangeLabel} avg`}
          value={`${formatSquares(Math.round(stats.average))} sq`}
          sublabel={`median ${formatSquares(Math.round(stats.median))} sq`}
        />
        <StatTile
          label="7-day velocity"
          value={`${velocityDelta > 0 ? "+" : velocityDelta < 0 ? "−" : ""}${formatSquares(Math.abs(Math.round(velocityDelta)))} sq`}
          sublabel="vs prior 7d"
          tone={velocityTone}
        />
        <StatTile
          label="Biggest drop"
          value={`−${formatSquares(Math.abs(stats.biggestDrop))} sq`}
          sublabel="day-over-day"
          tone={stats.biggestDrop < 0 ? "good" : "neutral"}
        />
      </section>

      <section className="rounded-2xl glass-surface p-5 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          By status (today)
        </h2>
        {totalSquares === 0 ? (
          <p className="text-sm text-slate-400">
            No backlog right now. Nice work.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BACKLOG_STATUSES.map((status) => {
              const bucket = byStatus[status] ?? { squares: 0, items: 0 };
              const color = STATUS_COLORS[status];
              const share = totalSquares
                ? Math.round((bucket.squares / totalSquares) * 100)
                : 0;
              return (
                <div
                  key={status}
                  className="rounded-xl px-3 py-3 bg-white/5 border border-white/10 flex flex-col items-start"
                >
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wide",
                      `text-${color}`
                    )}
                  >
                    {STATUS_LABELS[status] ?? status}
                  </span>
                  <span className="mt-1 text-2xl font-bold tabular-nums leading-none">
                    {formatSquares(bucket.squares)}
                    <span className="ml-1 text-xs font-medium text-slate-400">
                      sq
                    </span>
                  </span>
                  <span className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                    {bucket.items} item{bucket.items === 1 ? "" : "s"} · {share}%
                  </span>
                  <div className="mt-2 w-full h-1 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", `bg-${color}`)}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl glass-surface p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Top backlog items
          </h2>
          <span className="text-xs text-slate-400">
            {backlogItems.length === 0
              ? "—"
              : `Showing ${Math.min(backlogItems.length, TOP_ITEMS_LIMIT)} of ${backlogItems.length}`}
          </span>
        </div>
        {backlogItems.length === 0 ? (
          <p className="text-sm text-slate-400">No backlog items right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Size</th>
                  <th className="px-3 py-2 font-medium text-right">Squares</th>
                </tr>
              </thead>
              <tbody>
                {backlogItems.slice(0, TOP_ITEMS_LIMIT).map(({ item, squares }) => {
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
                          {STATUS_LABELS[item.status] ?? item.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-400">
                        {item.size || "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-sky-400">
                        {squares.toLocaleString()}
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
