"use client";

import { useMemo, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import { useGluedStats } from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const HISTORY_WEEKS = 26;
// Buffer past 26*7 so the API window comfortably covers the oldest Sunday
// even when "today" is mid-week.
const GLUED_LOOKBACK_DAYS = HISTORY_WEEKS * 7 + 14;

type WeekCell = {
  weekKey: string;
  squaresPerActiveDay: number;
  totalSquares: number;
  activeDays: number;
  startLabel: string;
};

type MonthGroup = {
  monthKey: string;
  monthLabel: string;
  weeks: WeekCell[];
};

interface WeekHistoryPopoverProps {
  currentWeekKey: string;
  thisWeekKey: string;
  onSelectWeek: (weekKey: string) => void;
  children: React.ReactNode;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 COMPONENT                                                         ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export function WeekHistoryPopover({
  currentWeekKey,
  thisWeekKey,
  onSelectWeek,
  children,
}: WeekHistoryPopoverProps) {
  const [open, setOpen] = useState(false);
  const today = laDayKey();
  const start = shiftDayKey(today, -(GLUED_LOOKBACK_DAYS - 1));
  const { data, loading, error } = useGluedStats({ start, end: today });

  const months = useMemo<MonthGroup[]>(() => {
    if (!data) return [];

    // Index per-day glued squares so we can grab any week-of-7 by Sunday key.
    const squaresByDay = new Map<string, number>();
    for (const b of data.buckets) squaresByDay.set(b.date, b.value);

    const weeks: WeekCell[] = [];
    for (let w = 0; w < HISTORY_WEEKS; w++) {
      const weekKey = shiftDayKey(thisWeekKey, -w * 7);
      let totalSquares = 0;
      let activeDays = 0;
      for (let d = 0; d < 7; d++) {
        const dayKey = shiftDayKey(weekKey, d);
        const squares = squaresByDay.get(dayKey) ?? 0;
        totalSquares += squares;
        if (squares > 0) activeDays += 1;
      }
      const squaresPerActiveDay =
        activeDays > 0 ? totalSquares / activeDays : 0;
      const [, m, d] = weekKey.split("-").map(Number);
      weeks.push({
        weekKey,
        squaresPerActiveDay,
        totalSquares,
        activeDays,
        startLabel: `${m}/${d}`,
      });
    }
    weeks.reverse(); // walk oldest → newest before grouping by month

    const groups = new Map<string, MonthGroup>();
    for (const wk of weeks) {
      const monthKey = wk.weekKey.slice(0, 7);
      let group = groups.get(monthKey);
      if (!group) {
        const monthLabel = new Date(`${wk.weekKey}T12:00:00`).toLocaleDateString(
          "en-US",
          { month: "short", year: "numeric" }
        );
        group = { monthKey, monthLabel, weeks: [] };
        groups.set(monthKey, group);
      }
      group.weeks.push(wk);
    }

    return Array.from(groups.values()).sort((a, b) =>
      b.monthKey.localeCompare(a.monthKey)
    );
  }, [data, thisWeekKey]);

  const maxAvg = useMemo(() => {
    let max = 0;
    for (const g of months) {
      for (const w of g.weeks) {
        if (w.squaresPerActiveDay > max) max = w.squaresPerActiveDay;
      }
    }
    return max;
  }, [months]);

  const todayKey = laDayKey();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[320px] p-0 max-h-[70vh] overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-gray-200/70 dark:border-gray-800/80">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Week history
          </p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Pick a week to view
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-3 py-3 space-y-4">
          {(loading || error) && (
            <p className="text-xs text-slate-400 px-1">
              {loading ? "Loading…" : "Failed to load history."}
            </p>
          )}
          {!loading && !error && months.length === 0 && (
            <p className="text-xs text-slate-400 px-1">No history yet.</p>
          )}
          {months.map((group) => (
            <div key={group.monthKey}>
              <p className="px-1 mb-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                {group.monthLabel}
              </p>
              <div className="flex gap-1.5">
                {group.weeks.map((wk) => {
                  const isCurrent = wk.weekKey === currentWeekKey;
                  const isThisWeek = wk.weekKey === thisWeekKey;
                  const isFuture = wk.weekKey > todayKey;
                  const avgDisplay = Math.round(wk.squaresPerActiveDay);
                  return (
                    <button
                      key={wk.weekKey}
                      type="button"
                      onClick={() => {
                        onSelectWeek(wk.weekKey);
                        setOpen(false);
                      }}
                      title={
                        wk.activeDays > 0
                          ? `Week of ${wk.startLabel} — ${avgDisplay} sq/day avg over ${wk.activeDays} day${wk.activeDays === 1 ? "" : "s"} (${wk.totalSquares} total)`
                          : `Week of ${wk.startLabel} — no glued days`
                      }
                      className={cn(
                        "group flex flex-col items-stretch min-w-0 rounded-md border text-left transition-colors",
                        isThisWeek ? "flex-[1.4]" : "flex-1",
                        isCurrent
                          ? "border-blue-500/70 ring-2 ring-blue-500/30"
                          : "border-gray-200/70 dark:border-gray-800/80 hover:border-blue-400/60 dark:hover:border-blue-400/40",
                        isFuture && "opacity-50"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 rounded-t-[5px]",
                          intensityClass(wk.squaresPerActiveDay, maxAvg)
                        )}
                      />
                      <span className="px-1.5 pt-1 pb-1.5">
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 leading-none">
                          {wk.startLabel}
                        </span>
                        <span className="mt-1 flex items-baseline justify-between gap-1">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-none">
                            {avgDisplay}
                          </span>
                          {isThisWeek && (
                            <span className="text-[9px] uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400">
                              now
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function intensityClass(value: number, max: number): string {
  if (value === 0) return "bg-gray-200/70 dark:bg-gray-800/70";
  const ratio = value / Math.max(max, 1);
  if (ratio < 0.25) return "bg-emerald-900";
  if (ratio < 0.5) return "bg-emerald-700";
  if (ratio < 0.75) return "bg-emerald-500";
  return "bg-emerald-400";
}
