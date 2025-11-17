"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/utils/functions";

interface StatsCardProps {
  title: string;
  orders: number;
  blocks: number;
  variant?: "overdue" | "thisWeek" | "nextWeek" | "total";
}

const variantStyles = {
  overdue: {
    accent: "border-l-red-500",
    text: "text-red-600 dark:text-red-400",
  },
  thisWeek: {
    accent: "border-l-amber-500",
    text: "text-amber-600 dark:text-amber-400",
  },
  nextWeek: {
    accent: "border-l-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  total: {
    accent: "border-l-blue-500",
    text: "text-blue-600 dark:text-blue-400",
  },
};

export function StatsCard({
  title,
  orders,
  blocks,
  variant = "total",
}: StatsCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        "border-l-4 transition-all hover:shadow-sm",
        styles.accent,
        "bg-white dark:bg-gray-900"
      )}
    >
      <div className="p-4">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {title}
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn("text-2xl font-bold tabular-nums", styles.text)}>
            {blocks.toLocaleString()}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({orders})
          </span>
        </div>
      </div>
    </Card>
  );
}

