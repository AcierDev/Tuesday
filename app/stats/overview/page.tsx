"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ItemStatus } from "@/typings/types";
import { computeDebtBreakdown, laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import {
  bucketCompletionsByDay,
  bucketGluedSquaresByDay,
  bucketOnTimeByWeek,
  buildGluedEvents,
  computeCurrentlyLate,
  computeOnTimeStats,
  summarizeDayBuckets,
} from "@/lib/production-metrics";
import {
  DEFAULT_RANGE,
  RANGE_OPTIONS,
  RangeKey,
  RangeSelector,
  smoothPath,
  StatTile,
  useActivities,
  useAllItems,
} from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const COMBINED_SERIES_COLORS = {
  debt: "rgb(244 63 94)", // rose-500
  shipped: "rgb(59 130 246)", // blue-500
  onTime: "rgb(16 185 129)", // emerald-500
  glued: "rgb(251 191 36)", // amber-400
  backlog: "rgb(217 70 239)", // fuchsia-500
} as const;

const COMBINED_CHART_HEIGHT = 280;
const COMBINED_PADDING_X = 16;
const COMBINED_PADDING_TOP = 16;
const COMBINED_PADDING_BOTTOM = 28;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

type DebtSnapshot = { date: string; totalDebt: number; recorded?: boolean };
type BacklogSnapshot = { date: string; squares: number; recorded?: boolean };

export default function OverviewPage() {
  const { items, loading, error } = useAllItems();
  const { activities } = useActivities();
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);
  const [debtByRange, setDebtByRange] = useState<
    Partial<Record<RangeKey, DebtSnapshot[]>>
  >({});
  const [backlogByRange, setBacklogByRange] = useState<
    Partial<Record<RangeKey, BacklogSnapshot[]>>
  >({});

  const days = RANGE_OPTIONS.find((r) => r.key === range)?.days ?? 30;
  const rangeLabel =
    RANGE_OPTIONS.find((r) => r.key === range)?.label ?? "";

  const debtSeries = debtByRange[range];
  const backlogSeries = backlogByRange[range];

  useEffect(() => {
    if (debtSeries && backlogSeries) return;
    let cancelled = false;
    if (!debtSeries) {
      (async () => {
        try {
          const res = await fetch(`/api/debt-snapshots?days=${days}`);
          if (!res.ok) return;
          const json = (await res.json()) as { series: DebtSnapshot[] };
          if (!cancelled)
            setDebtByRange((prev) => ({ ...prev, [range]: json.series }));
        } catch (err) {
          console.error("Failed to load debt snapshots", err);
        }
      })();
    }
    if (!backlogSeries) {
      (async () => {
        try {
          const res = await fetch(`/api/backlog-snapshots?days=${days}`);
          if (!res.ok) return;
          const json = (await res.json()) as { series: BacklogSnapshot[] };
          if (!cancelled)
            setBacklogByRange((prev) => ({ ...prev, [range]: json.series }));
        } catch (err) {
          console.error("Failed to load backlog snapshots", err);
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [days, range, debtSeries, backlogSeries]);

  const summary = useMemo(() => {
    if (!items) return null;
    const today = laDayKey();
    const start = shiftDayKey(today, -(days - 1));
    const active = items.filter(
      (i) => i.status !== ItemStatus.Done && i.status !== ItemStatus.Hidden
    );
    const debt = computeDebtBreakdown(active);
    const lateNow = computeCurrentlyLate(active);
    const buckets = bucketCompletionsByDay(items, start, today);
    const throughput = summarizeDayBuckets(buckets);
    const onTime = computeOnTimeStats(items, start, today);

    return {
      debt: debt.total,
      lateNow: lateNow.length,
      throughputTotal: throughput.total,
      throughputAvg: throughput.average,
      onTimePct: onTime.onTimePct,
      onTimeTotal: onTime.total,
      wipTotal: active.length,
    };
  }, [items, days]);

  const combinedChart = useMemo(() => {
    if (!items) return null;
    const today = laDayKey();
    const start = shiftDayKey(today, -(days - 1));
    const dates = Array.from({ length: days }, (_, i) =>
      shiftDayKey(start, i)
    );

    // Debt — daily, snapshotted; carries forward across gaps already.
    const debtByDate = new Map(
      (debtSeries ?? []).map((p) => [p.date, p.totalDebt])
    );
    const debtValues = dates.map((d) => debtByDate.get(d) ?? null);

    // Backlog — daily snapshot of squares across New / On Deck / WIP.
    const backlogByDate = new Map(
      (backlogSeries ?? []).map((p) => [p.date, p.squares])
    );
    const backlogValues = dates.map((d) => backlogByDate.get(d) ?? null);

    // Shipped — completions per day from items.
    const shipBuckets = bucketCompletionsByDay(items, start, today);
    const shipByDate = new Map(shipBuckets.map((b) => [b.date, b.value]));
    const shippedValues = dates.map((d) => shipByDate.get(d) ?? 0);

    // On-time % — weekly. Anchor each week's value at the last day of that
    // week so the line steps along with the data.
    const weekly = bucketOnTimeByWeek(items, start, today);
    const onTimeByDate = new Map(weekly.map((w) => [w.date, w.value]));
    const onTimeValues = dates.map((d) => onTimeByDate.get(d) ?? null);

    // Glued — squares glued per day from activity log. Needs activities;
    // until they load we still render the other series.
    let gluedValues: (number | null)[] = dates.map(() => null);
    if (activities) {
      const events = buildGluedEvents(activities, items).filter(
        (e) => e.dayKey >= start && e.dayKey <= today
      );
      const gluedBuckets = bucketGluedSquaresByDay(events, start, today);
      const gluedByDate = new Map(
        gluedBuckets.map((b) => [b.date, b.value])
      );
      gluedValues = dates.map((d) => gluedByDate.get(d) ?? 0);
    }

    return {
      dates,
      series: [
        {
          key: "debt",
          label: "Time Debt",
          color: COMBINED_SERIES_COLORS.debt,
          values: debtValues,
          format: (v: number) => `${Math.round(v)} d`,
        },
        {
          key: "shipped",
          label: "Shipped",
          color: COMBINED_SERIES_COLORS.shipped,
          values: shippedValues,
          format: (v: number) => `${Math.round(v)} items`,
        },
        {
          key: "onTime",
          label: "On-time %",
          color: COMBINED_SERIES_COLORS.onTime,
          values: onTimeValues,
          format: (v: number) => `${Math.round(v)}%`,
        },
        {
          key: "glued",
          label: "Glued",
          color: COMBINED_SERIES_COLORS.glued,
          values: gluedValues,
          format: (v: number) => `${Math.round(v)} sq`,
        },
        {
          key: "backlog",
          label: "Backlog",
          color: COMBINED_SERIES_COLORS.backlog,
          values: backlogValues,
          format: (v: number) => `${Math.round(v)} sq`,
        },
      ],
    };
  }, [items, days, debtSeries, backlogSeries, activities]);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            At a glance · {rangeLabel.toLowerCase()}
          </p>
          <h2 className="mt-1 heading-page">
            {summary
              ? `${summary.throughputTotal} items shipped, ${summary.wipTotal} in flight`
              : "—"}
          </h2>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KPILink href="/stats/debt" tile={
          <StatTile
            label="Time Debt"
            value={summary ? `${summary.debt} d` : "—"}
            sublabel="overdue"
            tone={summary && summary.debt > 0 ? "bad" : "good"}
          />
        } />
        <KPILink href="/stats/on-time" tile={
          <StatTile
            label="Late now"
            value={`${summary?.lateNow ?? 0} items`}
            tone={(summary?.lateNow ?? 0) > 0 ? "bad" : "good"}
          />
        } />
        <KPILink href="/stats/throughput" tile={
          <StatTile
            label="Avg / day"
            value={summary ? `${summary.throughputAvg.toFixed(1)} items` : "—"}
            sublabel={`${summary?.throughputTotal ?? 0} this period`}
          />
        } />
        <KPILink href="/stats/on-time" tile={
          <StatTile
            label="On-time"
            value={summary ? `${Math.round(summary.onTimePct)}%` : "—"}
            sublabel={`of ${summary?.onTimeTotal ?? 0} shipped`}
            tone={
              summary
                ? summary.onTimePct >= 90
                  ? "good"
                  : summary.onTimePct < 70
                    ? "bad"
                    : "neutral"
                : "neutral"
            }
          />
        } />
        <KPILink href="/stats/wip" tile={
          <StatTile
            label="WIP"
            value={`${summary?.wipTotal ?? 0} items`}
            sublabel="active"
          />
        } />
        <KPILink href="/stats/health" tile={
          <StatTile label="Health" value={summary ? healthLabel(summary) : "—"} sublabel="composite" />
        } />
      </section>

      <section className="rounded-2xl glass-surface p-5 mb-6">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            {rangeLabel} combined trend
          </h3>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            normalized · hover for actuals · click legend to toggle
          </span>
        </div>
        {combinedChart ? (
          <CombinedChart
            dates={combinedChart.dates}
            series={combinedChart.series}
          />
        ) : (
          <p className="text-sm text-slate-400">—</p>
        )}
      </section>

    </>
  );
}

function KPILink({
  href,
  tile,
}: {
  href: string;
  tile: React.ReactNode;
}) {
  return (
    <Link href={href} className="block hover:opacity-90 transition">
      {tile}
    </Link>
  );
}

function healthLabel(s: { onTimePct: number; debt: number; lateNow: number }) {
  let score = 100;
  if (s.onTimePct < 95) score -= (95 - s.onTimePct) * 0.5;
  if (s.debt > 0) score -= Math.min(30, s.debt);
  if (s.lateNow > 0) score -= Math.min(20, s.lateNow * 2);
  score = Math.max(0, Math.round(score));
  return `${score}`;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📈 COMBINED CHART — overlaid normalized multi-series line            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

type CombinedSeries = {
  key: string;
  label: string;
  color: string;
  values: (number | null)[];
  format: (v: number) => string;
};

function CombinedChart({
  dates,
  series,
}: {
  dates: string[];
  series: CombinedSeries[];
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const toggleSeries = (key: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    const update = () => {
      if (wrapRef.current) setWidth(wrapRef.current.clientWidth);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const innerWidth = Math.max(width - COMBINED_PADDING_X * 2, 1);
  const innerHeight =
    COMBINED_CHART_HEIGHT - COMBINED_PADDING_TOP - COMBINED_PADDING_BOTTOM;
  const stepX =
    dates.length > 1 ? innerWidth / (dates.length - 1) : innerWidth;
  const toX = (i: number) => COMBINED_PADDING_X + i * stepX;

  // Per-series max so each line uses the full vertical band — comparing
  // shapes, not magnitudes. Latest value is shown in the legend for scale.
  const seriesMax = series.map((s) => {
    const numeric = s.values.filter((v): v is number => v !== null);
    const max = numeric.length > 0 ? Math.max(...numeric) : 0;
    return max <= 0 ? 1 : max;
  });

  const toY = (seriesIdx: number, v: number) => {
    const max = seriesMax[seriesIdx]!;
    return (
      COMBINED_PADDING_TOP +
      innerHeight -
      (Math.max(0, Math.min(v, max)) / max) * innerHeight
    );
  };

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - COMBINED_PADDING_X;
    const idx = Math.round(x / stepX);
    if (idx < 0 || idx >= dates.length) {
      setHoverIndex(null);
      return;
    }
    setHoverIndex(idx);
  };

  const targetXLabels = Math.min(6, dates.length);
  const xLabelStep = Math.max(
    1,
    Math.floor((dates.length - 1) / Math.max(targetXLabels - 1, 1))
  );
  const xLabels = dates
    .map((d, i) => ({ d, i }))
    .filter(
      (_, i, arr) => i === 0 || i === arr.length - 1 || i % xLabelStep === 0
    );

  const formatDateLabel = (key: string) =>
    new Date(`${key}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  // Saturday boundaries — week-start gridlines.
  const weekBoundaries: number[] = [];
  for (let i = 0; i < dates.length; i++) {
    const [y, m, d] = dates[i]!.split("-").map(Number);
    if (y === undefined || m === undefined || d === undefined) continue;
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (dow === 6 && i > 0) weekBoundaries.push(i);
  }

  // Latest non-null value per series — shown in the legend.
  const legendValues = series.map((s) => {
    for (let i = s.values.length - 1; i >= 0; i--) {
      const v = s.values[i];
      if (v !== null && v !== undefined) return s.format(v);
    }
    return "—";
  });

  return (
    <div ref={wrapRef} className="w-full relative">
      <div className="h-7 mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {hoverIndex !== null && dates[hoverIndex] && (
          <>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 tabular-nums">
              {new Date(`${dates[hoverIndex]}T12:00:00`).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric", year: "numeric" }
              )}
            </span>
            {series.map((s) => {
              if (hiddenSeries.has(s.key)) return null;
              const v = s.values[hoverIndex];
              return (
                <div
                  key={s.key}
                  className="flex items-center gap-1.5 tabular-nums"
                >
                  <span
                    className="inline-block w-2 h-2 rounded-sm"
                    style={{ background: s.color }}
                  />
                  <span className="text-slate-300">{s.label}</span>
                  <span className="font-semibold text-white">
                    {v === null || v === undefined ? "—" : s.format(v)}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>
      <svg
        width={width}
        height={COMBINED_CHART_HEIGHT}
        className="overflow-visible"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {weekBoundaries.map((i) => (
          <line
            key={`week-${i}`}
            x1={toX(i)}
            x2={toX(i)}
            y1={COMBINED_PADDING_TOP}
            y2={COMBINED_PADDING_TOP + innerHeight}
            stroke="white"
            strokeOpacity="0.08"
            strokeWidth={1}
          />
        ))}

        {series.map((s, sIdx) => {
          if (hiddenSeries.has(s.key)) return null;
          // Split into segments around nulls so weekly/sparse series render
          // as separate sub-lines rather than fake-connecting through gaps.
          const segments: { i: number; v: number }[][] = [];
          let current: { i: number; v: number }[] = [];
          s.values.forEach((v, i) => {
            if (v === null || v === undefined) {
              if (current.length > 0) {
                segments.push(current);
                current = [];
              }
            } else {
              current.push({ i, v });
            }
          });
          if (current.length > 0) segments.push(current);

          return (
            <g key={s.key}>
              {segments.map((seg, segIdx) => {
                const pts = seg.map(({ i, v }) => ({
                  x: toX(i),
                  y: toY(sIdx, v),
                }));
                return (
                  <path
                    key={segIdx}
                    d={smoothPath(pts)}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeOpacity="0.95"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}
            </g>
          );
        })}

        {xLabels.map(({ d, i }) => (
          <text
            key={d}
            x={toX(i)}
            y={COMBINED_CHART_HEIGHT - 8}
            textAnchor="middle"
            className="fill-slate-400"
            fontSize="11"
          >
            {formatDateLabel(d)}
          </text>
        ))}

        {hoverIndex !== null && (
          <g pointerEvents="none">
            <line
              x1={toX(hoverIndex)}
              x2={toX(hoverIndex)}
              y1={COMBINED_PADDING_TOP}
              y2={COMBINED_PADDING_TOP + innerHeight}
              stroke="currentColor"
              strokeOpacity="0.2"
              strokeDasharray="2 3"
            />
            {series.map((s, sIdx) => {
              if (hiddenSeries.has(s.key)) return null;
              const v = s.values[hoverIndex];
              if (v === null || v === undefined) return null;
              return (
                <circle
                  key={s.key}
                  cx={toX(hoverIndex)}
                  cy={toY(sIdx, v)}
                  r={4}
                  fill={s.color}
                  stroke="white"
                  strokeOpacity="0.9"
                  strokeWidth={1.5}
                />
              );
            })}
          </g>
        )}
      </svg>

      <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1.5 text-xs text-slate-300">
        {series.map((s, i) => {
          const hidden = hiddenSeries.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggleSeries(s.key)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1 transition hover:bg-white/5",
                hidden && "opacity-40"
              )}
              aria-pressed={!hidden}
            >
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{
                  background: hidden ? "transparent" : s.color,
                  boxShadow: hidden ? `inset 0 0 0 2px ${s.color}` : undefined,
                }}
              />
              <span
                className={cn(
                  "font-medium",
                  hidden ? "text-slate-400 line-through" : "text-white"
                )}
              >
                {s.label}
              </span>
              <span className="text-slate-400 tabular-nums">
                {legendValues[i]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
