"use client";

import type { DeliveryView } from "@/lib/server/stats-views/shipping";
import { StatTile, useStatsView } from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function DeliveryPage() {
  // Server-computed (lib/server/stats-views/shipping) from items + tracker
  // delivered scans: purchase → delivered transit times.
  const { data, loading, error } = useStatsView<DeliveryView>("delivery");

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Delivery speed
        </p>
        <h2 className="mt-1 heading-page">
          {data ? `${data.avg.toFixed(1)} days avg` : "—"}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Purchase → delivered, across {data?.count ?? 0} delivered shipments
        </p>
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="Avg transit"
          value={data ? `${data.avg.toFixed(1)} d` : "—"}
        />
        <StatTile
          label="Median"
          value={data ? `${data.median.toFixed(1)} d` : "—"}
        />
        <StatTile
          label="Fastest"
          value={data ? `${data.fastest.toFixed(1)} d` : "—"}
          tone="good"
        />
        <StatTile
          label="Slowest"
          value={data ? `${data.slowest.toFixed(1)} d` : "—"}
          tone="bad"
        />
      </section>

      <section className="rounded-2xl glass-surface p-5 mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          By service level
        </h3>
        {!data || data.byService.length === 0 ? (
          <p className="text-sm text-slate-400">No delivered shipments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2 font-medium">Service</th>
                  <th className="px-3 py-2 font-medium text-right">Count</th>
                  <th className="px-3 py-2 font-medium text-right">Avg days</th>
                </tr>
              </thead>
              <tbody>
                {data.byService.map((r) => (
                  <tr
                    key={r.service}
                    className="border-t border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="px-3 py-2 font-medium">{r.service}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                      {r.count}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      {r.avg.toFixed(1)}
                      <span className="ml-1 text-xs font-medium text-slate-400">
                        d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl glass-surface p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Recent shipments
        </h3>
        {!data || data.count === 0 ? (
          <p className="text-sm text-slate-400">—</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Service</th>
                  <th className="px-3 py-2 font-medium text-right">Purchased</th>
                  <th className="px-3 py-2 font-medium text-right">Transit days</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((r) => (
                  <tr
                    key={r.itemId}
                    className="border-t border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="px-3 py-2 font-medium">{r.customerName}</td>
                    <td className="px-3 py-2 text-slate-400">{r.serviceType ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                      {new Date(r.purchasedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right tabular-nums font-semibold",
                        r.transitDays <= 3
                          ? "text-emerald-500"
                          : r.transitDays > 7
                            ? "text-red-500"
                            : "text-white"
                      )}
                    >
                      {r.transitDays.toFixed(1)}
                      <span className="ml-1 text-xs font-medium text-slate-400">
                        d
                      </span>
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
