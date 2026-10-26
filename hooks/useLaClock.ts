"use client";

import { useSyncExternalStore } from "react";

import { laDayKey } from "@/lib/debt-metrics";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🕰️ SHARED LA CLOCK                                                   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// One interval (started by the first subscriber, stopped by the last) re-checks
// the time for every component, so badges and "today" tags roll over at LA
// midnight on a tab left open overnight. Returning to a backgrounded tab
// re-checks immediately, since mobile browsers throttle timers.

export const LA_CLOCK_TICK_MS = 60_000;

const listeners = new Set<() => void>();
let tickTimer: ReturnType<typeof setInterval> | null = null;

function notifyAll() {
  for (const listener of listeners) listener();
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible") notifyAll();
}

const hasDocument = () => typeof document !== "undefined";

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    tickTimer = setInterval(notifyAll, LA_CLOCK_TICK_MS);
    if (hasDocument()) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
    if (hasDocument()) {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
  };
}

const readLaTodayKey = () => laDayKey();

// Today's calendar date in America/Los_Angeles (YYYY-MM-DD). The caller
// re-renders only when the LA day changes.
export function useLaTodayKey(): string {
  return useSyncExternalStore(subscribe, readLaTodayKey, readLaTodayKey);
}

// Wall-clock bucket index that changes once per `bucketMs`, so time-window
// checks ("moved in the last N hours") expire even when no new data arrives.
export function useClockBucket(bucketMs: number): number {
  const read = () => Math.floor(Date.now() / bucketMs);
  return useSyncExternalStore(subscribe, read, read);
}
