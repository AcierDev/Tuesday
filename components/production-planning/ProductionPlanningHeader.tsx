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
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight bg-gradient-to-br from-gray-900 to-blue-700 dark:from-white dark:to-blue-300 bg-clip-text text-transparent [-webkit-text-fill-color:transparent] [forced-color-adjust:none]">
                Production Planner
              </h1>
            </div>

            <PageToggle currentPage="planner" />


            {/* Week toggle — outer ring matches PageToggle's wrapper exactly
                (p-1 + inner h-8 = 40px) so both sit at the same level. */}
            <div className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800/60 p-1 ring-1 ring-inset ring-gray-200/60 dark:ring-gray-700/60">
              <button
                type="button"
                onClick={onToggleWeek}
                aria-label={
                  viewingNextWeek
                    ? "Switch to This Week"
                    : "Switch to Next Week"
                }
                className="group flex items-center gap-1.5 h-8 pl-3 pr-1 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white/70 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="relative inline-block w-[72px] h-5 overflow-hidden text-left">
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
          </div>

          {/* Right group: action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-shrink-0">
            <Button
              size="sm"
              onClick={onAutoFill}
              className="h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-600/30 active:translate-y-0 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <Wand2 className="h-4 w-4 mr-1.5" />
              Auto-plan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearWeek}
              disabled={!hasScheduledOrders}
              className="h-9 rounded-full bg-white/60 dark:bg-blue-500/5 border-blue-200/70 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 dark:hover:bg-blue-500/15 dark:hover:text-blue-200 transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
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
