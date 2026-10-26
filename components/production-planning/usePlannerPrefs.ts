"use client";

import { useCallback, useEffect, useState } from "react";

import type { DayName } from "@/typings/types";
import {
  AUTO_PLAN_DEFAULTS,
  AUTO_PLAN_STORAGE_KEY,
  EXCLUDED_ITEMS_STORAGE_KEY,
  type AutoPlanDayMap,
} from "@/components/production-planning/planner-config";

const EXCLUDED_ITEMS_ENDPOINT = "/api/production-planning/excluded-items";

// Which weekdays auto-plan may fill, persisted per browser.
export function useAutoPlanDays() {
  const [autoPlanDays, setAutoPlanDays] =
    useState<AutoPlanDayMap>(AUTO_PLAN_DEFAULTS);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUTO_PLAN_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AutoPlanDayMap>;
      setAutoPlanDays({ ...AUTO_PLAN_DEFAULTS, ...parsed });
    } catch (err) {
      console.warn("Failed to load auto-plan day prefs", err);
    }
  }, []);
  const toggleAutoPlanDay = useCallback((day: DayName) => {
    setAutoPlanDays((prev) => {
      const next = { ...prev, [day]: !prev[day] };
      try {
        window.localStorage.setItem(
          AUTO_PLAN_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch (err) {
        console.warn("Failed to save auto-plan day prefs", err);
      }
      return next;
    });
  }, []);
  return { autoPlanDays, toggleAutoPlanDay };
}

// Items the user has pinned-to-sidebar — auto-plan skips these entirely.
// Persisted server-side via /api/production-planning/excluded-items so the
// pin sticks across reloads and machines. Mirrored to localStorage so the
// pinned state shows on first paint instead of flashing in after the fetch.
export function useExcludedItemIds() {
  const [excludedItemIds, setExcludedItemIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(EXCLUDED_ITEMS_STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? new Set(parsed.filter((v): v is string => typeof v === "string"))
        : new Set();
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    let cancelled = false;
    fetch(EXCLUDED_ITEMS_ENDPOINT)
      .then((r) => (r.ok ? r.json() : { itemIds: [] }))
      .then((data: { itemIds?: string[] }) => {
        if (cancelled) return;
        const ids = data.itemIds ?? [];
        setExcludedItemIds(new Set(ids));
        try {
          window.localStorage.setItem(
            EXCLUDED_ITEMS_STORAGE_KEY,
            JSON.stringify(ids)
          );
        } catch (err) {
          console.warn("Failed to cache sidebar pins", err);
        }
      })
      .catch((err) => console.warn("Failed to load sidebar pins", err));
    return () => {
      cancelled = true;
    };
  }, []);
  const toggleExcluded = useCallback(
    async (itemId: string, excluded: boolean) => {
      // Optimistic update so the pin pops immediately; reconcile from response.
      setExcludedItemIds((prev) => {
        const next = new Set(prev);
        if (excluded) next.add(itemId);
        else next.delete(itemId);
        return next;
      });
      try {
        const res = await fetch(
          EXCLUDED_ITEMS_ENDPOINT,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId, excluded }),
          }
        );
        if (!res.ok) throw new Error("Server rejected pin update");
        const data: { itemIds?: string[] } = await res.json();
        const ids = data.itemIds ?? [];
        setExcludedItemIds(new Set(ids));
        try {
          window.localStorage.setItem(
            EXCLUDED_ITEMS_STORAGE_KEY,
            JSON.stringify(ids)
          );
        } catch (cacheErr) {
          console.warn("Failed to cache sidebar pins", cacheErr);
        }
      } catch (err) {
        console.error("Failed to toggle sidebar pin", err);
        // Roll back on failure.
        setExcludedItemIds((prev) => {
          const next = new Set(prev);
          if (excluded) next.delete(itemId);
          else next.add(itemId);
          return next;
        });
      }
    },
    []
  );
  return { excludedItemIds, toggleExcluded };
}
