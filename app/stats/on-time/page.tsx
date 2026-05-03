"use client";

import { useMemo, useState } from "react";

import { ItemStatus } from "@/typings/types";
import { STATUS_COLORS } from "@/typings/constants";
import {
  bucketOnTimeByWeek,
  computeCurrentlyLate,
  computeOnTimeStats,
} from "@/lib/production-metrics";
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
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const ON_TIME_COLOR = "rgb(96 165 250)";

const STATUS_LABELS: Record<ItemStatus, string> = {
  [ItemStatus.New]: "New",
  [ItemStatus.OnDeck]: "On Deck",
  [ItemStatus.Wip]: "WIP",
  [ItemStatus.Packaging]: "Packaging",
  [ItemStatus.At_The_Door]: "At The Door",
  [ItemStatus.Done]: "Done",
  [ItemStatus.Hidden]: "Hidden",
};

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function OnTimePage() {
  const { items, loading, error } = useAllItems();
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);

  const { start, end, label: rangeLabel } = resolveRangeKey(range);

  const stats = useMemo(() => {
    if (!items) return null;
    return computeOnTimeStats(items, start, end);
  }, [items, start, end]);

  const weekly = useMemo(() => {
    if (!items) return [];
    return bucketOnTimeByWeek(items, start, end);
  }, [items, start, end]);

  const chartSeries = useMemo<ChartPoint[]>(
    () => weekly.map((b) => ({ date: b.date, value: b.value })),
    [weekly]
  );

  const lateNow = useMemo(() => {
    if (!items) return [];
    const activeOnly = items.filter(
      (i) => i.status !== ItemStatus.Done && i.status !== ItemStatus.Hidden
    );
    return computeCurrentlyLate(activeOnly);
  }, [items]);

  const onTimeTone: "good" | "bad" | "neutral" = stats
    ? stats.onTimePct >= 90
      ? "good"
      : stats.onTimePct < 70
        ? "bad"
        : "neutral"
    : "neutral";

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            On-time rate · {rangeLabel}
          </p>
          <div
            className={cn(
              "mt-1 text-6xl font-bold tabular-nums leading-none",
              onTimeTone === "good" && "text-emerald-500 dark:text-emerald-400",
              onTimeTone === "bad" && "text-red-500 dark:text-red-400"
            )}
          >
            {stats ? `${Math.round(stats.onTimePct)}%` : "—"}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {stats?.onTime ?? 0} on time of {stats?.total ?? 0} shipped
          </p>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </header>

      <section className="rounded-2xl glass-surface p-5 mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Weekly on-time % · {rangeLabel}
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
          color={ON_TIME_COLOR}
          gradientId="ontime-area"
          formatValue={(v) => `${Math.round(v)}%`}
          yAxisRoundTo={25}
          yMaxOverride={100}
          emptyLabel="No completion history yet."
        />
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="Total shipped"
          value={`${stats?.total ?? 0} items`}
          sublabel={rangeLabel}
        />
        <StatTile
          label="On time"
          value={`${stats?.onTime ?? 0} items`}
          sublabel="met due date"
          tone="good"
        />
        <StatTile
          label="Late"
          value={`${stats?.late ?? 0} items`}
          sublabel="missed due date"
          tone={(stats?.late ?? 0) > 0 ? "bad" : "neutral"}
        />
        <StatTile
          label="Avg days late"
          value={stats ? `${stats.avgDaysLate.toFixed(1)} d` : "—"}
          sublabel="when late"
          tone={(stats?.avgDaysLate ?? 0) > 0 ? "bad" : "neutral"}
        />
      </section>

      <section className="rounded-2xl glass-surface p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Currently late
          </h2>
          <span className="text-xs text-slate-400">
            {lateNow.length} item{lateNow.length === 1 ? "" : "s"}
          </span>
        </div>
        {lateNow.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nothing is past due. Nice work.
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
                    Days late
                  </th>
                </tr>
              </thead>
              <tbody>
                {lateNow.map(({ item, daysLate }) => {
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
                        −{daysLate}
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
