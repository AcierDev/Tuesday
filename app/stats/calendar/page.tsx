"use client";

import { useMemo } from "react";

import { laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import { bucketCompletionsByDay } from "@/lib/production-metrics";
import { useAllItems } from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const RANGE_DAYS = 365;
const CELL_PX = 13;
const CELL_GAP_PX = 2;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PAGE                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function CalendarPage() {
  const { items, loading, error } = useAllItems();

  const data = useMemo(() => {
    if (!items) return null;
    const today = laDayKey();
    // Align start to a Sunday so the calendar grid aligns properly.
    let start = shiftDayKey(today, -(RANGE_DAYS - 1));
    const [y, m, d] = start.split("-").map(Number);
    const dow = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
    if (dow !== 0) start = shiftDayKey(start, -dow);
    const buckets = bucketCompletionsByDay(items, start, today);
    const max = Math.max(0, ...buckets.map((b) => b.value));
    return { buckets, max, start };
  }, [items]);

  // Build week columns of 7 day cells each.
  const columns = useMemo(() => {
    if (!data) return [];
    const cols: { date: string; value: number }[][] = [];
    let current: { date: string; value: number }[] = [];
    for (const b of data.buckets) {
      current.push(b);
      if (current.length === 7) {
        cols.push(current);
        current = [];
      }
    }
    if (current.length > 0) cols.push(current);
    return cols;
  }, [data]);

  const monthMarkers = useMemo(() => {
    if (!data) return [];
    const markers: { colIndex: number; label: string }[] = [];
    let lastMonth = -1;
    columns.forEach((col, i) => {
      const first = col[0];
      if (!first) return;
      const month = parseInt(first.date.slice(5, 7), 10);
      if (month !== lastMonth) {
        markers.push({
          colIndex: i,
          label: new Date(`${first.date}T12:00:00`).toLocaleDateString("en-US", {
            month: "short",
          }),
        });
        lastMonth = month;
      }
    });
    return markers;
  }, [columns, data]);

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Activity calendar · last year
        </p>
        <h2 className="mt-1 text-3xl font-bold text-white">
          {data
            ? `${data.buckets.reduce((s, b) => s + b.value, 0)} items shipped`
            : "—"}
        </h2>
      </header>

      {(loading || error) && (
        <p className="text-xs text-slate-400 mb-4">
          {loading ? "Loading…" : "Failed to load."}
        </p>
      )}

      <section className="rounded-2xl glass-surface p-5 overflow-x-auto">
        {!data ? (
          <p className="text-sm text-slate-400">—</p>
        ) : (
          <>
            {/* Month labels row */}
            <div
              className="relative h-4 mb-1"
              style={{ width: columns.length * (CELL_PX + CELL_GAP_PX) }}
            >
              {monthMarkers.map((m) => (
                <span
                  key={m.colIndex}
                  className="absolute text-[10px] uppercase tracking-wider text-slate-400"
                  style={{ left: m.colIndex * (CELL_PX + CELL_GAP_PX) }}
                >
                  {m.label}
                </span>
              ))}
            </div>
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${columns.length}, ${CELL_PX}px)`,
                gridTemplateRows: `repeat(7, ${CELL_PX}px)`,
                gridAutoFlow: "column",
                gap: `${CELL_GAP_PX}px`,
              }}
            >
              {columns.flatMap((col) =>
                col.map((cell) => (
                  <div
                    key={cell.date}
                    title={`${cell.date}: ${cell.value} item${cell.value === 1 ? "" : "s"}`}
                    className={cn(
                      "rounded-[2px]",
                      colorForIntensity(cell.value, data.max)
                    )}
                  />
                ))
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-400">
              Less
              <div className={cn("rounded-[2px]", colorForIntensity(0, 1))} style={{ width: CELL_PX, height: CELL_PX }} />
              <div className={cn("rounded-[2px]", colorForIntensity(1, 4))} style={{ width: CELL_PX, height: CELL_PX }} />
              <div className={cn("rounded-[2px]", colorForIntensity(2, 4))} style={{ width: CELL_PX, height: CELL_PX }} />
              <div className={cn("rounded-[2px]", colorForIntensity(3, 4))} style={{ width: CELL_PX, height: CELL_PX }} />
              <div className={cn("rounded-[2px]", colorForIntensity(4, 4))} style={{ width: CELL_PX, height: CELL_PX }} />
              More
            </div>
          </>
        )}
      </section>
    </>
  );
}

function colorForIntensity(value: number, max: number): string {
  if (value === 0) return "bg-white/5";
  const ratio = value / Math.max(max, 1);
  if (ratio < 0.25) return "bg-emerald-900";
  if (ratio < 0.5) return "bg-emerald-700";
  if (ratio < 0.75) return "bg-emerald-500";
  return "bg-emerald-400";
}
