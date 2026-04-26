"use client";

import { useMemo } from "react";

import { ItemStatus } from "@/typings/types";
import { STATUS_COLORS } from "@/typings/constants";
import { computeStatusDurations } from "@/lib/production-metrics";
import { useActivities, useAllItems } from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function BottlenecksPage() {
  const { items, loading: il, error: ie } = useAllItems();
  const { activities, loading: al, error: ae } = useActivities();

  const rows = useMemo(() => {
    if (!items || !activities) return null;
    return computeStatusDurations(items, activities).filter(
      (r) => r.status !== ItemStatus.Hidden
    );
  }, [items, activities]);

  const maxAvg = useMemo(
    () => (rows ? Math.max(0, ...rows.map((r) => r.avgDays)) : 0),
    [rows]
  );

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Bottlenecks
        </p>
        <h2 className="mt-1 text-3xl font-bold text-white">
          {rows && rows.length > 0
            ? `${rows[0]!.status} avg ${rows[0]!.avgDays.toFixed(1)}d`
            : "—"}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Avg time spent in each status — slowest first
        </p>
      </header>

      {(il || al || ie || ae) && (
        <p className="text-xs text-slate-400 mb-4">
          {il || al ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="rounded-2xl glass-surface p-5">
        {!rows || rows.length === 0 ? (
          <p className="text-sm text-slate-400">No status history yet.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const color = STATUS_COLORS[r.status];
              const pct = maxAvg ? (r.avgDays / maxAvg) * 100 : 0;
              return (
                <div key={r.status}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span
                      className={cn(
                        "text-sm font-semibold uppercase tracking-wide",
                        `text-${color}`
                      )}
                    >
                      {r.status}
                    </span>
                    <span className="text-xs text-slate-400 tabular-nums">
                      avg {r.avgDays.toFixed(1)}d · median {r.medianDays.toFixed(1)}d · {r.count} segments
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", `bg-${color}`)}
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
