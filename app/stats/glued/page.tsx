"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  DayBucket,
  GluedEvent,
  RECENCY_WEIGHTED_FORECAST,
  RecencyWeightedStats,
  summarizeRecencyWeighted,
} from "@/lib/production-metrics";
import {
  RANGE_OPTIONS,
  RangeSelector,
  StatTile,
  smoothPath,
  useGluedStats,
} from "@/lib/stats-shared";

const GLUED_RANGE_OPTIONS = [
  { key: "7d", label: "7 days", days: 7 },
  ...RANGE_OPTIONS,
] as const;
type GluedRangeKey = (typeof GLUED_RANGE_OPTIONS)[number]["key"];
const GLUED_DEFAULT_RANGE: GluedRangeKey = "30d";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const TOTAL_COLOR = "rgb(56 189 248)"; // sky-400 — bars
const AVG_COLOR = "rgb(251 191 36)"; // amber-400 — overlay line
const TIMELINE_INITIAL_DAYS = 14;
const VELOCITY_WINDOW_DAYS = 7;

const CHART_HEIGHT = 280;
const CHART_PADDING_X_LEFT = 48;
const CHART_PADDING_X_RIGHT = 48;
const CHART_PADDING_TOP = 16;
const CHART_PADDING_BOTTOM = 28;
const BAR_INSET_RATIO = 0.18;
const Y_AXIS_TICK_TARGET = 6;
const HOVER_TOOLTIP_WIDTH = 180;
const HOVER_TOOLTIP_HEIGHT_OFFSET = 72;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📐 WORKING-DAY STATS                                                 ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Like summarizeDayBuckets, but averages and median exclude zero-value days
// since the shop doesn't operate every day of the week.
type WorkingDayStats = {
  total: number;
  peak: number;
  average: number;
  median: number;
  recentAverage: number;
  priorAverage: number;
  daysWithValue: number;
};

