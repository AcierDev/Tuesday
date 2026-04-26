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
import { StatTile, useActivities, useAllItems } from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const RANGE_DAYS = 30;

const COMBINED_SERIES_COLORS = {
  debt: "rgb(248 113 113)",
  shipped: "rgb(96 165 250)",
  onTime: "rgb(52 211 153)",
  glued: "rgb(56 189 248)",
} as const;

const COMBINED_CHART_HEIGHT = 280;
const COMBINED_PADDING_X = 16;
const COMBINED_PADDING_TOP = 16;
const COMBINED_PADDING_BOTTOM = 28;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

type DebtSnapshot = { date: string; totalDebt: number; recorded?: boolean };

export default function OverviewPage() {
  const { items, loading, error } = useAllItems();
  const { activities } = useActivities();
  const [debtSeries, setDebtSeries] = useState<DebtSnapshot[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/debt-snapshots?days=${RANGE_DAYS}`);
        if (!res.ok) return;
        const json = (await res.json()) as { series: DebtSnapshot[] };
        if (!cancelled) setDebtSeries(json.series);
      } catch (err) {
        console.error("Failed to load debt snapshots", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    if (!items) return null;
    const today = laDayKey();
    const start = shiftDayKey(today, -(RANGE_DAYS - 1));
    const active = items.filter(
      (i) => i.status !== ItemStatus.Done && i.status !== ItemStatus.Hidden
    );
    const debt = computeDebtBreakdown(active);
    const lateNow = computeCurrentlyLate(active);
    const buckets = bucketCompletionsByDay(items, start, today);
    const throughput = summarizeDayBuckets(buckets);
    const onTime = computeOnTimeStats(items, start, today);

    const wipByStatus: Partial<Record<ItemStatus, number>> = {};
    for (const i of active) {
      wipByStatus[i.status] = (wipByStatus[i.status] ?? 0) + 1;
    }
    return {
      debt: debt.total,
      lateNow: lateNow.length,
      throughputTotal: throughput.total,
      throughputAvg: throughput.average,
      onTimePct: onTime.onTimePct,
      onTimeTotal: onTime.total,
      wipTotal: active.length,
      wipByStatus,
    };
  }, [items]);

  const combinedChart = useMemo(() => {
    if (!items) return null;
    const today = laDayKey();
    const start = shiftDayKey(today, -(RANGE_DAYS - 1));
    const dates = Array.from({ length: RANGE_DAYS }, (_, i) =>
      shiftDayKey(start, i)
    );

    // Debt — daily, snapshotted; carries forward across gaps already.
    const debtByDate = new Map(
      (debtSeries ?? []).map((p) => [p.date, p.totalDebt])
    );
    const debtValues = dates.map((d) => debtByDate.get(d) ?? null);

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
          label: "Debt",
          color: COMBINED_SERIES_COLORS.debt,
          values: debtValues,
          format: (v: number) => `${Math.round(v)}d`,
        },
        {
          key: "shipped",
          label: "Shipped",
          color: COMBINED_SERIES_COLORS.shipped,
          values: shippedValues,
          format: (v: number) => `${Math.round(v)}`,
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
          label: "Glued (sq)",
          color: COMBINED_SERIES_COLORS.glued,
          values: gluedValues,
          format: (v: number) => `${Math.round(v)}`,
        },
      ],
    };
  }, [items, debtSeries, activities]);

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          At a glance · last 30 days
        </p>
        <h2 className="mt-1 text-3xl font-bold text-white">
          {summary
            ? `${summary.throughputTotal} items shipped, ${summary.wipTotal} in flight`
            : "—"}
        </h2>
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KPILink href="/stats/debt" tile={
          <StatTile
            label="Debt"
            value={summary ? `${summary.debt}` : "—"}
            sublabel="overdue days"
            tone={summary && summary.debt > 0 ? "bad" : "good"}
          />
        } />
        <KPILink href="/stats/on-time" tile={
          <StatTile
            label="Late now"
            value={summary?.lateNow ?? 0}
            sublabel="active items"
            tone={(summary?.lateNow ?? 0) > 0 ? "bad" : "good"}
          />
        } />
        <KPILink href="/stats/throughput" tile={
          <StatTile
            label="Avg / day"
            value={summary ? summary.throughputAvg.toFixed(1) : "—"}
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
            value={summary?.wipTotal ?? 0}
            sublabel="active items"
          />
        } />
        <KPILink href="/stats/health" tile={
          <StatTile label="Health" value={summary ? healthLabel(summary) : "—"} sublabel="composite" />
        } />
      </section>

      <section className="rounded-2xl glass-surface p-5 mb-6">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            30-day combined trend
          </h3>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            normalized · hover for actuals
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

      <section className="rounded-2xl glass-surface p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          WIP by status
        </h3>
        {!summary ? (
          <p className="text-sm text-slate-400">—</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {([
              ItemStatus.New,
              ItemStatus.OnDeck,
              ItemStatus.Wip,
              ItemStatus.Packaging,
              ItemStatus.At_The_Door,
            ] as const).map((status) => (
              <div
                key={status}
                className="rounded-xl px-3 py-3 bg-white/5 border border-white/10"
              >
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {status}
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums leading-none text-white">
                  {summary.wipByStatus[status] ?? 0}
                </div>
              </div>
            ))}
          </div>
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
                const points = seg
                  .map(
                    ({ i, v }) =>
                      `${toX(i).toFixed(1)},${toY(sIdx, v).toFixed(1)}`
                  )
                  .join(" ");
                return (
                  <polyline
                    key={segIdx}
                    points={points}
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

      {hoverIndex !== null && dates[hoverIndex] && (
        <div
          className="pointer-events-none absolute glass-surface px-3 py-2 rounded-lg text-xs shadow-lg"
          style={{
            left: Math.min(
              Math.max(toX(hoverIndex) - 70, 0),
              Math.max(width - 160, 0)
            ),
            top: 0,
          }}
        >
          <div className="text-[10px] uppercase tracking-wider text-slate-400">
            {new Date(`${dates[hoverIndex]}T12:00:00`).toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric", year: "numeric" }
            )}
          </div>
          <div className="mt-1 space-y-0.5">
            {series.map((s) => {
              const v = s.values[hoverIndex!];
              return (
                <div
                  key={s.key}
                  className="flex items-center gap-2 tabular-nums"
                >
                  <span
                    className="inline-block w-2 h-2 rounded-sm"
                    style={{ background: s.color }}
                  />
                  <span className="text-slate-300">{s.label}</span>
                  <span className="font-semibold text-white ml-auto">
                    {v === null || v === undefined ? "—" : s.format(v)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-300">
        {series.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="font-medium text-white">{s.label}</span>
            <span className={cn("text-slate-400 tabular-nums")}>
              {legendValues[i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
