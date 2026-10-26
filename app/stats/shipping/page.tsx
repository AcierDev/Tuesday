"use client";

import { useMemo, useState } from "react";

import type { ShippingView } from "@/lib/server/stats-views/shipping";
import {
  ChartPoint,
  DEFAULT_RANGE,
  RangeKey,
  RangeSelector,
  StatTile,
  TimeSeriesChart,
  resolveRangeKey,
  useStatsView,
} from "@/lib/stats-shared";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const SHIPPING_COLOR = "rgb(244 114 182)";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function ShippingPage() {
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);

  const { start, end, days, label: rangeLabel } = resolveRangeKey(range);

  // Server-computed (lib/server/stats-views/shipping): label spend per day,
  // totals and the top services for labels bought in range.
  const { data, loading, error } = useStatsView<ShippingView>("shipping", {
    start,
    end,
  });

  const chartSeries = useMemo<ChartPoint[]>(
    () =>
      data?.buckets.map((b) => ({ date: b.date, value: b.cost })) ?? [],
    [data]
  );

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Shipping spend · {rangeLabel}
          </p>
          <div className="mt-1 text-6xl font-bold tabular-nums leading-none text-white">
            {data ? `$${data.summary.total.toFixed(0)}` : "—"}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {data?.summary.count ?? 0} shipment
            {data?.summary.count === 1 ? "" : "s"} · avg $
            {data ? data.summary.avgPerShipment.toFixed(2) : "—"} ea
          </p>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="rounded-2xl glass-surface p-5 mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Daily spend
        </h3>
        <TimeSeriesChart
          series={chartSeries}
          color={SHIPPING_COLOR}
          gradientId="shipping-area"
          formatValue={(v) => `$${Math.round(v)}`}
          showWeekBoundaries={days <= 90}
        />
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatTile
          label="Total spend"
          value={data ? `$${data.summary.total.toFixed(0)}` : "—"}
        />
        <StatTile
          label="Avg / shipment"
          value={data ? `$${data.summary.avgPerShipment.toFixed(2)}` : "—"}
        />
        <StatTile
          label="Peak day"
          value={data ? `$${data.summary.peakDayCost.toFixed(0)}` : "—"}
          sublabel="spend"
        />
      </section>

      <section className="rounded-2xl glass-surface p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          By service level
        </h3>
        {!data || data.serviceRows.length === 0 ? (
          <p className="text-sm text-slate-400">No shipments in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2 font-medium">Service</th>
                  <th className="px-3 py-2 font-medium text-right">Count</th>
                  <th className="px-3 py-2 font-medium text-right">Total cost</th>
                  <th className="px-3 py-2 font-medium text-right">Avg / shipment</th>
                </tr>
              </thead>
              <tbody>
                {data.serviceRows.map((r) => (
                  <tr
                    key={r.service}
                    className="border-t border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="px-3 py-2 font-medium">{r.service}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                      {r.count}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-white">
                      ${r.cost.toFixed(0)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                      ${(r.cost / r.count).toFixed(2)}
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
