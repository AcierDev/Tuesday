"use client";

import { STATUS_COLORS } from "@/typings/constants";
import type { ForecastView } from "@/lib/server/stats-views/active";
import { StatTile, useStatsView } from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function ForecastPage() {
  // Server-computed (lib/server/stats-views/active): projected completion =
  // avg lead time for the design/size − age so far, per open order.
  const { data, loading, error } = useStatsView<ForecastView>("forecast");

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Forecast
        </p>
        <h2 className="mt-1 heading-page">
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
        <StatTile
          label="Within 7 days"
          value={`${data?.within7 ?? 0} items`}
          tone="good"
        />
        <StatTile
          label="Within 14 days"
          value={`${data?.within14 ?? 0} items`}
        />
        <StatTile
          label="Within 30 days"
          value={`${data?.within30 ?? 0} items`}
        />
        <StatTile
          label="Avg lead"
          value={data ? `${data.overallLead.toFixed(1)} d` : "—"}
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
                        {remainingDays.toFixed(1)} d
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
