"use client";

import { useMemo } from "react";

import { ItemStatus } from "@/typings/types";
import { STATUS_COLORS } from "@/typings/constants";
import { laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import { computeLeadTimeStats } from "@/lib/production-metrics";
import { StatTile, useAllItems } from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const FALLBACK_LEAD_DAYS = 14;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function ForecastPage() {
  const { items, loading, error } = useAllItems();

  const data = useMemo(() => {
    if (!items) return null;
    const stats = computeLeadTimeStats(items);
    const designAvg = new Map<string, number>();
    for (const r of stats.byDesign) designAvg.set(r.key, r.avgDays);
    const sizeAvg = new Map<string, number>();
    for (const r of stats.bySize) sizeAvg.set(r.key, r.avgDays);
    const overall = stats.avgDays || FALLBACK_LEAD_DAYS;

    const today = laDayKey();
    const active = items.filter(
      (i) => i.status !== ItemStatus.Done && i.status !== ItemStatus.Hidden
    );

    const rows = active
      .map((item) => {
        const designLead = item.design ? designAvg.get(item.design) : undefined;
        const sizeLead = item.size ? sizeAvg.get(item.size) : undefined;
        const baseAvg = designLead ?? sizeLead ?? overall;
        const ageDays = (Date.now() - item.createdAt) / MS_PER_DAY;
        const remainingDays = Math.max(1, baseAvg - ageDays);
        const projectedDate = shiftDayKey(today, Math.ceil(remainingDays));
        return {
          item,
          remainingDays,
          projectedDate,
        };
      })
      .sort((a, b) => a.remainingDays - b.remainingDays);

    // Group by week count
    const within7 = rows.filter((r) => r.remainingDays <= 7).length;
    const within14 = rows.filter((r) => r.remainingDays <= 14).length;
    const within30 = rows.filter((r) => r.remainingDays <= 30).length;
    return { rows, within7, within14, within30, overallLead: overall };
  }, [items]);

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Forecast
        </p>
        <h2 className="mt-1 text-3xl font-bold text-white">
          {data ? `${data.rows.length} active items` : "—"}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Projected completion = avg lead time for that design/size − age so far
        </p>
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatTile label="Within 7 days" value={data?.within7 ?? 0} tone="good" />
        <StatTile label="Within 14 days" value={data?.within14 ?? 0} />
        <StatTile label="Within 30 days" value={data?.within30 ?? 0} />
        <StatTile
          label="Avg lead"
          value={data ? data.overallLead.toFixed(1) : "—"}
          sublabel="days"
        />
      </section>

      <section className="rounded-2xl glass-surface p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Projected completions
        </h3>
        {!data || data.rows.length === 0 ? (
          <p className="text-sm text-slate-400">No active items.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Design</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Projected date</th>
                  <th className="px-3 py-2 font-medium text-right">Days out</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map(({ item, remainingDays, projectedDate }) => {
                  const color = STATUS_COLORS[item.status];
                  return (
                    <tr
                      key={item.id}
                      className="border-t border-white/5 hover:bg-white/5 transition"
                    >
                      <td className="px-3 py-2 font-medium">
                        {item.customerName || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {item.design ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide bg-white/5",
                            `text-${color}`
                          )}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-white">
                        {projectedDate}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                        {remainingDays.toFixed(1)}
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
