"use client";

import { useMemo } from "react";

import { ItemStatus } from "@/typings/types";
import { STATUS_COLORS } from "@/typings/constants";
import { useActivities, useAllItemsRich } from "@/lib/stats-shared";
import { StatTile } from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG — status forward order; reversal = backwards in this list  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const STATUS_FLOW: ItemStatus[] = [
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
  ItemStatus.Packaging,
  ItemStatus.At_The_Door,
  ItemStatus.Done,
];

function flowIndex(status: string): number {
  return STATUS_FLOW.indexOf(status as ItemStatus);
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function QualityPage() {
  const { items, loading: il, error: ie } = useAllItemsRich();
  const { activities, loading: al, error: ae } = useActivities();

  const ratingData = useMemo(() => {
    if (!items) return null;
    const rated = items
      .filter((i) => i.rating && i.rating.trim().length > 0)
      .map((i) => parseFloat(i.rating!) || 0)
      .filter((v) => v > 0);
    if (rated.length === 0) return { count: 0, avg: 0, distribution: [] };
    const avg = rated.reduce((s, v) => s + v, 0) / rated.length;
    const distribution = [1, 2, 3, 4, 5].map((star) => ({
      star,
      count: rated.filter((v) => Math.round(v) === star).length,
    }));
    return { count: rated.length, avg, distribution };
  }, [items]);

  const reversals = useMemo(() => {
    if (!activities || !items) return null;
    const itemMap = new Map(items.map((i) => [i.id, i]));
    const events: { itemId: string; from: string; to: string; timestamp: number }[] = [];
    for (const a of activities) {
      if (a.type !== "status_change") continue;
      const change = a.changes.find((c) => c.field === "status");
      if (!change) continue;
      const fromIdx = flowIndex(change.oldValue ?? "");
      const toIdx = flowIndex(change.newValue);
      if (fromIdx === -1 || toIdx === -1) continue;
      if (toIdx < fromIdx) {
        events.push({
          itemId: a.itemId,
          from: change.oldValue ?? "",
          to: change.newValue,
          timestamp: a.timestamp,
        });
      }
    }
    events.sort((a, b) => b.timestamp - a.timestamp);
    return { events, itemMap };
  }, [activities, items]);

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Quality
        </p>
        <h2 className="mt-1 heading-page">
          {ratingData
            ? ratingData.count > 0
              ? `${ratingData.avg.toFixed(2)} avg rating`
              : "No ratings yet"
            : "—"}
        </h2>
      </header>

      {(il || al || ie || ae) && (
        <p className="text-xs text-slate-400 mb-4">
          {il || al ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="Rated items"
          value={ratingData?.count ?? 0}
        />
        <StatTile
          label="Avg rating"
          value={ratingData ? ratingData.avg.toFixed(2) : "—"}
          tone={
            ratingData && ratingData.avg >= 4
              ? "good"
              : ratingData && ratingData.avg < 3
                ? "bad"
                : "neutral"
          }
        />
        <StatTile
          label="Reversals"
          value={reversals?.events.length ?? 0}
          sublabel="status moved backwards"
          tone={(reversals?.events.length ?? 0) > 0 ? "bad" : "good"}
        />
        <StatTile
          label="Items reversed"
          value={
            reversals
              ? new Set(reversals.events.map((e) => e.itemId)).size
              : 0
          }
          sublabel="distinct items"
        />
      </section>

      <section className="rounded-2xl glass-surface p-5 mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Rating distribution
        </h3>
        {!ratingData || ratingData.distribution.length === 0 ? (
          <p className="text-sm text-slate-400">No ratings yet.</p>
        ) : (
          <div className="space-y-2">
            {ratingData.distribution.reverse().map((d) => {
              const pct = ratingData.count
                ? (d.count / ratingData.count) * 100
                : 0;
              return (
                <div key={d.star}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-semibold text-white">
                      {"★".repeat(d.star)}
                      <span className="text-slate-500">
                        {"★".repeat(5 - d.star)}
                      </span>
                    </span>
                    <span className="text-xs text-slate-400 tabular-nums">
                      {d.count} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl glass-surface p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Recent reversals
        </h3>
        {!reversals || reversals.events.length === 0 ? (
          <p className="text-sm text-slate-400">No status reversals.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">From</th>
                  <th className="px-3 py-2 font-medium">To</th>
                </tr>
              </thead>
              <tbody>
                {reversals.events.slice(0, 50).map((e, i) => {
                  const item = reversals.itemMap.get(e.itemId);
                  return (
                    <tr
                      key={`${e.itemId}-${e.timestamp}-${i}`}
                      className="border-t border-white/5 hover:bg-white/5 transition"
                    >
                      <td className="px-3 py-2 tabular-nums text-slate-400">
                        {new Date(e.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {item?.customerName || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={e.from} />
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={e.to} />
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

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status as ItemStatus];
  if (!color) return <span className="text-slate-400">{status}</span>;
  return (
    <span
      className={cn(
        "inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide bg-white/5",
        `text-${color}`
      )}
    >
      {status}
    </span>
  );
}
