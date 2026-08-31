import React from "react";
import { RECENT_LABEL_WINDOW_HOURS } from "@/lib/shipping-labels/inventory";

interface RecentLabelIndicatorProps {
  isRecent: boolean;
}

export function RecentLabelIndicator({
  isRecent,
}: RecentLabelIndicatorProps) {
  if (!isRecent) return null;

  return (
    <span
      aria-label={`Label added in the last ${RECENT_LABEL_WINDOW_HOURS} hours`}
      className="rounded-full border border-emerald-300/70 bg-emerald-500/90 px-1.5 py-0.5 text-[8px] font-bold leading-none tracking-[0.12em] text-white shadow-[0_1px_5px_rgba(16,185,129,0.35)]"
    >
      NEW
    </span>
  );
}
