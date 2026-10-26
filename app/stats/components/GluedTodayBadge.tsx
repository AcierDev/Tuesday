"use client";

import { useMemo } from "react";

import { recentGluedWindow } from "@/lib/production-metrics";
import { useGluedStats, useLaToday } from "@/lib/stats-shared";

import { BadgeCard } from "./BadgeCard";

// Server-computed (shares the nav/planner recent-window request) instead of
// rebuilding glue events from every item + the capped activity feed.
export function GluedTodayBadge({ active }: { active: boolean }) {
  const today = useLaToday();
  const { data, loading } = useGluedStats(recentGluedWindow(today));

  const todayStats = useMemo(() => {
    if (!data) return null;
    const events = data.events.filter((e) => e.dayKey === today);
    const squares = events.reduce((s, e) => s + e.squares, 0);
    return { squares, orders: events.length };
  }, [data, today]);

  return (
    <BadgeCard href="/stats/glued" label="Glued today" active={active}>
      <div className="mt-0.5 text-4xl font-bold tabular-nums leading-none text-sky-400">
        {todayStats ? todayStats.squares.toLocaleString() : loading ? "…" : "—"}
        <span className="ml-1 text-base font-medium text-slate-400">sq</span>
      </div>
      {todayStats && (
        <div className="mt-1 text-[11px] text-slate-400">
          {todayStats.orders} order{todayStats.orders === 1 ? "" : "s"}
        </div>
      )}
    </BadgeCard>
  );
}
