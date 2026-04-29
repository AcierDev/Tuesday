"use client";

import { useMemo } from "react";

import { computeHealthScore } from "@/lib/production-metrics";
import { useAllItems } from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

import { BadgeCard } from "./BadgeCard";

const HEALTH_GOOD_THRESHOLD = 85;
const HEALTH_BAD_THRESHOLD = 60;

export function HealthBadge({ active }: { active: boolean }) {
  const { items, loading } = useAllItems();
  const score = useMemo(
    () => (items ? computeHealthScore(items).total : null),
    [items]
  );

  const tone =
    score === null
      ? "neutral"
      : score >= HEALTH_GOOD_THRESHOLD
        ? "good"
        : score < HEALTH_BAD_THRESHOLD
          ? "bad"
          : "neutral";

  return (
    <BadgeCard href="/stats/health" label="Health" active={active}>
      <div
        className={cn(
          "mt-0.5 text-4xl font-bold tabular-nums leading-none",
          tone === "good" && "text-emerald-400",
          tone === "bad" && "text-red-400",
          tone === "neutral" && "text-white"
        )}
      >
        {score !== null ? score : loading ? "…" : "—"}
        <span className="ml-1 text-base font-medium text-slate-400">/100</span>
      </div>
    </BadgeCard>
  );
}
