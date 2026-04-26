"use client";

import { useMemo } from "react";

import { ItemStatus } from "@/typings/types";
import { STATUS_COLORS } from "@/typings/constants";
import { computeWipAging } from "@/lib/production-metrics";
import { StatTile, useActivities, useAllItems } from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const STALE_DAYS = 7;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function WipPage() {
  const { items, loading: itemsLoading, error: itemsError } = useAllItems();
  const { activities, loading: actLoading, error: actError } = useActivities();

  const rows = useMemo(() => {
    if (!items || !activities) return null;
    return computeWipAging(items, activities);
  }, [items, activities]);

  const stats = useMemo(() => {
    if (!rows) return null;
    const stale = rows.filter((r) => r.daysInStatus >= STALE_DAYS);
    const totalDays = rows.reduce((s, r) => s + r.daysInStatus, 0);
    return {
      total: rows.length,
      stale: stale.length,
      avgDays: rows.length ? totalDays / rows.length : 0,
      maxDays: rows.length ? Math.max(...rows.map((r) => r.daysInStatus)) : 0,
    };
  }, [rows]);

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          WIP & Aging
        </p>
        <h2 className="mt-1 text-3xl font-bold text-white">
          {stats ? `${stats.total} active items` : "—"}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Sorted by time stuck in current status
        </p>
      </header>

      {(itemsLoading || actLoading || itemsError || actError) && (
        <p className="text-xs text-slate-400 mb-4">
          {itemsLoading || actLoading ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatTile label="Active items" value={`${stats?.total ?? 0} items`} />
        <StatTile
          label={`Stale (≥${STALE_DAYS}d)`}
          value={`${stats?.stale ?? 0} items`}
          tone={(stats?.stale ?? 0) > 0 ? "bad" : "good"}
        />
        <StatTile
          label="Avg age"
          value={stats ? `${stats.avgDays.toFixed(1)} d` : "—"}
          sublabel="in status"
        />
        <StatTile
          label="Oldest"
          value={stats ? `${stats.maxDays.toFixed(1)} d` : "—"}
          sublabel="in status"
          tone={(stats?.maxDays ?? 0) > STALE_DAYS ? "bad" : "neutral"}
        />
      </section>

      <section className="rounded-2xl glass-surface p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Items by age
        </h3>
        {!rows || rows.length === 0 ? (
          <p className="text-sm text-slate-400">No active items.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Days in status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item, daysInStatus }) => {
                  const color = STATUS_COLORS[item.status];
                  const isStale = daysInStatus >= STALE_DAYS;
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
                          {item.status}
                        </span>
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right tabular-nums font-semibold",
                          isStale ? "text-red-500" : "text-white"
                        )}
                      >
                        {daysInStatus.toFixed(1)}
                        <span className="ml-1 text-xs font-medium text-slate-400">
                          d
                        </span>
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
