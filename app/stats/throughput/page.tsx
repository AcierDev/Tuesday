"use client";

import { useMemo, useState } from "react";

import { laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import {
  bucketCompletionsByDay,
  summarizeDayBuckets,
} from "@/lib/production-metrics";
import {
  ChartPoint,
  DEFAULT_RANGE,
  RANGE_OPTIONS,
  RangeKey,
  RangeSelector,
  StatTile,
  TimeSeriesChart,
  useAllItems,
} from "@/lib/stats-shared";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const THROUGHPUT_COLOR = "rgb(52 211 153)";
const TOP_DAYS_LIMIT = 10;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function ThroughputPage() {
  const { items, loading, error } = useAllItems();
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);

  const days = RANGE_OPTIONS.find((r) => r.key === range)?.days ?? 30;
  const rangeLabel = RANGE_OPTIONS.find((r) => r.key === range)?.label ?? "";

  const buckets = useMemo(() => {
    if (!items) return [];
    const today = laDayKey();
    const start = shiftDayKey(today, -(days - 1));
    return bucketCompletionsByDay(items, start, today);
  }, [items, days]);

  const stats = useMemo(() => summarizeDayBuckets(buckets), [buckets]);
  const chartSeries = useMemo<ChartPoint[]>(
    () => buckets.map((b) => ({ date: b.date, value: b.value })),
    [buckets]
  );

  const topDays = useMemo(
    () =>
      [...buckets]
        .filter((b) => b.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, TOP_DAYS_LIMIT),
    [buckets]
  );

  const velocityDelta = stats.recentAverage - stats.priorAverage;
  const velocityTone: "good" | "bad" | "neutral" =
    velocityDelta > 0.5 ? "good" : velocityDelta < -0.5 ? "bad" : "neutral";

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Items completed · {rangeLabel}
          </p>
          <div className="mt-1 text-6xl font-bold tabular-nums leading-none text-emerald-500 dark:text-emerald-400">
            {stats.total}
            <span className="text-2xl font-medium ml-2 text-slate-400">
              item{stats.total === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Across {stats.daysWithValue} active day
            {stats.daysWithValue === 1 ? "" : "s"}
          </p>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </header>

      <section className="rounded-2xl glass-surface p-5 mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Daily completions · {rangeLabel}
          </h2>
          {loading && (
            <span className="text-xs text-slate-400">Loading…</span>
          )}
          {error && (
            <span className="text-xs text-red-500">Failed to load</span>
          )}
        </div>
        <TimeSeriesChart
          series={chartSeries}
          color={THROUGHPUT_COLOR}
          gradientId="throughput-area"
          formatValue={(v) => `${Math.round(v)} items`}
          emptyLabel="No completion history yet."
          showWeekBoundaries={range === "30d" || range === "90d"}
        />
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="Peak day"
          value={`${stats.peak} items`}
          sublabel="best single day"
        />
        <StatTile
          label="Avg / day"
          value={`${stats.average.toFixed(1)} items`}
          sublabel={`median ${stats.median} items`}
        />
        <StatTile
          label="7-day velocity"
          value={`${velocityDelta > 0 ? "+" : velocityDelta < 0 ? "−" : ""}${Math.abs(velocityDelta).toFixed(1)} items`}
          sublabel="vs prior 7d / day"
          tone={velocityTone}
        />
        <StatTile
          label="Active streak"
          value={`${stats.longestStreak} d`}
          sublabel="consecutive days"
        />
      </section>

      <section className="rounded-2xl glass-surface p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Top days
          </h2>
          <span className="text-xs text-slate-400">
            {topDays.length} day{topDays.length === 1 ? "" : "s"}
          </span>
        </div>
        {topDays.length === 0 ? (
          <p className="text-sm text-slate-400">
            No completed items in this range.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium text-right">
                    Items completed
                  </th>
                </tr>
              </thead>
              <tbody>
                {topDays.map((d) => (
                  <tr
                    key={d.date}
                    className="border-t border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="px-3 py-2 tabular-nums text-slate-400">
                      {new Date(`${d.date}T12:00:00`).toLocaleDateString(
                        "en-US",
                        { weekday: "short", month: "short", day: "numeric" }
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-500 dark:text-emerald-400">
                      {d.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
