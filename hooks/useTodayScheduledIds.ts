"use client";

import { useMemo } from "react";
import { addDays, format, startOfWeek } from "date-fns";

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
const WEEK_STARTS_ON = 0;
const WEEK_KEY_FORMAT = "yyyy-MM-dd";

function scheduledIdsForDate(
  schedules: ReturnType<typeof useWeeklyScheduleStore.getState>["schedules"],
  date: Date
): Set<string> {
  const weekKey = format(
    startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }),
    WEEK_KEY_FORMAT
  );
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

export function useTodayScheduledIds(): Set<string> {
  const schedules = useWeeklyScheduleStore((s) => s.schedules);
  return useMemo(() => scheduledIdsForDate(schedules, new Date()), [schedules]);
}

export function useTomorrowScheduledIds(): Set<string> {
  const schedules = useWeeklyScheduleStore((s) => s.schedules);
  return useMemo(
    () => scheduledIdsForDate(schedules, addDays(new Date(), 1)),
    [schedules]
  );
}
