"use client";

import { useEffect, useState } from "react";

import { Activity, ActivityType } from "@/typings/types";
import {
  fetchSharedJson,
  useStatsRevalidationVersion,
} from "@/lib/stats-shared";
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
const ACTIVITIES_URL = "/api/activities";

interface ActivityPage {
  activities: Activity[];
  total: number;
}
interface Feed {
  activities: Activity[];
  total: number;
  pages: number;
}

// One server page of the feed (newest first), with the full match count.
function activityPageUrl(filter: ActivityType | "all", page: number): string {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    skip: String(page * PAGE_SIZE),
    includeTotal: "1",
  });
  if (filter !== "all") params.set("type", filter);
  return `${ACTIVITIES_URL}?${params.toString()}`;
}

// Pages are fetched by offset, so an event logged between two page loads can
// appear on both; keep its first copy.
function mergePages(pages: ActivityPage[]): Feed {
  const seen = new Set<string>();
  const activities: Activity[] = [];
  for (const page of pages) {
    for (const a of page.activities) {
      if (seen.has(a._id)) continue;
      seen.add(a._id);
      activities.push(a);
    }
  }
  return {
    activities,
    total: Math.max(0, ...pages.map((p) => p.total)),
    pages: pages.length,
  };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function ActivityFeedPage() {
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const [pageCount, setPageCount] = useState(1);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const version = useStatsRevalidationVersion();

  // The server pages through the whole log (no 5,000-event cap). Every loaded
  // page refetches after a write (stats invalidation), keeping the depth the
  // user scrolled to; requests are shared with any other mounted copy.
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      Array.from({ length: pageCount }, (_, page) =>
        fetchSharedJson<ActivityPage>(activityPageUrl(filter, page))
      )
    )
      .then((pages) => {
        if (cancelled) return;
        setFeed(mergePages(pages));
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load activities");
      });
    return () => {
      cancelled = true;
    };
  }, [filter, pageCount, version]);

  const loading = feed === null && error === null;
  const filtered = feed?.activities ?? [];
  const remaining = feed ? Math.max(0, feed.total - filtered.length) : 0;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Activity feed
          </p>
          <h2 className="mt-1 heading-page">
            {feed ? `${feed.total} events` : "—"}
          </h2>
        </div>
        <div className="inline-flex rounded-xl glass-surface p-1 gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                if (f.key === filter) return;
                setFilter(f.key);
                setPageCount(1);
                setFeed(null);
                setError(null);
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
            {filtered.map((a) => {
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
            {remaining > 0 && (
              <div className="pt-3 text-center">
                <button
                  onClick={() => setPageCount((feed?.pages ?? 0) + 1)}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg bg-white/10 hover:bg-white/15 text-white transition"
                >
                  Show {Math.min(PAGE_SIZE, remaining)} more
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
