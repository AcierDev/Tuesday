"use client";

import { useMemo } from "react";

import {
  buildDeliveryByOrder,
  computeDeliverySpeeds,
} from "@/lib/production-metrics";
import {
  StatTile,
  useAllItemsRich,
  useTrackingInfos,
} from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const RECENT_LIMIT = 30;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function DeliveryPage() {
  const { items, loading: il, error: ie } = useAllItemsRich();
  const { trackingInfos, loading: tl, error: te } = useTrackingInfos();

  const data = useMemo(() => {
    if (!items || !trackingInfos) return null;
    const deliveryByOrder = buildDeliveryByOrder(trackingInfos);
    const rows = computeDeliverySpeeds(items, deliveryByOrder);
    if (rows.length === 0) {
      return {
        rows: [],
        avg: 0,
        median: 0,
        fastest: 0,
        slowest: 0,
        byService: [] as { service: string; count: number; avg: number }[],
      };
    }
    const sorted = [...rows].map((r) => r.transitDays).sort((a, b) => a - b);
    const sum = sorted.reduce((s, v) => s + v, 0);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
        : sorted[mid] ?? 0;

    const byService = new Map<string, number[]>();
    for (const r of rows) {
      const svc = r.serviceType ?? "Unknown";
      const list = byService.get(svc) ?? [];
      list.push(r.transitDays);
      byService.set(svc, list);
    }
    const serviceRows = Array.from(byService.entries())
      .map(([service, vs]) => ({
        service,
        count: vs.length,
        avg: vs.reduce((s, v) => s + v, 0) / vs.length,
      }))
      .sort((a, b) => a.avg - b.avg);

    return {
      rows,
      avg: sum / sorted.length,
      median,
      fastest: sorted[0] ?? 0,
      slowest: sorted[sorted.length - 1] ?? 0,
      byService: serviceRows,
    };
  }, [items, trackingInfos]);

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Delivery speed
        </p>
        <h2 className="mt-1 text-3xl font-bold text-white">
          {data ? `${data.avg.toFixed(1)} days avg` : "—"}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Purchase → delivered, across {data?.rows.length ?? 0} delivered shipments
        </p>
      </header>

      {(il || tl || ie || te) && (
        <p className="text-xs text-slate-400 mb-4">
          {il || tl ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="Avg transit"
          value={data ? data.avg.toFixed(1) : "—"}
          sublabel="days"
        />
        <StatTile
          label="Median"
          value={data ? data.median.toFixed(1) : "—"}
          sublabel="days"
        />
        <StatTile
          label="Fastest"
          value={data ? data.fastest.toFixed(1) : "—"}
          sublabel="days"
          tone="good"
        />
        <StatTile
          label="Slowest"
          value={data ? data.slowest.toFixed(1) : "—"}
          sublabel="days"
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
        {!data || data.rows.length === 0 ? (
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
                {data.rows.slice(0, RECENT_LIMIT).map((r) => (
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
