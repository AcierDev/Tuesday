"use client";

import { useMemo, useState } from "react";

import { shiftDayKey } from "@/lib/debt-metrics";
import { bucketCompletionsByDay, summarizeDayBuckets } from "@/lib/production-metrics";
import {
  ChartPoint,
  RangeSelector,
  StatTile,
  TimeSeriesChart,
  resolveRangeKey,
  useAllItems,
} from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// YoY page restricts to rolling windows + month/quarter/year calendar
// presets — "Last year" doesn't make sense as the recent half of a YoY
// comparison, so it's omitted.
const YOY_RANGE_OPTIONS = [
  { key: "30d", label: "30 days", group: "rolling", days: 30 },
  { key: "90d", label: "90 days", group: "rolling", days: 90 },
  { key: "180d", label: "180 days", group: "rolling", days: 180 },
  { key: "mtd", label: "Month to date", group: "calendar", resolve: (today: string) => ({ start: `${today.slice(0, 7)}-01`, end: today }) },
  { key: "qtd", label: "Quarter to date", group: "calendar", resolve: (today: string) => {
    const [y, m] = today.split("-").map(Number);
    const qStart = Math.floor(((m ?? 1) - 1) / 3) * 3 + 1;
    return { start: `${y}-${String(qStart).padStart(2, "0")}-01`, end: today };
  }},
  { key: "ytd", label: "Year to date", group: "calendar", resolve: (today: string) => ({ start: `${today.slice(0, 4)}-01-01`, end: today }) },
] as const;
type YoYRange = (typeof YOY_RANGE_OPTIONS)[number]["key"];

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function YearOverYearPage() {
  const { items, loading, error } = useAllItems();
  const [range, setRange] = useState<YoYRange>("30d");

  const { start, end, label: rangeLabel } = resolveRangeKey(
    range,
    YOY_RANGE_OPTIONS
  );

  const data = useMemo(() => {
    if (!items) return null;
    const lastYearStart = shiftDayKey(start, -365);
    const lastYearEnd = shiftDayKey(end, -365);
    const recent = bucketCompletionsByDay(items, start, end);
    const prior = bucketCompletionsByDay(items, lastYearStart, lastYearEnd);
    const recentSummary = summarizeDayBuckets(recent);
    const priorSummary = summarizeDayBuckets(prior);
    return { recent, prior, recentSummary, priorSummary };
  }, [items, start, end]);

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
        <RangeSelector
          value={range}
          onChange={setRange}
          options={YOY_RANGE_OPTIONS}
        />
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
