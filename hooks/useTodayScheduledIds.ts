"use client";

import { useMemo } from "react";
import { addDays, format } from "date-fns";

import {
  dayKeyToLocalDate,
  planWeekStart,
} from "@/components/production-planning/planner-dates";
import { useLaTodayKey } from "@/hooks/useLaClock";
import { useWeeklyScheduleStore } from "@/stores/useWeeklyScheduleStore";
import type { DayName } from "@/typings/types";

const DAY_NAMES: DayName[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const WEEK_KEY_FORMAT = "yyyy-MM-dd";
const SCHEDULED_IDS_CACHE_DAYS = 2;

type Schedules = ReturnType<typeof useWeeklyScheduleStore.getState>["schedules"];

// Every name cell asks for the same day's set; build it once per
// (schedules, day) instead of once per cell.
const idsCache = new Map<string, { schedules: Schedules; ids: Set<string> }>();

function cachedScheduledIds(schedules: Schedules, dayKey: string): Set<string> {
  const hit = idsCache.get(dayKey);
  if (hit?.schedules === schedules) return hit.ids;
  const ids = scheduledIdsForDate(schedules, dayKeyToLocalDate(dayKey));
  // Only today/tomorrow are live; drop older days once the date rolls.
  if (!hit && idsCache.size >= SCHEDULED_IDS_CACHE_DAYS) idsCache.clear();
  idsCache.set(dayKey, { schedules, ids });
  return ids;
}

function scheduledIdsForDate(
  schedules: Schedules,
  date: Date
): Set<string> {
  // Planner weeks run Saturday→Friday, keyed by the Sunday inside them.
  const weekKey = format(planWeekStart(date), WEEK_KEY_FORMAT);
  const day = DAY_NAMES[date.getDay()];
  const ids = new Set<string>();
  if (!day) return ids;
  const sched = schedules.find((s) => s.weekKey === weekKey);
  if (!sched) return ids;
  for (const entry of sched.schedule[day] ?? []) {
    ids.add(entry.id);
  }
  return ids;
}

// "Today" is the LA calendar day (the shop's timezone), not the browser's,
// and the sets recompute when that day rolls over.
export function useTodayScheduledIds(): Set<string> {
  const schedules = useWeeklyScheduleStore((s) => s.schedules);
  const todayKey = useLaTodayKey();
  return useMemo(
    () => cachedScheduledIds(schedules, todayKey),
    [schedules, todayKey]
  );
}

export function useTomorrowScheduledIds(): Set<string> {
  const schedules = useWeeklyScheduleStore((s) => s.schedules);
  const todayKey = useLaTodayKey();
  return useMemo(
    () =>
      cachedScheduledIds(
        schedules,
        format(addDays(dayKeyToLocalDate(todayKey), 1), WEEK_KEY_FORMAT)
      ),
    [schedules, todayKey]
  );
}
