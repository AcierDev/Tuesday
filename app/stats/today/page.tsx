"use client";

import { ItemStatus } from "@/typings/types";
import { STATUS_COLORS } from "@/typings/constants";
import type { TodayView } from "@/lib/server/stats-views/active";
import { StatTile, useStatsView } from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const SHOP_TIME_ZONE = "America/Los_Angeles";

export default function TodayPage() {
  // Server-computed (lib/server/stats-views/active): completed/due/late/at-risk.
  const { data, loading, error } = useStatsView<TodayView>("today");

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Today
        </p>
        <h2 className="mt-1 heading-page">
          {new Date().toLocaleDateString("en-US", {
            timeZone: SHOP_TIME_ZONE,
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h2>
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="Completed today"
          value={data?.completedToday ?? 0}
          tone={(data?.completedToday ?? 0) > 0 ? "good" : "neutral"}
        />
        <StatTile
          label="Due today"
          value={data?.dueToday.length ?? 0}
        />
        <StatTile
          label="Late now"
          value={data?.lateNow.length ?? 0}
          tone={(data?.lateNow.length ?? 0) > 0 ? "bad" : "good"}
        />
        <StatTile
          label="At risk"
          value={data?.atRisk.length ?? 0}
          sublabel={data ? `due in ≤${data.atRiskDays}d` : undefined}
        />
      </section>

      <ItemTable
        title="Due today"
        rows={(data?.dueToday ?? []).map((item) => ({
          item,
          rightLabel: "today",
          rightTone: "neutral",
        }))}
      />
      <ItemTable
        title="Late now"
        rows={(data?.lateNow ?? []).map(({ item, daysLate }) => ({
          item,
          rightLabel: `−${daysLate}d`,
          rightTone: "bad",
        }))}
      />
      <ItemTable
        title="At risk"
        rows={(data?.atRisk ?? []).map(({ item, daysToDue }) => ({
          item,
          rightLabel: `${daysToDue}d`,
          rightTone: "neutral",
        }))}
      />
    </>
  );
}

interface ItemTableProps {
  title: string;
  rows: {
    item: { id: string; customerName?: string; status: ItemStatus; dueDate?: string };
    rightLabel: string;
    rightTone: "good" | "bad" | "neutral";
  }[];
}

function ItemTable({ title, rows }: ItemTableProps) {
  return (
    <section className="rounded-2xl glass-surface p-5 mb-4">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </h3>
        <span className="text-xs text-slate-400">
          {rows.length} item{rows.length === 1 ? "" : "s"}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">None.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {rows.map(({ item, rightLabel, rightTone }) => {
                const color = STATUS_COLORS[item.status];
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
                    <td className="px-3 py-2 tabular-nums text-slate-400 text-right">
                      {item.dueDate?.slice(0, 10) ?? "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right tabular-nums font-semibold",
                        rightTone === "bad" && "text-red-500",
                        rightTone === "good" && "text-emerald-500"
                      )}
                    >
                      {rightLabel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
