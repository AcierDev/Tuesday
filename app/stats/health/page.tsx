"use client";

import { useMemo } from "react";

import { computeHealthScore, HealthBreakdownRow } from "@/lib/production-metrics";
import { useAllItems } from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const GOOD_THRESHOLD = 85;
const BAD_THRESHOLD = 60;

type Tone = "good" | "neutral" | "bad";

function scoreTone(score: number): Tone {
  if (score >= GOOD_THRESHOLD) return "good";
  if (score < BAD_THRESHOLD) return "bad";
  return "neutral";
}

function rowTone(earned: number, weight: number): Tone {
  const pct = (earned / weight) * 100;
  if (pct >= GOOD_THRESHOLD) return "good";
  if (pct < BAD_THRESHOLD) return "bad";
  return "neutral";
}

function gradeLabel(score: number): string {
  if (score >= 95) return "Excellent";
  if (score >= GOOD_THRESHOLD) return "Healthy";
  if (score >= 70) return "OK";
  if (score >= BAD_THRESHOLD) return "Caution";
  return "Needs attention";
}

const TONE_BAR: Record<Tone, string> = {
  good: "bg-emerald-400",
  bad: "bg-red-400",
  neutral: "bg-amber-400",
};

const TONE_TEXT: Record<Tone, string> = {
  good: "text-emerald-400",
  bad: "text-red-400",
  neutral: "text-amber-400",
};

// Stable color per breakdown component, used by the composition bar legend.
const COMPONENT_FILL: Record<string, string> = {
  "On-time rate": "bg-sky-400",
  "Time Debt": "bg-rose-400",
  "Late items": "bg-amber-400",
  Velocity: "bg-violet-400",
};

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function HealthPage() {
  const { items, loading, error } = useAllItems();

  const score = useMemo(
    () => (items ? computeHealthScore(items) : null),
    [items]
  );

  const tone: Tone = score ? scoreTone(score.total) : "neutral";

  const weakest = useMemo(() => {
    if (!score) return null;
    return [...score.breakdown].sort(
      (a, b) => a.earned / a.weight - b.earned / b.weight
    )[0];
  }, [score]);

  return (
    <>
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Health score · last 30 days
        </p>
        <div className="mt-2 flex items-end gap-6 flex-wrap">
          <div
            className={cn(
              "text-8xl font-bold tabular-nums leading-none",
              TONE_TEXT[tone]
            )}
          >
            {score?.total ?? "—"}
            <span className="text-3xl font-medium ml-2 text-slate-500">
              /100
            </span>
          </div>
          {score && (
            <div className="pb-2">
              <div
                className={cn(
                  "text-xl font-semibold uppercase tracking-wide",
                  TONE_TEXT[tone]
                )}
              >
                {gradeLabel(score.total)}
              </div>
              {weakest && (
                <div className="mt-1 text-sm text-slate-400 max-w-md">
                  {weakest.earned / weakest.weight >= 0.95
                    ? "All four components are in good shape."
                    : `Biggest drag: ${weakest.label.toLowerCase()} (${Math.round(weakest.earned)}/${weakest.weight} pts).`}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load."}
        </p>
      )}

      {/* Composition bar — total score as one filled bar; segments = points
          contributed by each component, gray = points lost. */}
      {score && (
        <section className="mb-8">
          <div className="flex h-7 w-full overflow-hidden rounded-full bg-white/5 border border-white/10">
            {score.breakdown.map((b) => {
              const widthPct = b.earned;
              const earned = Math.round(b.earned);
              const isFull = b.earned >= b.weight - 0.5;
              return (
                <div
                  key={b.label}
                  className={cn(
                    "h-full relative flex items-center justify-center transition-all",
                    COMPONENT_FILL[b.label] ?? "bg-slate-400"
                  )}
                  style={{ width: `${widthPct}%` }}
                  title={`${b.label}: ${earned}/${b.weight} pts${isFull ? " (full)" : ""}`}
                >
                  {widthPct >= 6 && (
                    <span className="text-[10px] font-bold text-black/70 tabular-nums">
                      {earned}
                    </span>
                  )}
                </div>
              );
            })}
            {(() => {
              const lost = Math.max(0, 100 - score.total);
              if (lost <= 0) return null;
              return (
                <div
                  className="h-full relative flex items-center justify-center bg-white/5"
                  style={{ width: `${lost}%` }}
                  title={`${lost} pts lost`}
                >
                  {lost >= 8 && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      −{lost}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-300">
            {score.breakdown.map((b) => (
              <div key={b.label} className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-block w-3 h-3 rounded-sm",
                    COMPONENT_FILL[b.label] ?? "bg-slate-400"
                  )}
                />
                <span className="font-medium text-white">{b.label}</span>
                <span className="text-slate-400 tabular-nums">
                  {Math.round(b.earned)}/{b.weight}
                </span>
              </div>
            ))}
            {score.total < 100 && (
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-sm bg-white/10 border border-white/15" />
                <span className="text-slate-400">Lost</span>
                <span className="text-slate-500 tabular-nums">
                  {100 - score.total}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Detailed per-component cards */}
      {score && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {score.breakdown.map((b) => (
            <BreakdownCard key={b.label} row={b} />
          ))}
        </section>
      )}
    </>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪟 BREAKDOWN CARD                                                    ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function BreakdownCard({ row }: { row: HealthBreakdownRow }) {
  const t = rowTone(row.earned, row.weight);
  const pct = (row.earned / row.weight) * 100;
  return (
    <div className="rounded-2xl glass-surface p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-base font-bold text-white">{row.label}</h3>
        <div className="text-right">
          <div
            className={cn(
              "text-stat-value",
              TONE_TEXT[t]
            )}
          >
            {Math.round(row.earned)}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            of {row.weight} pts
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="h-3 rounded-full bg-white/5 overflow-hidden">
          <div
            className={cn("h-full rounded-full", TONE_BAR[t])}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Actual
          </div>
          <div className={cn("text-sm font-semibold mt-0.5", TONE_TEXT[t])}>
            {row.actual}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Target
          </div>
          <div className="text-sm font-semibold text-slate-300 mt-0.5">
            {row.target}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">{row.hint}</p>
    </div>
  );
}
