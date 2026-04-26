"use client";

import { useMemo } from "react";

import { laDayKey } from "@/lib/debt-metrics";
import { bucketCompletionsByDay } from "@/lib/production-metrics";
import { StatTile, useAllItems } from "@/lib/stats-shared";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function RecordsPage() {
  const { items, loading, error } = useAllItems();

  const records = useMemo(() => {
    if (!items) return null;

    const completed = items
      .filter((i) => i.completedAt)
      .map((i) => i.completedAt!)
      .sort((a, b) => a - b);
    if (completed.length === 0) {
      return {
        total: 0,
        bestDay: null as null | { date: string; count: number },
        bestWeek: null as null | { weekStart: string; count: number },
        bestMonth: null as null | { month: string; count: number },
        currentStreak: 0,
        longestStreak: 0,
        firstShipped: null as null | string,
      };
    }

    const firstDate = laDayKey(new Date(completed[0]!));
    const today = laDayKey();
    const buckets = bucketCompletionsByDay(items, firstDate, today);

    const bestDay = buckets.reduce(
      (best, b) => (b.value > (best?.count ?? 0) ? { date: b.date, count: b.value } : best),
      null as null | { date: string; count: number }
    );

    // Best week (7-day rolling)
    let bestWeek: { weekStart: string; count: number } | null = null;
    for (let i = 0; i + 6 < buckets.length; i++) {
      const sum = buckets.slice(i, i + 7).reduce((s, b) => s + b.value, 0);
      if (!bestWeek || sum > bestWeek.count) {
        bestWeek = { weekStart: buckets[i]!.date, count: sum };
      }
    }

    // Best calendar month
    const monthTotals = new Map<string, number>();
    for (const b of buckets) {
      const month = b.date.slice(0, 7);
      monthTotals.set(month, (monthTotals.get(month) ?? 0) + b.value);
    }
    let bestMonth: { month: string; count: number } | null = null;
    for (const [month, count] of monthTotals.entries()) {
      if (!bestMonth || count > bestMonth.count) bestMonth = { month, count };
    }

    // Streaks (consecutive days with ≥ 1 completion)
    let currentStreak = 0;
    let longestStreak = 0;
    let runningStreak = 0;
    for (const b of buckets) {
      if (b.value > 0) {
        runningStreak += 1;
        if (runningStreak > longestStreak) longestStreak = runningStreak;
      } else {
        runningStreak = 0;
      }
    }
    // Current streak: count back from today
    for (let i = buckets.length - 1; i >= 0; i--) {
      if ((buckets[i]?.value ?? 0) > 0) currentStreak += 1;
      else break;
    }

    return {
      total: completed.length,
      bestDay,
      bestWeek,
      bestMonth,
      currentStreak,
      longestStreak,
      firstShipped: firstDate,
    };
  }, [items]);

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Records & streaks
        </p>
        <h2 className="mt-1 text-3xl font-bold text-white">
          {records ? `${records.total} items shipped lifetime` : "—"}
        </h2>
        {records?.firstShipped && (
          <p className="mt-1 text-xs text-slate-400">
            Since {records.firstShipped}
          </p>
        )}
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatTile
          label="Best day"
          value={records?.bestDay ? `${records.bestDay.count} items` : "—"}
          sublabel={records?.bestDay?.date ?? undefined}
          tone="good"
        />
        <StatTile
          label="Best week"
          value={records?.bestWeek ? `${records.bestWeek.count} items` : "—"}
          sublabel={
            records?.bestWeek
              ? `week of ${records.bestWeek.weekStart}`
              : undefined
          }
          tone="good"
        />
        <StatTile
          label="Best month"
          value={records?.bestMonth ? `${records.bestMonth.count} items` : "—"}
          sublabel={records?.bestMonth?.month ?? undefined}
          tone="good"
        />
        <StatTile
          label="Current streak"
          value={`${records?.currentStreak ?? 0} d`}
          sublabel="consecutive active days"
          tone={(records?.currentStreak ?? 0) > 0 ? "good" : "neutral"}
        />
        <StatTile
          label="Longest streak"
          value={`${records?.longestStreak ?? 0} d`}
          sublabel="consecutive active days"
        />
        <StatTile
          label="Lifetime total"
          value={`${records?.total ?? 0} items`}
          sublabel="shipped"
        />
      </section>
    </>
  );
}
