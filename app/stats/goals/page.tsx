"use client";

import { useEffect, useMemo, useState } from "react";

import { laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import {
  bucketCompletionsByDay,
  computeOnTimeStats,
} from "@/lib/production-metrics";
import { useAllItems } from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const STORAGE_KEY = "stats.goals.v1";
const RANGE_DAYS = 30;

type Goals = {
  weeklyThroughput: number;
  onTimePct: number;
  maxLeadDays: number;
};

const DEFAULT_GOALS: Goals = {
  weeklyThroughput: 50,
  onTimePct: 95,
  maxLeadDays: 14,
};

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function GoalsPage() {
  const { items, loading, error } = useAllItems();
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setGoals({ ...DEFAULT_GOALS, ...JSON.parse(raw) });
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    } catch {
      // storage may be unavailable
    }
  }, [goals]);

  const actuals = useMemo(() => {
    if (!items) return null;
    const today = laDayKey();
    const start = shiftDayKey(today, -(RANGE_DAYS - 1));
    const buckets = bucketCompletionsByDay(items, start, today);
    const total = buckets.reduce((s, b) => s + b.value, 0);
    const weeklyAvg = (total / RANGE_DAYS) * 7;
    const onTime = computeOnTimeStats(items, start, today);
    return {
      weeklyThroughput: weeklyAvg,
      onTimePct: onTime.onTimePct,
    };
  }, [items]);

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Goals · last 30 days
        </p>
        <h2 className="mt-1 heading-page">
          Set targets, track progress
        </h2>
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load."}
        </p>
      )}

      <div className="space-y-4">
        <GoalRow
          label="Weekly throughput"
          unit="items / week"
          target={goals.weeklyThroughput}
          actual={actuals?.weeklyThroughput ?? null}
          higherIsBetter
          onChange={(v) =>
            setGoals((g) => ({ ...g, weeklyThroughput: v }))
          }
        />
        <GoalRow
          label="On-time rate"
          unit="%"
          target={goals.onTimePct}
          actual={actuals?.onTimePct ?? null}
          higherIsBetter
          onChange={(v) => setGoals((g) => ({ ...g, onTimePct: v }))}
        />
        <GoalRow
          label="Max lead time"
          unit="days"
          target={goals.maxLeadDays}
          actual={null}
          higherIsBetter={false}
          onChange={(v) => setGoals((g) => ({ ...g, maxLeadDays: v }))}
          actualHint="See Lead Time page"
        />
      </div>
    </>
  );
}

interface GoalRowProps {
  label: string;
  unit: string;
  target: number;
  actual: number | null;
  higherIsBetter: boolean;
  onChange: (v: number) => void;
  actualHint?: string;
}

function GoalRow({
  label,
  unit,
  target,
  actual,
  higherIsBetter,
  onChange,
  actualHint,
}: GoalRowProps) {
  const pct = actual === null
    ? 0
    : higherIsBetter
      ? Math.min(100, (actual / target) * 100)
      : Math.min(100, (target / Math.max(actual, 0.01)) * 100);
  const met = actual === null
    ? false
    : higherIsBetter
      ? actual >= target
      : actual <= target;

  return (
    <section className="rounded-2xl glass-surface p-5">
      <div className="flex items-baseline justify-between mb-3 gap-4 flex-wrap">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
          {label}
        </h3>
        <div className="flex items-center gap-3 text-sm">
          <label className="text-slate-400">target</label>
          <input
            type="number"
            value={target}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="w-24 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-right tabular-nums text-white"
          />
          <span className="text-slate-400">{unit}</span>
        </div>
      </div>
      <div className="flex items-baseline justify-between mb-1 text-xs text-slate-400">
        <span>
          actual:{" "}
          <span className="text-white tabular-nums font-semibold">
            {actual === null ? actualHint ?? "—" : actual.toFixed(1)}
          </span>
        </span>
        <span className={cn(met ? "text-emerald-500" : "text-amber-400")}>
          {actual === null ? "" : met ? "On target" : "Below target"}
        </span>
      </div>
      <div className="h-3 rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full",
            met ? "bg-emerald-400" : "bg-amber-400"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}
