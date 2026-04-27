"use client";

import { useMemo } from "react";
import { format, startOfWeek } from "date-fns";

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

export function useTodayScheduledIds(): Set<string> {
  const schedules = useWeeklyScheduleStore((s) => s.schedules);

  return useMemo(() => {
    const now = new Date();
    const weekKey = format(
      startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON }),
      WEEK_KEY_FORMAT
    );
    const today = DAY_NAMES[now.getDay()];
    const ids = new Set<string>();
    if (!today) return ids;
    const sched = schedules.find((s) => s.weekKey === weekKey);
    if (!sched) return ids;
    for (const entry of sched.schedule[today] ?? []) {
      ids.add(entry.id);
    }
    return ids;
  }, [schedules]);
}
