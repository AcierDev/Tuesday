"use client";

import { cn } from "@/utils/functions";
import { Progress } from "@/components/ui/progress";

interface CapacityIndicatorProps {
  current: number;
  max: number;
  label?: string;
}

export function CapacityIndicator({ current, max, label }: CapacityIndicatorProps) {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  const isTargetMet = current >= max;
  
  let colorClass = "bg-red-500";
  if (isTargetMet) colorClass = "bg-emerald-500";
  else if (percentage >= 90) colorClass = "bg-amber-500";

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-1.5">
        {label && (
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {label}
          </span>
        )}
        <div className="text-xs tabular-nums">
          <span className={cn(
            "font-semibold",
            isTargetMet ? "text-emerald-600" : percentage >= 90 ? "text-amber-600" : "text-red-600"
          )}>
            {current}
          </span>
          <span className="text-gray-400"> / {max}</span>
        </div>
      </div>
      <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500 ease-in-out", colorClass)}
          style={{ width: `${current > max ? 100 : percentage}%` }}
        />
      </div>
    </div>
  );
}
