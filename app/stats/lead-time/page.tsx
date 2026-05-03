"use client";

import { useMemo, useState } from "react";

import { computeLeadTimeStats, LeadTimeRow } from "@/lib/production-metrics";
import {
  DEFAULT_RANGE,
  RangeKey,
  RangeSelector,
  StatTile,
  resolveRangeKey,
  useAllItems,
} from "@/lib/stats-shared";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const MIN_SAMPLE_COUNT = 1;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function LeadTimePage() {
  const { items, loading, error } = useAllItems();
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);

  const { start, end, label: rangeLabel } = resolveRangeKey(range);

  const stats = useMemo(() => {
    if (!items) return null;
    const startMs = new Date(`${start}T00:00:00`).getTime();
    const endMs = new Date(`${end}T23:59:59.999`).getTime();
    // Filter by completion date in range
    const filtered = items.filter(
      (i) =>
        i.completedAt && i.completedAt >= startMs && i.completedAt <= endMs
    );
    return computeLeadTimeStats(filtered);
  }, [items, start, end]);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Avg lead time · {rangeLabel}
          </p>
          <div className="mt-1 text-6xl font-bold tabular-nums leading-none">
            {stats ? stats.avgDays.toFixed(1) : "—"}
            <span className="text-2xl font-medium ml-2 text-slate-400">
              day{stats?.avgDays === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            From {stats?.count ?? 0} completed item
            {stats?.count === 1 ? "" : "s"}
          </p>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load items."}
        </p>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="Median"
          value={stats ? `${stats.medianDays.toFixed(1)} d` : "—"}
        />
        <StatTile
          label="P90"
          value={stats ? `${stats.p90Days.toFixed(1)} d` : "—"}
          sublabel="90% under this"
        />
        <StatTile
          label="Fastest"
          value={stats ? `${stats.fastestDays.toFixed(1)} d` : "—"}
          tone="good"
        />
        <StatTile
          label="Slowest"
          value={stats ? `${stats.slowestDays.toFixed(1)} d` : "—"}
          tone="bad"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadTimeTable
          title="By design"
          rows={stats?.byDesign ?? []}
          totalCount={stats?.count ?? 0}
        />
        <LeadTimeTable
          title="By size"
          rows={stats?.bySize ?? []}
          totalCount={stats?.count ?? 0}
        />
      </section>
    </>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📋 LEAD TIME TABLE                                                   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

interface LeadTimeTableProps {
  title: string;
  rows: LeadTimeRow[];
  totalCount: number;
}

function LeadTimeTable({ title, rows, totalCount }: LeadTimeTableProps) {
  const visibleRows = rows.filter((r) => r.count >= MIN_SAMPLE_COUNT);
  return (
    <div className="rounded-2xl glass-surface p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </h2>
        <span className="text-xs text-slate-400">
          {visibleRows.length} group
          {visibleRows.length === 1 ? "" : "s"}
        </span>
      </div>
      {visibleRows.length === 0 ? (
        <p className="text-sm text-slate-400">No data in this range.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium text-right">Count</th>
                <th className="px-3 py-2 font-medium text-right">Avg days</th>
                <th className="px-3 py-2 font-medium text-right">Median</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => {
                const sharePct = totalCount
                  ? Math.round((r.count / totalCount) * 100)
                  : 0;
                return (
                  <tr
                    key={r.key}
                    className="border-t border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="px-3 py-2 font-medium">{r.key}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                      {r.count}
                      <span className="ml-1 text-[10px]">({sharePct}%)</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      {r.avgDays.toFixed(1)}
                      <span className="ml-1 text-xs font-medium text-slate-400">
                        d
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                      {r.medianDays.toFixed(1)} d
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
