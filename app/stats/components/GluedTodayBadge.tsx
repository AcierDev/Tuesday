"use client";

import { useMemo } from "react";

import { laDayKey } from "@/lib/debt-metrics";
import { buildGluedEvents } from "@/lib/production-metrics";
import { useActivities, useAllItems } from "@/lib/stats-shared";

import { BadgeCard } from "./BadgeCard";

export function GluedTodayBadge({ active }: { active: boolean }) {
  const { items, loading: itemsLoading } = useAllItems();
  const { activities, loading: actLoading } = useActivities();

  const todayStats = useMemo(() => {
    if (!items || !activities) return null;
    const today = laDayKey();
    const events = buildGluedEvents(activities, items).filter(
      (e) => e.dayKey === today
    );
    const squares = events.reduce((s, e) => s + e.squares, 0);
    return { squares, orders: events.length };
  }, [items, activities]);

  const loading = itemsLoading || actLoading;

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
