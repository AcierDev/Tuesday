"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  RECENCY_WEIGHTED_FORECAST,
  summarizeRecencyWeighted,
  type RecencyWeightedStats,
} from "@/lib/production-metrics";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const STATS_ENDPOINT = `/api/stats/glued?days=${RECENCY_WEIGHTED_FORECAST.lookbackDays}`;
const MIDNIGHT_TIMEZONE = "America/Los_Angeles";
const MIDNIGHT_BUFFER_MS = 500;

type GluedBucket = { date: string; value: number };

// Returns the number of ms remaining until the next 00:00 in the shop's
// local timezone, plus a small buffer so the timer fires just after midnight.
function msUntilNextLocalMidnight(): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MIDNIGHT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  let h = get("hour");
  if (h === 24) h = 0; // some locales render midnight as "24"
  const msIntoDay =
    ((h * 60 + get("minute")) * 60 + get("second")) * 1000 +
    get("fractionalSecond");
  const msPerDay = 24 * 60 * 60 * 1000;
  return msPerDay - msIntoDay + MIDNIGHT_BUFFER_MS;
}

export function HistoricalAverageBadge() {
  const [stats, setStats] = useState<RecencyWeightedStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const load = () => {
      fetch(STATS_ENDPOINT)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { buckets?: GluedBucket[] } | null) => {
          if (cancelled || !data?.buckets) return;
          setStats(
            summarizeRecencyWeighted(data.buckets, RECENCY_WEIGHTED_FORECAST)
          );
        })
        .catch((err) => console.warn("Failed to load glued history", err));
    };

    const scheduleNextMidnight = () => {
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        load();
        scheduleNextMidnight();
      }, msUntilNextLocalMidnight());
    };

    load();
    scheduleNextMidnight();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
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
