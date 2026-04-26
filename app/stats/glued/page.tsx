"use client";

import { useMemo, useState } from "react";

import { laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import {
  bucketGluedSquaresByDay,
  buildGluedEvents,
  DayBucket,
  GluedEvent,
} from "@/lib/production-metrics";
import {
  ChartPoint,
  DEFAULT_RANGE,
  RANGE_OPTIONS,
  RangeKey,
  RangeSelector,
  StatTile,
  TimeSeriesChart,
  useActivities,
  useAllItems,
} from "@/lib/stats-shared";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const GLUED_COLOR = "rgb(56 189 248)";
const TIMELINE_INITIAL_DAYS = 14;
const VELOCITY_WINDOW_DAYS = 7;

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
  const { items, loading: itemsLoading, error: itemsError } = useAllItems();
  const { activities, loading: actLoading, error: actError } = useActivities();
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);
  const [showAllDays, setShowAllDays] = useState(false);

  const days = RANGE_OPTIONS.find((r) => r.key === range)?.days ?? 30;
  const rangeLabel = RANGE_OPTIONS.find((r) => r.key === range)?.label ?? "";

  const data = useMemo(() => {
    if (!items || !activities) return null;
    const today = laDayKey();
    const start = shiftDayKey(today, -(days - 1));
    const allEvents = buildGluedEvents(activities, items);
    const events = allEvents.filter(
      (e) => e.dayKey >= start && e.dayKey <= today
    );
    const buckets = bucketGluedSquaresByDay(events, start, today);
    return { events, buckets };
  }, [items, activities, days]);

  const stats = useMemo(
    () => (data ? summarizeWorkingDays(data.buckets) : null),
    [data]
  );

  const chartSeries = useMemo<ChartPoint[]>(
    () => data?.buckets.map((b) => ({ date: b.date, value: b.value })) ?? [],
    [data]
  );

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

  const loading = itemsLoading || actLoading;
  const error = itemsError || actError;

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
        <RangeSelector value={range} onChange={setRange} />
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="rounded-2xl glass-surface p-5 mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Daily squares · {rangeLabel}
          </h2>
        </div>
        <TimeSeriesChart
          series={chartSeries}
          color={GLUED_COLOR}
          gradientId="glued-area"
          emptyLabel="No glued events in this range yet."
          showWeekBoundaries={range === "30d" || range === "90d"}
        />
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatTile
          label="Peak day"
          value={stats?.peak.toLocaleString() ?? "—"}
          sublabel="best single day"
        />
        <StatTile
          label="Avg / working day"
          value={stats ? stats.average.toFixed(1) : "—"}
          sublabel={`median ${stats?.median.toFixed(0) ?? 0} · ${stats?.daysWithValue ?? 0} day${stats?.daysWithValue === 1 ? "" : "s"}`}
        />
        <StatTile
          label="7-day velocity"
          value={
            stats
              ? `${velocityDelta > 0 ? "+" : velocityDelta < 0 ? "−" : ""}${Math.abs(velocityDelta).toFixed(1)}`
              : "—"
          }
          sublabel="vs prior 7d / working day"
          tone={velocityTone}
        />
      </section>

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
