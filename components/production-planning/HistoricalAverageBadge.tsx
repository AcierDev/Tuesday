"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";

import {
  RECENCY_WEIGHTED_FORECAST,
  summarizeRecencyWeighted,
  type RecencyWeightedStats,
} from "@/lib/production-metrics";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const STATS_ENDPOINT = `/api/stats/glued?days=${RECENCY_WEIGHTED_FORECAST.lookbackDays}`;

type GluedBucket = { date: string; value: number };

export function HistoricalAverageBadge() {
  const [stats, setStats] = useState<RecencyWeightedStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(STATS_ENDPOINT)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { buckets?: GluedBucket[] } | null) => {
        if (cancelled || !data?.buckets) return;
        setStats(summarizeRecencyWeighted(data.buckets, RECENCY_WEIGHTED_FORECAST));
      })
      .catch((err) => console.warn("Failed to load glued history", err));
    return () => {
      cancelled = true;
    };
  }, []);

  const hasData = stats !== null && stats.weightedAvgActive > 0;
  const tooltip = hasData
    ? `Weighted avg per active day · last ${RECENCY_WEIGHTED_FORECAST.recentWindowDays}d ` +
      `count ${RECENCY_WEIGHTED_FORECAST.recentWeight}x. Click for the full breakdown.`
    : "Loading recent squares/day…";

  return (
    <Link
      href="/stats/glued"
      title={tooltip}
      className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 ring-1 ring-inset ring-emerald-400/30 dark:ring-emerald-400/25 text-emerald-700 dark:text-emerald-200 text-sm font-medium tabular-nums transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-500/20 active:translate-y-0"
    >
      <TrendingUp className="h-4 w-4" />
      <span>
        {hasData ? Math.round(stats.weightedAvgActive).toLocaleString() : "—"}
      </span>
      <span className="text-emerald-700/70 dark:text-emerald-200/70 font-normal">
        sq/day · {RECENCY_WEIGHTED_FORECAST.lookbackDays}d
      </span>
    </Link>
  );
}
