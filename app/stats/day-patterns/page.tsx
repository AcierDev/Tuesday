"use client";

import { useMemo, useState } from "react";

import { laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import { bucketByDayOfWeek } from "@/lib/production-metrics";
import {
  DEFAULT_RANGE,
  RANGE_OPTIONS,
  RangeKey,
  RangeSelector,
  StatTile,
  useAllItems,
} from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function DayPatternsPage() {
  const { items, loading, error } = useAllItems();
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);

  const days = RANGE_OPTIONS.find((r) => r.key === range)?.days ?? 90;
  const rangeLabel = RANGE_OPTIONS.find((r) => r.key === range)?.label ?? "";

  const rows = useMemo(() => {
    if (!items) return null;
    const today = laDayKey();
    const start = shiftDayKey(today, -(days - 1));
    return bucketByDayOfWeek(items, start, today);
  }, [items, days]);

  const maxAvg = useMemo(
    () => (rows ? Math.max(0, ...rows.map((r) => r.avg)) : 0),
    [rows]
  );

  const top = useMemo(
    () => (rows ? [...rows].sort((a, b) => b.avg - a.avg)[0] : null),
    [rows]
  );
  const bottom = useMemo(
    () => (rows ? [...rows].sort((a, b) => a.avg - b.avg)[0] : null),
    [rows]
  );

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Day-of-week patterns · {rangeLabel}
          </p>
          <h2 className="mt-1 heading-page">
            {top ? `${top.day} is your best day` : "—"}
          </h2>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="Best day"
          value={top?.day ?? "—"}
          sublabel={top ? `${top.avg.toFixed(1)} items / day` : undefined}
          tone="good"
        />
        <StatTile
          label="Slowest day"
          value={bottom?.day ?? "—"}
          sublabel={
            bottom ? `${bottom.avg.toFixed(1)} items / day` : undefined
          }
          tone="bad"
        />
        <StatTile
          label="Total"
          value={
            rows
              ? `${rows.reduce((s, r) => s + r.total, 0)} items`
              : "—"
          }
          sublabel="in range"
        />
        <StatTile
          label="Best:Worst"
          value={
            top && bottom && bottom.avg > 0
              ? `${(top.avg / bottom.avg).toFixed(1)}x`
              : "—"
          }
          sublabel="ratio"
        />
      </section>

      <section className="rounded-2xl glass-surface p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Avg completions per day-of-week
        </h3>
        {!rows ? (
          <p className="text-sm text-slate-400">—</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const pct = maxAvg ? (r.avg / maxAvg) * 100 : 0;
              return (
                <div key={r.day}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-semibold text-white">{r.day}</span>
                    <span className="text-xs text-slate-400 tabular-nums">
                      {r.avg.toFixed(1)} items / day · {r.total} total · {r.activeDays} {r.activeDays === 1 ? "occurrence" : "occurrences"}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        pct >= 80 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-slate-500"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
