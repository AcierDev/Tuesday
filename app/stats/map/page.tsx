"use client";

import { useMemo } from "react";

import { computeStateMix } from "@/lib/production-metrics";
import { StatTile, useAllItemsRich } from "@/lib/stats-shared";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function MapPage() {
  const { items, loading, error } = useAllItemsRich();

  const data = useMemo(() => {
    if (!items) return null;
    const rows = computeStateMix(items);
    const totalShipped = rows.reduce((s, r) => s + r.count, 0);
    const top = rows[0];
    return { rows, totalShipped, top, distinctStates: rows.length };
  }, [items]);

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Geographic distribution
        </p>
        <h2 className="mt-1 text-3xl font-bold text-white">
          {data ? `${data.distinctStates} states` : "—"}
        </h2>
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatTile
          label="Top state"
          value={data?.top?.state ?? "—"}
          sublabel={data?.top ? `${data.top.count} shipments` : undefined}
        />
        <StatTile
          label="Total shipments"
          value={data?.totalShipped ?? 0}
          sublabel="all time"
        />
        <StatTile
          label="Distinct states"
          value={data?.distinctStates ?? 0}
        />
      </section>

      <section className="rounded-2xl glass-surface p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          By state
        </h3>
        {!data || data.rows.length === 0 ? (
          <p className="text-sm text-slate-400">No shipping data.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {data.rows.map((r) => (
              <div
                key={r.state}
                className="rounded-xl px-3 py-3 bg-white/5 border border-white/10"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {r.state}
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums leading-none text-white">
                  {r.count}
                  <span className="ml-1 text-xs font-medium text-slate-400">
                    items
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                  {r.pct.toFixed(1)}%
                </div>
                <div className="mt-2 w-full h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sky-400"
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
