"use client";

import { memo, useEffect, useRef } from "react";

import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🫧 CELL OVERLAY                                                      ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Renders the green overlay for a glued cell. Captures the animation class +
// delay at MOUNT time so subsequent re-renders of the parent (which happen
// often in the planner — every drag, every order update) can't cancel the
// in-flight CSS animation by stripping the class.
const CellOverlay = memo(function CellOverlay({
  initialAnimClass,
  initialDelayMs,
}: {
  initialAnimClass: string;
  initialDelayMs: number;
}) {
  const frozen = useRef({
    cls: initialAnimClass,
    delay: initialDelayMs,
  });
  const { cls, delay } = frozen.current;
  return (
    <span
      aria-hidden
      className={cn("absolute inset-0 bg-emerald-500", cls)}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
});

interface CapacityIndicatorProps {
  current: number;
  max: number;
  // Threshold at which the value is considered "good" and turns green. The
  // bar still scales against `max` (the displayed denominator) — this only
  // controls the color stop, not the geometry.
  greenThreshold?: number;
  label?: string;
  // Squares already glued for this day. When > 0, prefixes the readout in
  // green (e.g. "160 / 986 / 1000") and overlays a green progress bar on top
  // of the assigned-squares bar.
  glued?: number;
  // For past days, anything not glued is assumed to have moved to a future
  // day, so the assigned-vs-glued split is meaningless. Renders as
  // "<glued> / <max>" with a green-only bar.
  gluedOnly?: boolean;
  // Today's column drops the "/ max" denominator since the painter knows the
  // daily quota — the live numbers are what matters.
  isCurrentDay?: boolean;
}

const CAPACITY_CELL_COUNT = 15;
const SNAKE_STAGGER_MS = 70;

export function CapacityIndicator({ current, max, glued = 0, gluedOnly = false, isCurrentDay = false, label }: CapacityIndicatorProps) {
  const gluedCells = Math.min(
    CAPACITY_CELL_COUNT,
    Math.round((glued / max) * CAPACITY_CELL_COUNT)
  );
  const plannedCells = Math.min(
    CAPACITY_CELL_COUNT,
    Math.round((current / max) * CAPACITY_CELL_COUNT)
  );
  // Today's column hints the green bar even before anything is glued so the
  // painter can see where progress will accumulate. Lights the first cell at
  // low opacity until real glued squares overtake it.
  const showZeroHint =
    gluedCells === 0 && isCurrentDay && !gluedOnly;

  // Track the last gluedCells we rendered so we can animate only the cells
  // that just flipped green. Single-cell increase plays a bubble pop on that
  // cell; multi-cell jump plays a staggered slide-right (snake) across the
  // batch. Past days don't animate — their data is historical.
  const prevGluedRef = useRef(gluedCells);
  const prevGlued = prevGluedRef.current;
  const batchSize = gluedCells - prevGlued;
  const animateBatch = batchSize > 0 && !gluedOnly;
  const isMultiBatch = batchSize > 1;
  useEffect(() => {
    prevGluedRef.current = gluedCells;
  }, [gluedCells]);

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-1.5">
        {label && (
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {label}
          </span>
        )}
        <div className="text-[15.6px] tabular-nums">
          {gluedOnly ? (
            <>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {glued}
              </span>
              {!isCurrentDay && (
                <span className="text-gray-400"> / {max}</span>
              )}
            </>
          ) : (
            <>
              {(glued > 0 || isCurrentDay) && (
                <>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {glued}
                  </span>
                  <span className="text-gray-400"> / </span>
                </>
              )}
              <span className="font-semibold text-blue-600 dark:text-blue-500">
                {current}
              </span>
              {!isCurrentDay && (
                <span className="text-gray-400"> / {max}</span>
              )}
            </>
          )}
        </div>
      </div>
      <div
        className="relative flex h-1.5 w-full rounded-full gap-[2px]"
        style={{ overflow: animateBatch && !isMultiBatch ? "visible" : "hidden" }}
      >
        {Array.from({ length: CAPACITY_CELL_COUNT }).map((_, i) => {
          const isGreen = i < gluedCells;
          let baseClass: string;
          if (gluedOnly) {
            baseClass = "bg-gray-200 dark:bg-gray-700";
          } else if (i < plannedCells) {
            baseClass = "bg-blue-400 dark:bg-blue-500";
          } else {
            baseClass = "bg-gray-200 dark:bg-gray-700";
          }
          const showHintSliver = showZeroHint && i === 0;
          const inBatch = animateBatch && i >= prevGlued && i < gluedCells;
          let overlayClass = "";
          let overlayDelay = 0;
          if (inBatch) {
            if (isMultiBatch) {
              overlayClass = "animate-capacity-snake";
              overlayDelay = (i - prevGlued) * SNAKE_STAGGER_MS;
            } else {
              overlayClass = "animate-capacity-bubble";
            }
          }
          return (
            <div
              key={i}
              className={cn(
                "relative flex-1 transition-colors duration-[600ms] ease-out",
                baseClass,
                inBatch && !isMultiBatch ? "overflow-visible" : "overflow-hidden"
              )}
              style={{ borderRadius: "2px" }}
            >
              {showHintSliver && (
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 bg-emerald-500"
                  style={{ width: 5 }}
                />
              )}
              {isGreen && (
                <CellOverlay
                  key={i}
                  initialAnimClass={overlayClass}
                  initialDelayMs={overlayDelay}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
