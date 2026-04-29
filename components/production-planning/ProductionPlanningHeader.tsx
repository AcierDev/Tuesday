"use client";

import { useEffect, useRef, useState } from "react";
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

// Lead-in for the chip animation. The actual week swap is heavy (re-renders
// every card), so we flip the chip's visual state immediately and defer the
// real swap until after the slide+rotate has had time to start, otherwise
// the synchronous re-render eats the first ~150ms of the transition.
const TOGGLE_ANIMATION_MS = 240;

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

  // Local visual state for the chip. We flip it eagerly on click so the
  // slide/rotate animation starts on the same frame, then schedule the real
  // onToggleWeek a tick later. Re-syncs to the prop in case the parent
  // changes the week for other reasons (e.g. external nav).
  const [visualNextWeek, setVisualNextWeek] = useState(viewingNextWeek);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVisualNextWeek(viewingNextWeek);
  }, [viewingNextWeek]);

  useEffect(() => {
    return () => {
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
    };
  }, []);

  const handleToggleWeek = () => {
    if (pendingTimer.current) return; // ignore mid-animation re-clicks
    setVisualNextWeek((v) => !v);
    pendingTimer.current = setTimeout(() => {
      pendingTimer.current = null;
      onToggleWeek();
    }, TOGGLE_ANIMATION_MS);
  };
  return (
    <div className="select-none bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 lg:gap-4 py-2 lg:py-3">
          <div className="flex items-center justify-between lg:justify-start gap-2 sm:gap-4 lg:flex-shrink-0">
            <div className="flex items-center gap-3 sm:min-w-[220px]">
              <span className="hidden sm:block h-7 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
              <h1 className="heading-tool">
                Production Planner
              </h1>
            </div>

            <div className="hidden lg:flex items-center gap-2">
              <PageToggle currentPage="planner" />
              <div className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800/60 p-1 ring-1 ring-inset ring-gray-200/60 dark:ring-gray-700/60">
                <button
                  type="button"
                  onClick={handleToggleWeek}
                  aria-label={
                    visualNextWeek
                      ? "Switch to This Week"
                      : "Switch to Next Week"
                  }
                  className="group flex items-center gap-1.5 h-8 pl-3 pr-1 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white/70 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <span className="relative inline-block w-[72px] h-5 overflow-hidden text-left">
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span
                        key={visualNextWeek ? "next" : "this"}
                        initial={{ y: visualNextWeek ? 16 : -16, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: visualNextWeek ? -16 : 16, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="absolute inset-0"
                      >
                        {visualNextWeek ? "Next Week" : "This Week"}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <motion.span
                    animate={{ rotate: visualNextWeek ? 180 : 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white dark:bg-gray-700 shadow-sm"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </motion.span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 sm:gap-3 lg:hidden">
            <HistoricalAverageBadge />
            <div className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800/60 p-1 ring-1 ring-inset ring-gray-200/60 dark:ring-gray-700/60">
              <button
                type="button"
                onClick={handleToggleWeek}
                aria-label={
                  visualNextWeek
                    ? "Switch to This Week"
                    : "Switch to Next Week"
                }
                className="group flex items-center gap-1.5 h-8 pl-3 pr-1 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white/70 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="relative inline-block w-[72px] h-5 overflow-hidden text-left">
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={visualNextWeek ? "next-mobile" : "this-mobile"}
                      initial={{ y: visualNextWeek ? 16 : -16, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: visualNextWeek ? -16 : 16, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="absolute inset-0"
                    >
                      {visualNextWeek ? "Next Week" : "This Week"}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <motion.span
                  animate={{ rotate: visualNextWeek ? 180 : 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white dark:bg-gray-700 shadow-sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </motion.span>
              </button>
            </div>
          </div>

          {/* Right group: action buttons (desktop only) */}
          <div className="hidden lg:flex items-center gap-2 sm:flex-shrink-0">
            <HistoricalAverageBadge />
            <Button
              size="sm"
              onClick={onAutoFill}
              className="h-9 rounded-full bg-blue-500/25 hover:bg-blue-500/40 text-blue-800 dark:text-white font-semibold ring-1 ring-inset ring-blue-500/40 dark:ring-blue-400/30 backdrop-blur-sm shadow-sm shadow-blue-500/15 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-500/25 active:translate-y-0 dark:bg-blue-500/20 dark:hover:bg-blue-500/30"
            >
              <Wand2 className="h-4 w-4 mr-1.5" />
              Auto-plan
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  disabled={!hasScheduledOrders}
                  className="h-9 rounded-full bg-red-500/25 hover:bg-red-500/40 text-red-800 dark:text-white font-semibold ring-1 ring-inset ring-red-500/40 dark:ring-red-400/30 backdrop-blur-sm shadow-sm shadow-red-500/15 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-red-500/25 active:translate-y-0 dark:bg-red-500/20 dark:hover:bg-red-500/30 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
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
