"use client";

import { useMemo, useState } from "react";

import { ItemDesigns } from "@/typings/types";
import { DESIGN_COLORS } from "@/typings/constants";
import { computeMix, MixRow } from "@/lib/production-metrics";
import {
  DEFAULT_RANGE,
  RangeKey,
  RangeSelector,
  StatTile,
  resolveRangeKey,
  useAllItems,
} from "@/lib/stats-shared";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function MixPage() {
  const { items, loading, error } = useAllItems();
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);

  const { start, end, label: rangeLabel } = resolveRangeKey(range);

  const mix = useMemo(() => {
    if (!items) return null;
    return computeMix(items, start, end);
  }, [items, start, end]);

  const topDesign = mix?.designs[0];
  const topSize = mix?.sizes[0];

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Items created · {rangeLabel}
          </p>
          <div className="mt-1 text-6xl font-bold tabular-nums leading-none">
            {mix?.total ?? 0}
            <span className="text-2xl font-medium ml-2 text-slate-400">
              item{mix?.total === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {mix?.designs.length ?? 0} distinct design
            {mix?.designs.length === 1 ? "" : "s"} ·{" "}
            {mix?.sizes.length ?? 0} distinct size
            {mix?.sizes.length === 1 ? "" : "s"}
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
          label="Total items"
          value={mix?.total ?? 0}
          sublabel={rangeLabel}
        />
        <StatTile
          label="Distinct designs"
          value={mix?.designs.length ?? 0}
        />
        <StatTile
          label="Top design"
          value={topDesign?.key ?? "—"}
          sublabel={topDesign ? `${topDesign.count} items` : undefined}
        />
        <StatTile
          label="Top size"
          value={topSize?.key ?? "—"}
          sublabel={topSize ? `${topSize.count} items` : undefined}
        />
      </section>

      <section className="rounded-2xl glass-surface p-5 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          By design
        </h2>
        <MixGrid
          rows={mix?.designs ?? []}
          barColor="bg-violet-400"
          showDesignSwatch
        />
      </section>

      <section className="rounded-2xl glass-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          By size
        </h2>
        <MixGrid rows={mix?.sizes ?? []} barColor="bg-amber-400" />
      </section>
    </>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 MIX GRID                                                          ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

interface MixGridProps {
  rows: MixRow[];
  barColor: string;
  showDesignSwatch?: boolean;
}

function MixGrid({ rows, barColor, showDesignSwatch }: MixGridProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-400">No data in this range.</p>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {rows.map((row) => (
        <div
          key={row.key}
          className="rounded-xl px-3 py-3 bg-white/5 border border-white/10 flex flex-col items-start"
        >
          {showDesignSwatch && <DesignSwatch design={row.key} />}
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {row.key}
          </span>
          <span className="mt-1 text-stat-value">
            {row.count}
          </span>
          <span className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
            {Math.round(row.pct)}% of total
          </span>
          <div className="mt-2 w-full h-1 rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor}`}
              style={{ width: `${row.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 DESIGN SWATCH — palette strip identifying the design               ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const SWATCH_MAX_COLORS = 8;

function DesignSwatch({ design }: { design: string }) {
  const palette = DESIGN_COLORS[design as ItemDesigns];
  if (!palette) return null;
  const colors = Object.values(palette)
    .map((c) => c.hex)
    .filter((hex, i, arr) => arr.indexOf(hex) === i)
    .slice(0, SWATCH_MAX_COLORS);
  if (colors.length === 0) return null;
  return (
    <div className="mb-2 flex h-3 w-full overflow-hidden rounded-full border border-white/10">
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
