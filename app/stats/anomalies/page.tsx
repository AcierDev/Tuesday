"use client";

import { useMemo, useState } from "react";

import { laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import { bucketCompletionsByDay } from "@/lib/production-metrics";
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
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const SIGMA_THRESHOLD = 2;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function AnomaliesPage() {
  const { items, loading, error } = useAllItems();
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);

  const days = RANGE_OPTIONS.find((r) => r.key === range)?.days ?? 30;

  const data = useMemo(() => {
    if (!items) return null;
    const today = laDayKey();
    const start = shiftDayKey(today, -(days - 1));
    const buckets = bucketCompletionsByDay(items, start, today);
    if (buckets.length === 0)
      return { buckets, mean: 0, stddev: 0, anomalies: [] };
    const values = buckets.map((b) => b.value);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance =
      values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const stddev = Math.sqrt(variance);
    const anomalies = buckets
      .map((b) => ({ ...b, z: stddev > 0 ? (b.value - mean) / stddev : 0 }))
      .filter((b) => Math.abs(b.z) >= SIGMA_THRESHOLD)
      .sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
    return { buckets, mean, stddev, anomalies };
  }, [items, days]);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Anomalies
          </p>
          <h2 className="mt-1 text-3xl font-bold text-white">
            {data?.anomalies.length ?? 0} unusual day
            {data?.anomalies.length === 1 ? "" : "s"}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            ≥{SIGMA_THRESHOLD}σ from mean throughput
          </p>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatTile
          label="Mean / day"
          value={data ? `${data.mean.toFixed(1)} items` : "—"}
        />
        <StatTile
          label="Std dev"
          value={data ? `${data.stddev.toFixed(1)} items` : "—"}
        />
        <StatTile
          label="Anomaly threshold"
          value={data ? `±${(SIGMA_THRESHOLD * data.stddev).toFixed(1)} items` : "—"}
          sublabel="from mean"
        />
      </section>

      <section className="rounded-2xl glass-surface p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Outlier days
        </h3>
        {!data || data.anomalies.length === 0 ? (
          <p className="text-sm text-slate-400">No anomalies in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium text-right">Items</th>
                  <th className="px-3 py-2 font-medium text-right">σ from mean</th>
                </tr>
              </thead>
              <tbody>
                {data.anomalies.map((a) => (
                  <tr
                    key={a.date}
                    className="border-t border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="px-3 py-2 text-slate-400">
                      {new Date(`${a.date}T12:00:00`).toLocaleDateString(
                        "en-US",
                        { weekday: "short", month: "short", day: "numeric" }
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-white">
                      {a.value}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right tabular-nums font-semibold",
                        a.z > 0 ? "text-emerald-500" : "text-red-500"
                      )}
                    >
                      {a.z > 0 ? "+" : ""}
                      {a.z.toFixed(2)}σ
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
