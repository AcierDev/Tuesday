"use client";

import { cn } from "@/utils/functions";
import { Progress } from "@/components/ui/progress";

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
}

const AMBER_FRACTION = 0.9;

export function CapacityIndicator({ current, max, greenThreshold, label, glued = 0, gluedOnly = false }: CapacityIndicatorProps) {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  const gluedPercentage = Math.min(100, Math.max(0, (glued / max) * 100));
  const greenAt = greenThreshold ?? max;
  const isTargetMet = current >= greenAt;
  const isNearTarget = current >= greenAt * AMBER_FRACTION;

  let colorClass = "bg-red-500";
  if (isTargetMet) colorClass = "bg-blue-500";
  else if (isNearTarget) colorClass = "bg-amber-500";

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-1.5">
        {label && (
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {label}
          </span>
        )}
        <div className="text-xs tabular-nums">
          {gluedOnly ? (
            <>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {glued}
              </span>
              <span className="text-gray-400"> / {max}</span>
            </>
          ) : (
            <>
              {glued > 0 && (
                <>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {glued}
                  </span>
                  <span className="text-gray-400"> / </span>
                </>
              )}
              <span className={cn(
                "font-semibold",
                isTargetMet ? "text-blue-600" : isNearTarget ? "text-amber-600" : "text-red-600"
              )}>
                {current}
              </span>
              <span className="text-gray-400"> / {max}</span>
            </>
          )}
        </div>
      </div>
      <div className="relative h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        {!gluedOnly && (
          <div
            className={cn("absolute inset-y-0 left-0 transition-all duration-500 ease-in-out", colorClass)}
            style={{ width: `${current > max ? 100 : percentage}%` }}
          />
        )}
        {(gluedOnly || glued > 0) && (
          <div
            className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-500 ease-in-out"
            style={{ width: `${glued > max ? 100 : gluedPercentage}%` }}
          />
        )}
      </div>
    </div>
  );
}
