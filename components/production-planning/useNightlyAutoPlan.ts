"use client";

import { useEffect, useRef } from "react";

import {
  ScheduleConflictError,
  useWeeklyScheduleStore,
} from "@/stores/useWeeklyScheduleStore";
import { laDayKey, msUntilNextLaHour } from "@/lib/debt-metrics";
import type { AutoPlanTrigger } from "@/components/production-planning/planner-dates";

// Nightly auto-plan: re-runs handleAutoFill at 8pm America/Los_Angeles every
// day so anything not glued today gets pulled forward (onto tomorrow onward)
// and any over-production rebalances the rest of the week. Client-side only —
// fires only when a planner tab is open at the trigger time; a server lease
// (/api/production-planning/nightly-auto-plan) lets exactly one tab run it.
const NIGHTLY_AUTO_PLAN_HOUR = 20; // 8pm LA
const NIGHTLY_AUTO_PLAN_BUFFER_MS = 500;
const NIGHTLY_AUTO_PLAN_LEASE_ENDPOINT =
  "/api/production-planning/nightly-auto-plan";
// Tabs that lose the lease reload schedules after the winner has had time to
// save, so every open planner shows tonight's plan.
const NIGHTLY_FOLLOWER_REFRESH_MS = 60_000;

// Nightly auto-plan tick at 8pm LA. Recursive setTimeout so each fire
// recomputes the next 20:00 LA as a zoned instant (DST-safe). Every open
// tab arms a timer, but only the tab that claims the day's server lease
// runs; the rest reload schedules a minute later to show the result.
export function useNightlyAutoPlan(
  handleAutoFill: (trigger: AutoPlanTrigger) => Promise<void>
) {
  // Latest handleAutoFill in a ref so the nightly scheduler can call the
  // freshest closure (with up-to-date stores) without resetting its timeout
  // every render.
  const handleAutoFillRef = useRef(handleAutoFill);
  useEffect(() => {
    handleAutoFillRef.current = handleAutoFill;
  });

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let followerRefreshId: ReturnType<typeof setTimeout> | null = null;

    const runNightly = async () => {
      const res = await fetch(NIGHTLY_AUTO_PLAN_LEASE_ENDPOINT, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Lease HTTP ${res.status}`);
      const { claimed } = (await res.json()) as { claimed?: boolean };
      if (cancelled) return;
      if (!claimed) {
        followerRefreshId = setTimeout(() => {
          if (!cancelled) void useWeeklyScheduleStore.getState().fetchSchedules();
        }, NIGHTLY_FOLLOWER_REFRESH_MS);
        return;
      }
      await useWeeklyScheduleStore.getState().fetchSchedules();
      if (cancelled) return;
      try {
        await handleAutoFillRef.current("nightly");
      } catch (err) {
        // A week changed under us mid-run (another tab saved). The store has
        // reloaded it; replan once on the fresh state.
        if (!(err instanceof ScheduleConflictError) || cancelled) throw err;
        await useWeeklyScheduleStore.getState().fetchSchedules();
        await handleAutoFillRef.current("nightly");
      }
    };

    const schedule = () => {
      const delay =
        msUntilNextLaHour(NIGHTLY_AUTO_PLAN_HOUR) + NIGHTLY_AUTO_PLAN_BUFFER_MS;
      // The LA day this timer is for. A suspended laptop can fire it hours
      // late; past that day, planning "from tomorrow" would skip a real day.
      const targetDayKey = laDayKey(new Date(Date.now() + delay));
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        if (laDayKey() === targetDayKey) {
          runNightly().catch((err) =>
            console.warn("Nightly auto-plan failed", err)
          );
        }
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (followerRefreshId) clearTimeout(followerRefreshId);
    };
  }, []);
}
