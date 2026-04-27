"use client";

import { useMemo, useState } from "react";

import { ItemDesigns } from "@/typings/types";
import { DESIGN_COLORS } from "@/typings/constants";
import { laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import { computeDesignTrend } from "@/lib/production-metrics";
import { StatTile, useAllItems } from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const WINDOW_OPTIONS = [
  { key: "30d", label: "30d", days: 30 },
  { key: "90d", label: "90d", days: 90 },
] as const;
type WindowKey = (typeof WINDOW_OPTIONS)[number]["key"];

const TOP_ROWS = 12;
const SWATCH_MAX_COLORS = 8;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function TrendingPage() {
  const { items, loading, error } = useAllItems();
  const [windowKey, setWindowKey] = useState<WindowKey>("30d");

  const days = WINDOW_OPTIONS.find((w) => w.key === windowKey)?.days ?? 30;

  const data = useMemo(() => {
    if (!items) return null;
    const today = laDayKey();
    const recentEnd = today;
    const recentStart = shiftDayKey(today, -(days - 1));
    const priorEnd = shiftDayKey(recentStart, -1);
    const priorStart = shiftDayKey(priorEnd, -(days - 1));
    const all = computeDesignTrend(
      items,
      recentStart,
      recentEnd,
      priorStart,
      priorEnd
    );
    const rising = [...all]
      .filter((r) => r.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, TOP_ROWS);
    const falling = [...all]
      .filter((r) => r.delta < 0)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, TOP_ROWS);
    const dying = [...all]
      .filter((r) => r.recent === 0 && r.prior > 0)
      .sort((a, b) => b.prior - a.prior)
      .slice(0, TOP_ROWS);
    return { all, rising, falling, dying };
  }, [items, days]);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Trending designs · {days}d vs prior {days}d
          </p>
          <h2 className="mt-1 heading-page">
            {data?.rising[0]
              ? `${data.rising[0].design} +${data.rising[0].delta} items`
              : "—"}
          </h2>
        </div>
        <div className="inline-flex rounded-xl glass-surface p-1 gap-1">
          {WINDOW_OPTIONS.map((w) => (
            <button
              key={w.key}
              type="button"
              onClick={() => setWindowKey(w.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap",
                w.key === windowKey
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatTile
          label="Rising"
          value={data?.rising.length ?? 0}
          tone="good"
        />
        <StatTile
          label="Falling"
          value={data?.falling.length ?? 0}
          tone="bad"
        />
        <StatTile
          label="Went silent"
          value={data?.dying.length ?? 0}
          sublabel={`had orders prior ${days}d, none recent`}
          tone={(data?.dying.length ?? 0) > 0 ? "bad" : "neutral"}
        />
      </section>

      <TrendTable title="Rising" rows={data?.rising ?? []} positive />
      <TrendTable title="Falling" rows={data?.falling ?? []} positive={false} />
      <TrendTable title="Went silent" rows={data?.dying ?? []} positive={false} />
    </>
  );
}

interface TrendTableProps {
  title: string;
  rows: { design: string; recent: number; prior: number; delta: number; deltaPct: number }[];
  positive: boolean;
}

function TrendTable({ title, rows, positive }: TrendTableProps) {
  return (
    <section className="rounded-2xl glass-surface p-5 mb-4">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </h3>
        <span className="text-xs text-slate-400">
          {rows.length} design{rows.length === 1 ? "" : "s"}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">None.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2 font-medium">Design</th>
                <th className="px-3 py-2 font-medium text-right">Prior items</th>
                <th className="px-3 py-2 font-medium text-right">Recent items</th>
                <th className="px-3 py-2 font-medium text-right">Δ items</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.design}
                  className="border-t border-white/5 hover:bg-white/5 transition"
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <DesignSwatch design={r.design} />
                      <span className="font-medium">{r.design}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                    {r.prior}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-white">
                    {r.recent}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right tabular-nums font-semibold",
                      positive ? "text-emerald-500" : "text-red-500"
                    )}
                  >
                    {r.delta > 0 ? "+" : ""}
                    {r.delta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DesignSwatch({ design }: { design: string }) {
  const palette = DESIGN_COLORS[design as ItemDesigns];
  if (!palette) return <span className="inline-block w-12 h-3" />;
  const colors = Object.values(palette)
    .map((c) => c.hex)
    .filter((hex, i, arr) => arr.indexOf(hex) === i)
    .slice(0, SWATCH_MAX_COLORS);
  if (colors.length === 0) return <span className="inline-block w-12 h-3" />;
  return (
    <div className="flex h-3 w-12 overflow-hidden rounded-full border border-white/10 shrink-0">
      {colors.map((hex, i) => (
        <div
          key={`${hex}-${i}`}
          className="flex-1"
          style={{ backgroundColor: hex }}
        />
      ))}
    </div>
  );
}
