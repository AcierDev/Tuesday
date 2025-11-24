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
  const isOverCapacity = current > max;
  
  let colorClass = "bg-emerald-500";
  if (isOverCapacity) colorClass = "bg-red-500";
  else if (percentage >= 80) colorClass = "bg-amber-500";

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
            isOverCapacity ? "text-red-600" : percentage >= 80 ? "text-amber-600" : "text-gray-700 dark:text-gray-300"
          )}>
            {current}
          </span>
          <span className="text-gray-400"> / {max}</span>
        </div>
      </div>
      <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500 ease-in-out", colorClass)}
          style={{ width: `${isOverCapacity ? 100 : percentage}%` }}
        />
      </div>
    </div>
  );
}
