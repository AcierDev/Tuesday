"use client";

import { useMemo, useState } from "react";

import { ActivityType } from "@/typings/types";
import { useActivities } from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const TYPE_LABELS: Record<ActivityType, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  status_change: "Status",
  restore: "Restored",
};

const TYPE_COLORS: Record<ActivityType, string> = {
  create: "text-emerald-400",
  update: "text-slate-300",
  delete: "text-red-400",
  status_change: "text-sky-400",
  restore: "text-amber-400",
};

const FILTERS: { key: ActivityType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "status_change", label: "Status" },
  { key: "create", label: "Created" },
  { key: "update", label: "Updated" },
  { key: "delete", label: "Deleted" },
];

const PAGE_SIZE = 100;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function ActivityFeedPage() {
  const { activities, loading, error } = useActivities();
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const [shown, setShown] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    if (!activities) return [];
    return filter === "all"
      ? activities
      : activities.filter((a) => a.type === filter);
  }, [activities, filter]);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Activity feed
          </p>
          <h2 className="mt-1 text-3xl font-bold text-white">
            {activities ? `${filtered.length} events` : "—"}
          </h2>
        </div>
        <div className="inline-flex rounded-xl glass-surface p-1 gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setFilter(f.key);
                setShown(PAGE_SIZE);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap",
                f.key === filter
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="rounded-2xl glass-surface p-5">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400">No activity.</p>
        ) : (
          <div className="space-y-2">
            {filtered.slice(0, shown).map((a) => {
              const colorClass = TYPE_COLORS[a.type];
              const customer = a.metadata?.customerName;
              return (
                <div
                  key={a.id}
                  className="flex items-start gap-3 py-2 border-b border-white/5"
                >
                  <span
                    className={cn(
                      "shrink-0 w-20 text-[11px] font-semibold uppercase tracking-wider",
                      colorClass
                    )}
                  >
                    {TYPE_LABELS[a.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white">
                      {customer ?? "—"}
                      {a.metadata?.design && (
                        <span className="text-slate-400 ml-2 text-xs">
                          · {a.metadata.design}
                          {a.metadata.size ? ` · ${a.metadata.size}` : ""}
                        </span>
                      )}
                    </div>
                    {a.changes.length > 0 && (
                      <div className="mt-0.5 text-xs text-slate-400">
                        {a.changes
                          .map(
                            (c) =>
                              `${c.field}: ${c.oldValue ?? "—"} → ${c.newValue}`
                          )
                          .join(" · ")}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-slate-400 tabular-nums">
                    {new Date(a.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })}
            {filtered.length > shown && (
              <div className="pt-3 text-center">
                <button
                  onClick={() => setShown((s) => s + PAGE_SIZE)}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg bg-white/10 hover:bg-white/15 text-white transition"
                >
                  Show {Math.min(PAGE_SIZE, filtered.length - shown)} more
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
