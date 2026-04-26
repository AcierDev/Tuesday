"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { ChevronRight, RotateCcw, Wand2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface ProductionPlanningHeaderProps {
  viewingNextWeek: boolean;
  hasScheduledOrders: boolean;
  stats: {
    overdue: { orders: number; blocks: number };
    thisWeek: { orders: number; blocks: number };
    nextWeek: { orders: number; blocks: number };
    total: { orders: number; blocks: number };
  };
  onToggleWeek: () => void;
  onClearWeek: () => void;
  onAutoFill: () => void;
}

const PAGE_TOGGLE_VALUES = ["orders", "planner"] as const;
const PAGE_TOGGLE_HREF: Record<(typeof PAGE_TOGGLE_VALUES)[number], string> = {
  orders: "/orders",
  planner: "/production-planning",
};

export function ProductionPlanningHeader({
  viewingNextWeek,
  hasScheduledOrders,
  stats,
  onToggleWeek,
  onClearWeek,
  onAutoFill,
}: ProductionPlanningHeaderProps) {
  const router = useRouter();

  return (
    <div className="select-none bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-20">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 py-3">
          {/* Week Toggle — flips between This Week / Next Week. */}
          <div className="flex items-center gap-3 sm:flex-shrink-0">
            <span className="hidden sm:block h-7 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
            <button
              type="button"
              onClick={onToggleWeek}
              aria-label={
                viewingNextWeek ? "Switch to This Week" : "Switch to Next Week"
              }
              className="group flex items-center gap-2 bg-gray-100 dark:bg-gray-800/60 rounded-full pl-4 pr-1.5 py-1 text-sm font-semibold ring-1 ring-inset ring-gray-200/60 dark:ring-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700/60 transition-colors"
            >
              <span className="relative inline-block w-[80px] h-5 overflow-hidden text-left">
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    key={viewingNextWeek ? "next" : "this"}
                    initial={{ y: viewingNextWeek ? 16 : -16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: viewingNextWeek ? -16 : 16, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="absolute inset-0"
                  >
                    {viewingNextWeek ? "Next Week" : "This Week"}
                  </motion.span>
                </AnimatePresence>
              </span>
              <motion.span
                animate={{ rotate: viewingNextWeek ? 180 : 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white dark:bg-gray-700 shadow-sm"
              >
                <ChevronRight className="h-4 w-4" />
              </motion.span>
            </button>
          </div>

          {/* Page slider — switches between Orders and Planner. */}
          <div className="flex justify-center sm:flex-1 sm:min-w-0">
            <ToggleGroup
              type="single"
              value="planner"
              onValueChange={(value) => {
                if (!value || value === "planner") return;
                router.push(PAGE_TOGGLE_HREF[value as "orders" | "planner"]);
              }}
              className="inline-flex flex-wrap justify-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800/60 p-1 ring-1 ring-inset ring-gray-200/60 dark:ring-gray-700/60"
            >
              {PAGE_TOGGLE_VALUES.map((value) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  aria-label={`Go to ${value} page`}
                  className="h-8 px-4 rounded-full text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-gray-200 hover:bg-transparent data-[state=on]:bg-white data-[state=on]:text-gray-900 data-[state=on]:shadow-sm dark:data-[state=on]:bg-gray-700 dark:data-[state=on]:text-white"
                >
                  {value === "orders" ? "Orders" : "Planner"}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onAutoFill}
              className="rounded-full border-primary/40 text-primary hover:bg-primary/10 hover:text-primary transition-transform duration-150 ease-out hover:scale-[1.06]"
            >
              <Wand2 className="h-4 w-4 mr-1.5" />
              Auto-plan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearWeek}
              disabled={!hasScheduledOrders}
              className="rounded-full border-red-300/70 text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:border-red-900 dark:hover:bg-red-950/30 transition-transform duration-150 ease-out hover:scale-[1.06] disabled:hover:scale-100"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Clear Week
            </Button>
          </div>
        </div>

        {/* HUD Stats — slim row below the main toolbar. */}
        <div className="flex items-center justify-end gap-6 text-sm pb-2 -mt-1 overflow-x-auto">
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
              Overdue
            </span>
            <span className="font-bold text-red-600 text-base leading-none">
              {stats.overdue.orders}
              <span className="text-gray-400 font-normal text-xs ml-1">
                ({stats.overdue.blocks})
              </span>
            </span>
          </div>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-800" />
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
              This Week
            </span>
            <span className="font-bold text-amber-600 text-base leading-none">
              {stats.thisWeek.orders}
              <span className="text-gray-400 font-normal text-xs ml-1">
                ({stats.thisWeek.blocks})
              </span>
            </span>
          </div>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-800" />
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
              Unscheduled
            </span>
            <span className="font-bold text-gray-900 dark:text-gray-100 text-base leading-none">
              {stats.total.orders}
              <span className="text-gray-400 font-normal text-xs ml-1">
                ({stats.total.blocks})
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