function summarizeWorkingDays(buckets: DayBucket[]): WorkingDayStats {
  if (buckets.length === 0) {
    return {
      total: 0, peak: 0, average: 0, median: 0,
      recentAverage: 0, priorAverage: 0, daysWithValue: 0,
    };
  }
  const values = buckets.map((b) => b.value);
  const total = values.reduce((s, v) => s + v, 0);
  const peak = Math.max(...values);

  const active = values.filter((v) => v > 0);
  const sorted = [...active].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length === 0
    ? 0
    : sorted.length % 2 === 0
      ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
      : sorted[mid] ?? 0;
  const average = active.length ? total / active.length : 0;

  const windowAverage = (slice: number[]) => {
    const a = slice.filter((v) => v > 0);
    return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
  };
  const recentAverage = windowAverage(values.slice(-VELOCITY_WINDOW_DAYS));
  const priorSlice = values.slice(
    -VELOCITY_WINDOW_DAYS * 2,
    -VELOCITY_WINDOW_DAYS
  );
  const priorAverage = priorSlice.length
    ? windowAverage(priorSlice)
    : recentAverage;

  return {
    total, peak, average, median,
    recentAverage, priorAverage,
    daysWithValue: active.length,
  };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function GluedPage() {
  const [range, setRange] = useState<GluedRangeKey>(GLUED_DEFAULT_RANGE);
  const [showAllDays, setShowAllDays] = useState(false);

  const days = GLUED_RANGE_OPTIONS.find((r) => r.key === range)?.days ?? 30;
  const rangeLabel =
    GLUED_RANGE_OPTIONS.find((r) => r.key === range)?.label ?? "";

  const { data, loading, error } = useGluedStats(days);

  const stats = useMemo(
    () => (data ? summarizeWorkingDays(data.buckets) : null),
    [data]
  );

  // Forecast is always anchored to the last 30 days regardless of the chart's
  // range selector — the planner badge sources this same number, so keeping
  // the window fixed means the page's breakdown matches what the badge shows.
  const forecast = useMemo(() => {
    if (!data) return null;
    const recentBuckets = data.buckets.slice(
      -RECENCY_WEIGHTED_FORECAST.lookbackDays
    );
    if (recentBuckets.length === 0) return null;
    return summarizeRecencyWeighted(recentBuckets, RECENCY_WEIGHTED_FORECAST);
  }, [data]);

  const dayBuckets = useMemo<DayBucket[]>(
    () => data?.buckets ?? [],
    [data]
  );

  const weekBuckets = useMemo<WeekBucket[]>(
    () => (data ? bucketToWeeks(data.buckets) : []),
    [data]
  );

  const isDailyView = range === "7d";

  // Group events by day for the timeline
  const eventsByDay = useMemo(() => {
    if (!data) return [] as { date: string; events: GluedEvent[]; squares: number }[];
    const map = new Map<string, GluedEvent[]>();
    for (const e of data.events) {
      const list = map.get(e.dayKey) ?? [];
      list.push(e);
      map.set(e.dayKey, list);
    }
    const groups = Array.from(map.entries()).map(([date, events]) => ({
      date,
      events,
      squares: events.reduce((s, e) => s + e.squares, 0),
    }));
    groups.sort((a, b) => (a.date < b.date ? 1 : -1));
    return groups;
  }, [data]);

  const visibleGroups = showAllDays
    ? eventsByDay
    : eventsByDay.slice(0, TIMELINE_INITIAL_DAYS);

  const orderCount = data?.events.length ?? 0;
  const velocityDelta = stats ? stats.recentAverage - stats.priorAverage : 0;
  const velocityTone: "good" | "bad" | "neutral" =
    velocityDelta > 5 ? "good" : velocityDelta < -5 ? "bad" : "neutral";

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Squares glued · {rangeLabel}
          </p>
          <div className="mt-1 text-6xl font-bold tabular-nums leading-none text-sky-400">
            {stats ? stats.total.toLocaleString() : "—"}
            <span className="text-2xl font-medium ml-2 text-slate-400">
              square{stats?.total === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {orderCount} order{orderCount === 1 ? "" : "s"} · across{" "}
            {stats?.daysWithValue ?? 0} active day
            {stats?.daysWithValue === 1 ? "" : "s"}
          </p>
        </div>
        <RangeSelector
          value={range}
          onChange={(next) => setRange(next as GluedRangeKey)}
          options={GLUED_RANGE_OPTIONS}
        />
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="rounded-2xl glass-surface p-5 mb-6">
        <div className="flex items-baseline justify-between mb-3 gap-4 flex-wrap">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            {isDailyView ? "Daily" : "Weekly"} squares · {rangeLabel}
          </h2>
          {!isDailyView && (
            <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ background: TOTAL_COLOR, opacity: 0.6 }}
                />
                Total / week
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-[2px] rounded"
                  style={{ background: AVG_COLOR }}
                />
                Avg / active day
              </span>
            </div>
          )}
        </div>
        {isDailyView ? (
          <DailyChart days={dayBuckets} />
        ) : (
          <WeeklyDualChart weeks={weekBuckets} />
        )}
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatTile
          label="Peak day"
          value={stats ? `${stats.peak.toLocaleString()} sq` : "—"}
          sublabel="best single day"
        />
        <StatTile
          label="Avg / working day"
          value={stats ? `${stats.average.toFixed(1)} sq` : "—"}
          sublabel={`median ${stats?.median.toFixed(0) ?? 0} sq · ${stats?.daysWithValue ?? 0} day${stats?.daysWithValue === 1 ? "" : "s"}`}
        />
        <StatTile
          label="7-day velocity"
          value={
            stats
              ? `${velocityDelta > 0 ? "+" : velocityDelta < 0 ? "−" : ""}${Math.abs(velocityDelta).toFixed(1)} sq`
              : "—"
          }
          sublabel="vs prior 7d / working day"
          tone={velocityTone}
        />
      </section>

      {forecast && (
        <ForecastBreakdown stats={forecast} />
      )}

      <section className="rounded-2xl glass-surface p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Timeline
          </h2>
          <span className="text-xs text-slate-400">
            {orderCount} order{orderCount === 1 ? "" : "s"} ·{" "}
            {eventsByDay.length} day{eventsByDay.length === 1 ? "" : "s"}
          </span>
        </div>

        {!data ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : eventsByDay.length === 0 ? (
          <p className="text-sm text-slate-400">
            No orders glued in this range.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {visibleGroups.map((g) => (
              <DayGroup key={g.date} date={g.date} events={g.events} squares={g.squares} />
            ))}
            {eventsByDay.length > visibleGroups.length && (
              <button
                type="button"
                onClick={() => setShowAllDays(true)}
                className="self-center px-4 py-2 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition"
              >
                Show {eventsByDay.length - visibleGroups.length} more day
                {eventsByDay.length - visibleGroups.length === 1 ? "" : "s"}
              </button>
            )}
          </div>
        )}

        <p className="mt-5 text-[11px] text-slate-500">
          An order counts only if its current status is{" "}
          <span className="text-slate-400">Packaging / At The Door / Done</span>
          . If it bounced back to Wip it stops counting until the next forward
          move. The day shown is the most recent move from{" "}
          <span className="text-slate-400">New / On Deck / Wip</span> into a
          glued status. Only orders with simple{" "}
          <span className="text-slate-400">W × H</span> sizes contribute;
          named/custom sizes are excluded.
        </p>
      </section>
    </>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📊 DAILY CHART                                                       ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDayLabel(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  if (!y || !m || !d) return dateIso;
  return `${MONTH_NAMES_SHORT[m - 1]} ${d}`;
}

function formatDayTooltip(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  if (!y || !m || !d) return dateIso;
  const date = new Date(Date.UTC(y, m - 1, d));
  const wd = WEEKDAY_NAMES_SHORT[date.getUTCDay()];
  return `${wd}, ${MONTH_NAMES_FULL[m - 1]} ${d}`;
}

function DailyChart({ days }: { days: DayBucket[] }) {
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

  if (days.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-slate-400">
        No glued events in this range yet.
      </div>
    );
  }

  const innerWidth = Math.max(
    width - CHART_PADDING_X_LEFT - CHART_PADDING_X_RIGHT,
    1
  );
  const innerHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
  const slotWidth = innerWidth / days.length;

  const totals = days.map((d) => d.value);
  const totalRawMax = Math.max(...totals, 0);
  const totalRoundTo = niceRoundTo(totalRawMax);
  const totalYMax = Math.max(
    Math.ceil((totalRawMax + 1) / totalRoundTo) * totalRoundTo,
    totalRoundTo
  );

  const slotCenter = (i: number) =>
    CHART_PADDING_X_LEFT + (i + 0.5) * slotWidth;
  const totalToY = (v: number) =>
    CHART_PADDING_TOP + innerHeight - (v / totalYMax) * innerHeight;

  const barInset = slotWidth * BAR_INSET_RATIO;
  const barWidth = Math.max(slotWidth - barInset * 2, 1);

  const totalTickStep = totalRoundTo / 2;
  const totalTickCount = Math.min(
    Math.floor(totalYMax / totalTickStep),
    Y_AXIS_TICK_TARGET * 2
  );
  const totalTicks = Array.from({ length: totalTickCount + 1 }, (_, i) => ({
    value: i * totalTickStep,
    y: totalToY(i * totalTickStep),
  }));

  const targetXLabels = Math.min(8, days.length);
  const xLabelStep = Math.max(
    1,
    Math.floor((days.length - 1) / Math.max(targetXLabels - 1, 1))
  );
  const xLabels = days
    .map((d, i) => ({ ...d, i }))
    .filter(
      (_, i, arr) => i === 0 || i === arr.length - 1 || i % xLabelStep === 0
    );

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - CHART_PADDING_X_LEFT;
    const idx = Math.floor(x / slotWidth);
    if (idx < 0 || idx >= days.length) {
      setHoverIndex(null);
      return;
    }
    setHoverIndex(idx);
  };

  const hovered = hoverIndex !== null ? days[hoverIndex] : null;
  const hoveredX = hoverIndex !== null ? slotCenter(hoverIndex) : 0;
  const tooltipAnchorY = hovered ? totalToY(hovered.value) : 0;

  return (
    <div ref={wrapRef} className="w-full relative">
      <svg
        width={width}
        height={CHART_HEIGHT}
        className="overflow-visible"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {totalTicks.map((t) => (
          <g key={`tt-${t.value}`}>
            <line
              x1={CHART_PADDING_X_LEFT}
              x2={width - CHART_PADDING_X_RIGHT}
              y1={t.y}
              y2={t.y}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeDasharray="3 3"
            />
            <text
              x={CHART_PADDING_X_LEFT - 8}
              y={t.y + 4}
              textAnchor="end"
              className="fill-slate-400"
              fontSize="11"
            >
              {Math.round(t.value).toLocaleString()}
            </text>
          </g>
        ))}

        {days.map((d, i) => {
          const x = CHART_PADDING_X_LEFT + i * slotWidth + barInset;
          const y = totalToY(d.value);
          const h = CHART_PADDING_TOP + innerHeight - y;
          return (
            <rect
              key={d.date}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(h, 0)}
              rx={2}
              fill={TOTAL_COLOR}
              fillOpacity={hoverIndex === i ? 0.9 : 0.55}
            />
          );
        })}

        {xLabels.map((p) => (
          <text
            key={p.date}
            x={slotCenter(p.i)}
            y={CHART_HEIGHT - 8}
            textAnchor="middle"
            className="fill-slate-400"
            fontSize="11"
          >
            {formatDayLabel(p.date)}
          </text>
        ))}

        {hovered && (
          <g pointerEvents="none">
            <line
              x1={hoveredX}
              x2={hoveredX}
              y1={CHART_PADDING_TOP}
              y2={CHART_PADDING_TOP + innerHeight}
              stroke="currentColor"
              strokeOpacity="0.2"
              strokeDasharray="2 3"
            />
          </g>
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute glass-surface px-3 py-2 rounded-lg text-xs shadow-lg"
          style={{
            left: Math.min(
              Math.max(hoveredX - HOVER_TOOLTIP_WIDTH / 2, 0),
              Math.max(width - HOVER_TOOLTIP_WIDTH, 0)
            ),
            top: Math.max(tooltipAnchorY - HOVER_TOOLTIP_HEIGHT_OFFSET, 0),
            width: HOVER_TOOLTIP_WIDTH,
          }}
        >
          <div className="text-[10px] uppercase tracking-wider text-slate-400">
            {formatDayTooltip(hovered.date)}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className="text-base font-bold tabular-nums leading-tight"
              style={{ color: TOTAL_COLOR }}
            >
              {hovered.value.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">
              square{hovered.value === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function niceRoundTo(rawMax: number): number {
  if (rawMax <= 0) return 1;
  const target = rawMax / 5;
  const exp = Math.floor(Math.log10(target));
  const base = target / Math.pow(10, exp);
  const nice = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
  return nice * Math.pow(10, exp);
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📊 WEEKLY DUAL CHART                                                 ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

type WeekBucket = {
  weekStart: string; // YYYY-MM-DD (Monday, LA-local calendar)
  total: number;
  activeDays: number; // days with > 0 squares glued
  avgPerActiveDay: number;
};

// Group day buckets into Monday-start weeks. Empty days don't count toward
// the per-active-day average — a 4-day work week and a 6-day work week stay
// directly comparable on the overlay line.
function bucketToWeeks(buckets: DayBucket[]): WeekBucket[] {
  const map = new Map<string, { total: number; active: number }>();
  for (const b of buckets) {
    const [y, m, d] = b.date.split("-").map(Number);
    if (
      y === undefined ||
      m === undefined ||
      d === undefined ||
      Number.isNaN(y)
    )
      continue;
    const date = new Date(Date.UTC(y, m - 1, d));
    const dow = date.getUTCDay(); // 0=Sun..6=Sat
    const daysSinceMonday = (dow + 6) % 7;
    const monday = new Date(date);
    monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
    const weekKey = monday.toISOString().slice(0, 10);
    const entry = map.get(weekKey) ?? { total: 0, active: 0 };
    entry.total += b.value;
    if (b.value > 0) entry.active += 1;
    map.set(weekKey, entry);
  }
  const weeks: WeekBucket[] = [];
  for (const [weekStart, { total, active }] of map.entries()) {
    weeks.push({
      weekStart,
      total,
      activeDays: active,
      avgPerActiveDay: active > 0 ? total / active : 0,
    });
  }
  weeks.sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
  return weeks;
}

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

// Pick the month a Mon-Sun week "belongs to" by looking only at Mon-Thu —
// whichever month holds the majority of those four days wins, with a 2-2
// split broken in favor of Thursday's month. Then count how many such
// majority-this-month weeks precede this one (inclusive) within that month
// to get the ordinal.
function weekLabelInfo(weekStartIso: string): {
  ordinal: number;
  monthIndex: number;
  year: number;
} {
  const [y, m, d] = weekStartIso.split("-").map(Number);
  const monday = new Date(Date.UTC(y!, m! - 1, d!));

  const counts: Record<string, number> = {};
  let thursdayKey = "";
  for (let i = 0; i < 4; i++) {
    const day = new Date(monday);
    day.setUTCDate(day.getUTCDate() + i);
    const key = `${day.getUTCFullYear()}-${day.getUTCMonth()}`;
    counts[key] = (counts[key] ?? 0) + 1;
    if (i === 3) thursdayKey = key;
  }
  let bestKey = thursdayKey;
  let bestCount = counts[thursdayKey] ?? 0;
  for (const k in counts) {
    if ((counts[k] ?? 0) > bestCount) {
      bestCount = counts[k]!;
      bestKey = k;
    }
  }
  const [yStr, mStr] = bestKey.split("-");
  const monthYear = Number(yStr);
  const monthIndex = Number(mStr);

  const isMajorityFor = (mon: Date): boolean => {
    let inMonth = 0;
    let thuInMonth = false;
    for (let i = 0; i < 4; i++) {
      const day = new Date(mon);
      day.setUTCDate(day.getUTCDate() + i);
      const sameMonth =
        day.getUTCFullYear() === monthYear &&
        day.getUTCMonth() === monthIndex;
      if (sameMonth) inMonth += 1;
      if (i === 3 && sameMonth) thuInMonth = true;
    }
    if (inMonth > 2) return true;
    if (inMonth === 2) return thuInMonth; // tie → Thursday wins
    return false;
  };

  const firstOfMonth = new Date(Date.UTC(monthYear, monthIndex, 1));
  const dow = firstOfMonth.getUTCDay();
  const daysSinceMonday = (dow + 6) % 7;
  const candidate = new Date(firstOfMonth);
  candidate.setUTCDate(candidate.getUTCDate() - daysSinceMonday);
  if (!isMajorityFor(candidate)) {
    candidate.setUTCDate(candidate.getUTCDate() + 7);
  }
  const ordinal =
    Math.round(
      (monday.getTime() - candidate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    ) + 1;
  return { ordinal, monthIndex, year: monthYear };
}

function WeeklyDualChart({ weeks }: { weeks: WeekBucket[] }) {
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

  if (weeks.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-slate-400">
        No glued events in this range yet.
      </div>
    );
  }

  const innerWidth = Math.max(
    width - CHART_PADDING_X_LEFT - CHART_PADDING_X_RIGHT,
    1
  );
  const innerHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
  const slotWidth = innerWidth / weeks.length;

  const totals = weeks.map((w) => w.total);
  const avgs = weeks.map((w) => w.avgPerActiveDay);
  const totalRawMax = Math.max(...totals, 0);
  const avgRawMax = Math.max(...avgs, 0);
  const totalRoundTo = niceRoundTo(totalRawMax);
  const avgRoundTo = niceRoundTo(avgRawMax);
  const totalYMax = Math.max(
    Math.ceil((totalRawMax + 1) / totalRoundTo) * totalRoundTo,
    totalRoundTo
  );
  const avgYMax = Math.max(
    Math.ceil((avgRawMax + 1) / avgRoundTo) * avgRoundTo,
    avgRoundTo
  );

  const slotCenter = (i: number) =>
    CHART_PADDING_X_LEFT + (i + 0.5) * slotWidth;
  const totalToY = (v: number) =>
    CHART_PADDING_TOP + innerHeight - (v / totalYMax) * innerHeight;
  const avgToY = (v: number) =>
    CHART_PADDING_TOP + innerHeight - (v / avgYMax) * innerHeight;

  const barInset = slotWidth * BAR_INSET_RATIO;
  const barWidth = Math.max(slotWidth - barInset * 2, 2);

  const totalTickStep = totalRoundTo / 2;
  const totalTickCount = Math.min(
    Math.floor(totalYMax / totalTickStep),
    Y_AXIS_TICK_TARGET * 2
  );
  const totalTicks = Array.from({ length: totalTickCount + 1 }, (_, i) => ({
    value: i * totalTickStep,
    y: totalToY(i * totalTickStep),
  }));
  const avgTickStep = avgRoundTo / 2;
  const avgTickCount = Math.min(
    Math.floor(avgYMax / avgTickStep),
    Y_AXIS_TICK_TARGET * 2
  );
  const avgTicks = Array.from({ length: avgTickCount + 1 }, (_, i) => ({
    value: i * avgTickStep,
    y: avgToY(i * avgTickStep),
  }));

  const targetXLabels = Math.min(8, weeks.length);
  const xLabelStep = Math.max(
    1,
    Math.floor((weeks.length - 1) / Math.max(targetXLabels - 1, 1))
  );
  const xLabels = weeks
    .map((w, i) => ({ ...w, i }))
    .filter(
      (_, i, arr) => i === 0 || i === arr.length - 1 || i % xLabelStep === 0
    );

  // Build the avg line only over weeks that actually had glued days.
  const linePts = weeks
    .map((w, i) => ({
      x: slotCenter(i),
      y: avgToY(w.avgPerActiveDay),
      v: w.avgPerActiveDay,
      i,
    }))
    .filter((p) => p.v > 0);

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - CHART_PADDING_X_LEFT;
    const idx = Math.floor(x / slotWidth);
    if (idx < 0 || idx >= weeks.length) {
      setHoverIndex(null);
      return;
    }
    setHoverIndex(idx);
  };

  const hovered = hoverIndex !== null ? weeks[hoverIndex] : null;
  const hoveredX = hoverIndex !== null ? slotCenter(hoverIndex) : 0;
  const hoveredAvgY =
    hovered && hovered.avgPerActiveDay > 0 ? avgToY(hovered.avgPerActiveDay) : 0;
  const tooltipAnchorY = hovered
    ? hovered.avgPerActiveDay > 0
      ? hoveredAvgY
      : totalToY(hovered.total)
    : 0;

  const formatAxisLabel = (weekStart: string) => {
    const { ordinal, monthIndex } = weekLabelInfo(weekStart);
    return `${MONTH_NAMES_SHORT[monthIndex]} W${ordinal}`;
  };
  const formatTooltipLabel = (weekStart: string) => {
    const { ordinal, monthIndex } = weekLabelInfo(weekStart);
    return `${ordinal}${ordinalSuffix(ordinal)} week of ${MONTH_NAMES_FULL[monthIndex]}`;
  };

  return (
    <div ref={wrapRef} className="w-full relative">
      <svg
        width={width}
        height={CHART_HEIGHT}
        className="overflow-visible"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {totalTicks.map((t) => (
          <g key={`tt-${t.value}`}>
            <line
              x1={CHART_PADDING_X_LEFT}
              x2={width - CHART_PADDING_X_RIGHT}
              y1={t.y}
              y2={t.y}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeDasharray="3 3"
            />
            <text
              x={CHART_PADDING_X_LEFT - 8}
              y={t.y + 4}
              textAnchor="end"
              className="fill-slate-400"
              fontSize="11"
            >
              {Math.round(t.value).toLocaleString()}
            </text>
          </g>
        ))}

        {avgTicks.map((t) => (
          <text
            key={`at-${t.value}`}
            x={width - CHART_PADDING_X_RIGHT + 8}
            y={t.y + 4}
            textAnchor="start"
            fontSize="11"
            fill={AVG_COLOR}
            opacity="0.75"
          >
            {Math.round(t.value).toLocaleString()}
          </text>
        ))}

        {weeks.map((w, i) => {
          const x = CHART_PADDING_X_LEFT + i * slotWidth + barInset;
          const y = totalToY(w.total);
          const h = CHART_PADDING_TOP + innerHeight - y;
          return (
            <rect
              key={w.weekStart}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(h, 0)}
              rx={3}
              fill={TOTAL_COLOR}
              fillOpacity={hoverIndex === i ? 0.9 : 0.55}
            />
          );
        })}

        {linePts.length >= 2 && (
          <path
            d={smoothPath(linePts.map(({ x, y }) => ({ x, y })))}
            fill="none"
            stroke={AVG_COLOR}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {linePts.map((p) => (
          <circle
            key={`avg-${p.i}`}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={AVG_COLOR}
            stroke="white"
            strokeOpacity="0.9"
            strokeWidth={1}
          />
        ))}

        {xLabels.map((p) => (
          <text
            key={p.weekStart}
            x={slotCenter(p.i)}
            y={CHART_HEIGHT - 8}
            textAnchor="middle"
            className="fill-slate-400"
            fontSize="11"
          >
            {formatAxisLabel(p.weekStart)}
          </text>
        ))}

        {hovered && (
          <g pointerEvents="none">
            <line
              x1={hoveredX}
              x2={hoveredX}
              y1={CHART_PADDING_TOP}
              y2={CHART_PADDING_TOP + innerHeight}
              stroke="currentColor"
              strokeOpacity="0.2"
              strokeDasharray="2 3"
            />
            {hovered.avgPerActiveDay > 0 && (
              <circle
                cx={hoveredX}
                cy={hoveredAvgY}
                r={5}
                fill={AVG_COLOR}
                stroke="white"
                strokeOpacity="0.9"
                strokeWidth={1.5}
              />
            )}
          </g>
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute glass-surface px-3 py-2 rounded-lg text-xs shadow-lg"
          style={{
            left: Math.min(
              Math.max(hoveredX - HOVER_TOOLTIP_WIDTH / 2, 0),
              Math.max(width - HOVER_TOOLTIP_WIDTH, 0)
            ),
            top: Math.max(tooltipAnchorY - HOVER_TOOLTIP_HEIGHT_OFFSET, 0),
            width: HOVER_TOOLTIP_WIDTH,
          }}
        >
          <div className="text-[10px] uppercase tracking-wider text-slate-400">
            {formatTooltipLabel(hovered.weekStart)}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className="text-base font-bold tabular-nums leading-tight"
              style={{ color: TOTAL_COLOR }}
            >
              {hovered.total.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">sq total</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-sm font-semibold tabular-nums leading-tight"
              style={{ color: AVG_COLOR }}
            >
              {hovered.avgPerActiveDay.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-400">
              sq/day · {hovered.activeDays} active day
              {hovered.activeDays === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🔮 FORECAST BREAKDOWN                                                ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function ForecastBreakdown({ stats }: { stats: RecencyWeightedStats }) {
  const totalWindow = stats.recentWindowDays + stats.olderWindowDays;
  const denominator =
    (stats.recentActiveDays > 0 ? stats.recentWeight : 0) +
    (stats.olderActiveDays > 0 ? stats.olderWeight : 0);
  return (
    <section id="forecast" className="rounded-2xl glass-surface p-5 mb-6">
      <div className="flex items-baseline justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Recency-weighted forecast
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Per-active-day average from the last {totalWindow} days, with the
            most recent {stats.recentWindowDays} days counted{" "}
            {stats.recentWeight}× to track current capacity.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-emerald-400/80">
            Forecast
          </div>
          <div className="text-3xl font-bold tabular-nums leading-none text-emerald-400">
            {Math.round(stats.weightedAvgActive).toLocaleString()}
            <span className="text-sm font-medium ml-1.5 text-slate-400">
              sq/day
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ForecastSliceTile
          label={`Prior ${stats.olderWindowDays}d`}
          weightLabel={`weight ${stats.olderWeight}×`}
          avgActive={stats.olderAvgActive}
          total={stats.olderTotal}
          activeDays={stats.olderActiveDays}
        />
        <ForecastSliceTile
          label={`Recent ${stats.recentWindowDays}d`}
          weightLabel={`weight ${stats.recentWeight}×`}
          avgActive={stats.recentAvgActive}
          total={stats.recentTotal}
          activeDays={stats.recentActiveDays}
          highlight
        />
        <div className="rounded-xl bg-emerald-500/5 ring-1 ring-inset ring-emerald-400/20 px-4 py-3 flex flex-col justify-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">
            Calculation
          </div>
          <div className="mt-1 text-xs text-slate-300 leading-relaxed">
            <span className="text-emerald-300 font-semibold tabular-nums">
              {Math.round(stats.recentAvgActive)}
            </span>
            <span className="text-slate-400"> × {stats.recentWeight} + </span>
            <span className="text-emerald-300 font-semibold tabular-nums">
              {Math.round(stats.olderAvgActive)}
            </span>
            <span className="text-slate-400"> × {stats.olderWeight}</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            <span className="text-slate-500">÷ </span>
            <span className="tabular-nums">{denominator || 1}</span>
            <span className="text-slate-500"> = </span>
            <span className="text-emerald-400 font-semibold tabular-nums">
              {Math.round(stats.weightedAvgActive)}
            </span>
            <span className="text-slate-500"> sq/day</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ForecastSliceTile({
  label,
  weightLabel,
  avgActive,
  total,
  activeDays,
  highlight,
}: {
  label: string;
  weightLabel: string;
  avgActive: number;
  total: number;
  activeDays: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl px-4 py-3 ring-1 ring-inset " +
        (highlight
          ? "bg-emerald-500/5 ring-emerald-400/20"
          : "bg-white/5 ring-white/10")
      }
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500">
          {weightLabel}
        </div>
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums leading-none text-white">
        {activeDays > 0 ? Math.round(avgActive).toLocaleString() : "—"}
        <span className="text-xs font-medium ml-1.5 text-slate-400">
          sq/day
        </span>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
        {total.toLocaleString()} sq · {activeDays} active day
        {activeDays === 1 ? "" : "s"}
      </div>
    </div>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📅 DAY GROUP                                                         ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function DayGroup({
  date,
  events,
  squares,
}: {
  date: string;
  events: GluedEvent[];
  squares: number;
}) {
  const formatted = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-white/5 pb-2 mb-2">
        <div className="text-sm font-semibold text-white">{formatted}</div>
        <div className="text-xs tabular-nums text-slate-400">
          <span className="font-semibold text-sky-400">
            {squares.toLocaleString()}
          </span>{" "}
          square{squares === 1 ? "" : "s"} · {events.length} order
          {events.length === 1 ? "" : "s"}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-1.5 font-medium">Time</th>
              <th className="px-3 py-1.5 font-medium">Customer</th>
              <th className="px-3 py-1.5 font-medium">Design</th>
              <th className="px-3 py-1.5 font-medium">Size</th>
              <th className="px-3 py-1.5 font-medium text-right">Squares</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr
                key={e.itemId}
                className="border-t border-white/5 hover:bg-white/5 transition"
              >
                <td className="px-3 py-1.5 tabular-nums text-slate-400">
                  {new Date(e.timestamp).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "America/Los_Angeles",
                  })}
                </td>
                <td className="px-3 py-1.5 font-medium text-white">
                  {e.customerName}
                </td>
                <td className="px-3 py-1.5 text-slate-300">{e.design}</td>
                <td className="px-3 py-1.5 tabular-nums text-slate-300">
                  {e.size}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-sky-400">
                  {e.squares.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
