"use client";

import { Button } from "@/components/ui/button";
import { PageToggle } from "@/components/ui/PageToggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronRight, RotateCcw, Wand2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { HistoricalAverageBadge } from "./HistoricalAverageBadge";

interface ProductionPlanningHeaderProps {
  viewingNextWeek: boolean;
  hasScheduledOrders: boolean;
  scheduledItemCount?: number;
  onToggleWeek: () => void;
  onClearWeek: () => void;
  onAutoFill: () => void;
}

export function ProductionPlanningHeader({
  viewingNextWeek,
  hasScheduledOrders,
  scheduledItemCount,
  onToggleWeek,
  onClearWeek,
  onAutoFill,
}: ProductionPlanningHeaderProps) {
  const weekLabel = viewingNextWeek ? "next week" : "this week";
  return (
    <div className="select-none bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 py-3">
          <div className="flex items-center gap-2 sm:gap-4 sm:flex-shrink-0">
            <div className="flex items-center gap-3 sm:min-w-[220px]">
              <span className="hidden sm:block h-7 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
              <h1 className="heading-tool">
                Production Planner
              </h1>
            </div>

            <PageToggle currentPage="planner" />
          </div>

          {/* Center cluster: avg-squares badge sits left of the week toggle.
              On mobile it's pushed to the right so the row reads
              [title] [avg] [week-toggle]; on desktop it stays centered. */}
          <div className="flex items-center justify-end gap-2 sm:gap-3 sm:flex-1 sm:justify-center sm:min-w-0">
            <HistoricalAverageBadge />
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

          {/* Right group: action buttons (desktop only) */}
          <div className="hidden sm:flex items-center gap-2 sm:flex-shrink-0">
            <Button
              size="sm"
              onClick={onAutoFill}
              className="h-9 rounded-full bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-200 ring-1 ring-inset ring-blue-400/30 dark:ring-blue-400/25 backdrop-blur-sm shadow-sm shadow-blue-500/10 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-500/20 active:translate-y-0 dark:bg-blue-500/10 dark:hover:bg-blue-500/20"
            >
              <Wand2 className="h-4 w-4 mr-1.5" />
              Auto-plan
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  disabled={!hasScheduledOrders}
                  className="h-9 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-300 ring-1 ring-inset ring-red-400/30 dark:ring-red-400/25 backdrop-blur-sm shadow-sm shadow-red-500/10 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-red-500/20 active:translate-y-0 dark:bg-red-500/10 dark:hover:bg-red-500/20 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Clear Week
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear {weekLabel}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {scheduledItemCount && scheduledItemCount > 0
                      ? `This will unschedule all ${scheduledItemCount} item${scheduledItemCount === 1 ? "" : "s"} from ${weekLabel}. They'll move back to the unscheduled sidebar.`
                      : `This will unschedule everything from ${weekLabel}. Items will move back to the unscheduled sidebar.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onClearWeek}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Clear Week
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
