"use client";

import { useMemo } from "react";
import Link from "next/link";

import {
  RECENCY_WEIGHTED_FORECAST,
  recentGluedWindow,
  summarizeGluedForecast,
} from "@/lib/production-metrics";
import { useGluedStats, useLaToday } from "@/lib/stats-shared";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 COMPONENT                                                         ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Same window (and so the same cached request) as the planner's capacity and
// the nav Forecast badge; useLaToday advances it at LA midnight.
export function HistoricalAverageBadge() {
  const today = useLaToday();
  const { data } = useGluedStats(recentGluedWindow(today));
  const stats = useMemo(
    () => (data ? summarizeGluedForecast(data.buckets, today) : null),
    [data, today]
  );

  const hasData = stats !== null && stats.weightedAvgActive > 0;
  const tooltip = hasData
    ? `Weighted avg per active day · last ${RECENCY_WEIGHTED_FORECAST.recentWindowDays}d ` +
      `count ${RECENCY_WEIGHTED_FORECAST.recentWeight}x. Click for the full breakdown.`
    : "Loading recent squares/day…";

  return (
    <Link
      href="/stats/glued"
      title={tooltip}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-emerald-500/25 hover:bg-emerald-500/40 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 ring-1 ring-inset ring-emerald-500/40 dark:ring-emerald-400/30 backdrop-blur-sm shadow-sm shadow-emerald-500/15 text-emerald-800 dark:text-white text-sm font-semibold tabular-nums transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-500/25 active:translate-y-0"
    >
      <span>
        {hasData ? Math.round(stats.weightedAvgActive).toLocaleString() : "—"}
      </span>
      <span className="text-emerald-800/75 dark:text-white/75 font-normal">
        sq/day · {RECENCY_WEIGHTED_FORECAST.lookbackDays}d
      </span>
    </Link>
  );
}
