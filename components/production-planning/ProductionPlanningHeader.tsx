"use client";

import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Wand2,
} from "lucide-react";
import { format } from "date-fns";

interface ProductionPlanningHeaderProps {
  currentWeekStart: Date;
  currentWeekEnd: Date;
  isCurrentWeek: boolean;
  hasScheduledOrders: boolean;
  stats: {
    overdue: { orders: number; blocks: number };
    thisWeek: { orders: number; blocks: number };
    nextWeek: { orders: number; blocks: number };
    total: { orders: number; blocks: number };
  };
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onClearWeek: () => void;
  onAutoFillThisWeek: () => void;
  onAutoFillNextWeek: () => void;
}

export function ProductionPlanningHeader({
  currentWeekStart,
  currentWeekEnd,
  isCurrentWeek,
  hasScheduledOrders,
  stats,
  onPreviousWeek,
  onNextWeek,
  onToday,
  onClearWeek,
  onAutoFillThisWeek,
  onAutoFillNextWeek,
}: ProductionPlanningHeaderProps) {
  return (
    <div className="flex flex-col gap-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 sticky top-0 z-20 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Week Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Button variant="ghost" size="sm" onClick={onPreviousWeek} className="h-7 w-7 p-0 hover:bg-white dark:hover:bg-gray-700 shadow-sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 text-sm font-semibold tabular-nums min-w-[140px] text-center">
              {format(currentWeekStart, "MMM d")} – {format(currentWeekEnd, "MMM d, yyyy")}
            </div>
            <Button variant="ghost" size="sm" onClick={onNextWeek} className="h-7 w-7 p-0 hover:bg-white dark:hover:bg-gray-700 shadow-sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {!isCurrentWeek && (
            <Button variant="outline" size="sm" onClick={onToday} className="h-9">
              Today
            </Button>
          )}
        </div>

        {/* HUD Stats */}
        <div className="flex items-center gap-6 text-sm overflow-x-auto">
           <div className="flex flex-col items-end whitespace-nowrap">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Overdue</span>
              <span className="font-bold text-red-600 text-lg leading-none">{stats.overdue.orders} <span className="text-gray-400 font-normal text-xs">({stats.overdue.blocks})</span></span>
           </div>
           <div className="w-px h-8 bg-gray-200 dark:bg-gray-800" />
           <div className="flex flex-col items-end whitespace-nowrap">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">This Week</span>
              <span className="font-bold text-amber-600 text-lg leading-none">{stats.thisWeek.orders} <span className="text-gray-400 font-normal text-xs">({stats.thisWeek.blocks})</span></span>
           </div>
           <div className="w-px h-8 bg-gray-200 dark:bg-gray-800" />
           <div className="flex flex-col items-end whitespace-nowrap">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Unscheduled</span>
              <span className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-none">{stats.total.orders} <span className="text-gray-400 font-normal text-xs">({stats.total.blocks})</span></span>
           </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-stretch rounded-md border border-primary/40 overflow-hidden">
            <span className="flex items-center gap-1.5 px-3 text-sm font-medium text-primary bg-primary/5">
              <Wand2 className="h-4 w-4" />
              Auto-fill
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onAutoFillThisWeek}
              className="rounded-none border-l border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            >
              This Week
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onAutoFillNextWeek}
              className="rounded-none border-l border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            >
              Next Week
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearWeek}
            disabled={!hasScheduledOrders}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Clear Week
          </Button>
        </div>
      </div>
    </div>
  );
}
