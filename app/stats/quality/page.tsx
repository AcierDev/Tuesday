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
// REMOVED 2026-04-30: this page used to surface average customer rating and a
// rating distribution chart, sourced from the now-removed `Item.rating` field.
// Reversal tracking (status moved backwards) is independent and retained.

export default function QualityPage() {
  const { items, loading: il, error: ie } = useAllItemsRich();
  const { activities, loading: al, error: ae } = useActivities();

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
          {reversals ? `${reversals.events.length} reversals` : "—"}
        </h2>
      </header>

      {(il || al || ie || ae) && (
        <p className="text-xs text-slate-400 mb-4">
          {il || al ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
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
