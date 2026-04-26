"use client";

import { Button } from "@/components/ui/button";
import { PageToggle } from "@/components/ui/PageToggle";
import { ChevronRight, RotateCcw, Wand2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface ProductionPlanningHeaderProps {
  viewingNextWeek: boolean;
  hasScheduledOrders: boolean;
  onToggleWeek: () => void;
  onClearWeek: () => void;
  onAutoFill: () => void;
}

export function ProductionPlanningHeader({
  viewingNextWeek,
  hasScheduledOrders,
  onToggleWeek,
  onClearWeek,
  onAutoFill,
}: ProductionPlanningHeaderProps) {
  return (
    <div className="select-none bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-4 sm:flex-shrink-0">
            <div className="flex items-center gap-3 sm:min-w-[220px]">
              <span className="hidden sm:block h-7 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                Production Planner
              </h1>
            </div>

            <PageToggle currentPage="planner" />


            {/* Week toggle — sits in the left group, right after the page slider. */}
            <button
              type="button"
              onClick={onToggleWeek}
              aria-label={
                viewingNextWeek ? "Switch to This Week" : "Switch to Next Week"
              }
              className="group flex items-center gap-2 h-10 bg-gray-100 dark:bg-gray-800/60 rounded-full pl-4 pr-1.5 text-sm font-semibold ring-1 ring-inset ring-gray-200/60 dark:ring-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700/60 transition-colors"
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

          {/* Right group: action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-shrink-0">
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
      </div>
    </div>
  );
}
