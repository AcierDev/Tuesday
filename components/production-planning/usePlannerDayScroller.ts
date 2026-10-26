"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";

import type { DayName } from "@/typings/types";
import { DAYS_FOLDED_INTO_MONDAY } from "@/components/production-planning/planner-config";
import { dayKeyToLocalDate } from "@/components/production-planning/planner-dates";

// Only the active day allows vertical scroll on mobile. A column has to be
// ~fully snapped (this visible fraction) before it becomes scrollable.
const ACTIVE_DAY_VISIBILITY_THRESHOLD = 0.9;

type PlannerDayScrollerOptions = {
  laTodayKey: string;
  currentWeekKey: string;
  viewingNextWeek: boolean;
  viewingPastWeek: boolean;
};

// Mobile snap-scroller state for the day columns: which column is today,
// centering it on mount, and which column is currently snapped into view.
export function usePlannerDayScroller({
  laTodayKey,
  currentWeekKey,
  viewingNextWeek,
  viewingPastWeek,
}: PlannerDayScrollerOptions) {
  // Today's column gets centered on mount in the mobile snap-scroller. Sat/Sun
  // fold into Monday's column to match the display rule. Computed in
  // useEffect (not useMemo) so the highlighted column is only set after
  // hydration; the weekday is the LA day's, and follows midnight rollover.
  const [todayColumnDay, setTodayColumnDay] = useState<DayName | null>(null);
  useEffect(() => {
    const dayName = format(dayKeyToLocalDate(laTodayKey), "EEEE") as DayName;
    setTodayColumnDay(
      DAYS_FOLDED_INTO_MONDAY.includes(dayName) ? "Monday" : dayName
    );
  }, [laTodayKey]);

  // Scroller node — driven by a ref callback so the IntersectionObserver
  // effect below + the centering effect can both react to mount/unmount.
  const [scrollerNode, setScrollerNode] = useState<HTMLDivElement | null>(null);
  const scrollerRefCallback = useCallback(
    (node: HTMLDivElement | null) => setScrollerNode(node),
    []
  );

  // Center today's column. Runs once per (week, today) tuple so a re-render
  // (item placed, drag, etc.) doesn't yank the user back. Driven by useEffect
  // rather than the ref callback because, with AnimatePresence mode="wait",
  // the new scroller mounts AFTER the old finishes exiting — useEffect picks
  // that up via scrollerNode + currentWeekKey changing.
  const centeredKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!scrollerNode) {
      // AnimatePresence mode="wait" unmounts the scroller on week toggle.
      // Reset so the next (fresh) node re-centers — without this, toggling
      // away and back leaves the new node stuck at scrollLeft=0 (Sunday on
      // mobile snap-x), which looks like the week failed to load.
      centeredKeyRef.current = null;
      return;
    }
    if (!todayColumnDay || viewingNextWeek || viewingPastWeek) return;
    const key = `${currentWeekKey}|${todayColumnDay}`;
    if (centeredKeyRef.current === key) return;
    let cancelled = false;
    // rAF lets the snap-scroller's layout settle before we measure.
    const rafId = requestAnimationFrame(() => {
      if (cancelled) return;
      const todayEl = scrollerNode.querySelector<HTMLElement>(
        `[data-today-column="true"]`
      );
      if (!todayEl) return;
      centeredKeyRef.current = key;
      const target =
        todayEl.offsetLeft -
        (scrollerNode.clientWidth - todayEl.clientWidth) / 2;
      scrollerNode.scrollLeft = Math.max(0, target);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [
    scrollerNode,
    todayColumnDay,
    viewingNextWeek,
    viewingPastWeek,
    currentWeekKey,
  ]);

  // Tracks which day column is currently snapped into the mobile viewport.
  // Only the active day allows vertical scroll on mobile — so swiping between
  // days can't accidentally drag the next day's list down. Mid-swipe both
  // columns stay locked. Desktop ignores this (always scrolls).
  const [activeDayName, setActiveDayName] = useState<DayName | null>(null);
  useEffect(() => {
    if (!scrollerNode) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= ACTIVE_DAY_VISIBILITY_THRESHOLD) {
            const day = entry.target.getAttribute(
              "data-day-column"
            ) as DayName | null;
            if (day) setActiveDayName(day);
            break;
          }
        }
      },
      { root: scrollerNode, threshold: [0, 0.5, 0.9, 1] }
    );
    const dayEls =
      scrollerNode.querySelectorAll<HTMLElement>("[data-day-column]");
    dayEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [scrollerNode, currentWeekKey]);

  return { todayColumnDay, scrollerRefCallback, activeDayName };
}
