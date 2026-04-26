"use client";

import { useMemo, useState } from "react";

import { laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import { bucketCompletionsByDay, summarizeDayBuckets } from "@/lib/production-metrics";
import {
  ChartPoint,
  StatTile,
  TimeSeriesChart,
  useAllItems,
} from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const RANGE_OPTIONS = [
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "Quarter", days: 90 },
  { key: "180d", label: "Half year", days: 180 },
] as const;
type YoYRange = (typeof RANGE_OPTIONS)[number]["key"];

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function YearOverYearPage() {
  const { items, loading, error } = useAllItems();
  const [range, setRange] = useState<YoYRange>("30d");

  const days = RANGE_OPTIONS.find((r) => r.key === range)?.days ?? 30;
  const rangeLabel = RANGE_OPTIONS.find((r) => r.key === range)?.label ?? "";

  const data = useMemo(() => {
    if (!items) return null;
    const today = laDayKey();
    const start = shiftDayKey(today, -(days - 1));
    const lastYearStart = shiftDayKey(start, -365);
    const lastYearEnd = shiftDayKey(today, -365);
    const recent = bucketCompletionsByDay(items, start, today);
    const prior = bucketCompletionsByDay(items, lastYearStart, lastYearEnd);
    const recentSummary = summarizeDayBuckets(recent);
    const priorSummary = summarizeDayBuckets(prior);
    return { recent, prior, recentSummary, priorSummary };
  }, [items, days]);

  // Overlay both series in chart by indexing prior bucket dates as recent ones.
  const recentSeries = useMemo<ChartPoint[]>(
    () => data?.recent.map((b) => ({ date: b.date, value: b.value })) ?? [],
    [data]
  );
  const priorSeries = useMemo<ChartPoint[]>(
    () =>
      data?.recent.map((b, i) => ({
        date: b.date,
        value: data.prior[i]?.value ?? null,
      })) ?? [],
    [data]
  );

  const delta = data ? data.recentSummary.total - data.priorSummary.total : 0;
  const deltaPct = data && data.priorSummary.total > 0
    ? ((data.recentSummary.total - data.priorSummary.total) / data.priorSummary.total) * 100
    : 0;
  const tone: "good" | "bad" | "neutral" = delta > 0 ? "good" : delta < 0 ? "bad" : "neutral";

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Year-over-year · {rangeLabel}
          </p>
          <div
            className={cn(
              "mt-1 text-6xl font-bold tabular-nums leading-none",
              tone === "good" && "text-emerald-500",
              tone === "bad" && "text-red-500",
              tone === "neutral" && "text-white"
            )}
          >
            {delta > 0 ? "+" : ""}
            {delta}
            <span className="text-2xl font-medium ml-2 text-slate-400">
              items vs last yr
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {data?.recentSummary.total ?? 0} items this period · {data?.priorSummary.total ?? 0} items same period last year ({deltaPct > 0 ? "+" : ""}{deltaPct.toFixed(0)}%)
          </p>
        </div>
        <div className="inline-flex rounded-xl glass-surface p-1 gap-1">
          {RANGE_OPTIONS.map((opt) => {
            const isActive = opt.key === range;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap",
                  isActive
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="This period"
          value={`${data?.recentSummary.total ?? 0} items`}
        />
        <StatTile
          label="Last year"
          value={`${data?.priorSummary.total ?? 0} items`}
        />
        <StatTile
          label="Avg / day now"
          value={data ? `${data.recentSummary.average.toFixed(1)} items` : "—"}
        />
        <StatTile
          label="Avg / day then"
          value={data ? `${data.priorSummary.average.toFixed(1)} items` : "—"}
        />
      </section>

      <section className="rounded-2xl glass-surface p-5 mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          This period
        </h3>
        <TimeSeriesChart
          series={recentSeries}
          color="rgb(52 211 153)"
          gradientId="yoy-recent"
          formatValue={(v) => `${Math.round(v)} items`}
        />
      </section>

      <section className="rounded-2xl glass-surface p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Same period last year
        </h3>
        <TimeSeriesChart
          series={priorSeries}
          color="rgb(148 163 184)"
          gradientId="yoy-prior"
          formatValue={(v) => `${Math.round(v)} items`}
        />
      </section>
    </>
  );
}
