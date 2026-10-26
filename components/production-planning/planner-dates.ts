import { addDays, parseISO, startOfDay, startOfWeek } from "date-fns";

import { shiftDayKey } from "@/lib/debt-metrics";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📅 PLANNER DATE HELPERS                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_KEY_LENGTH = 10;

// Week boundary: a new planning week starts Saturday morning. We still key
// schedules by the Sunday inside the week (DB-backwards compat with all
// pre-existing weekKey docs), so the helper just nudges the input one day
// forward and falls through to the standard Sunday-led startOfWeek.
//   today = Fri 5/1 → Sun 4/26 (current week)
//   today = Sat 5/2 → Sun 5/3  (rolled over to next week)
//   today = Sun 5/3 → Sun 5/3
export function planWeekStart(date: Date): Date {
  return startOfWeek(addDays(date, 1), { weekStartsOn: 0 });
}

// Local-midnight Date for an LA calendar day key. The planner lays its
// columns out on local midnights of calendar labels, so day keys go through
// this (never `new Date(key)`, which parses as UTC midnight — the previous
// evening in LA).
export function dayKeyToLocalDate(key: string): Date {
  return startOfDay(parseISO(key));
}

// Due dates are stored as YYYY-MM-DD labels. `new Date("2026-11-03")` is UTC
// midnight = Nov 2 17:00 PDT, so startOfDay() landed one day early and
// auto-plan treated every order as due the day before. Parse the label as a
// calendar day instead. Invalid/missing → null ("no due date").
export function parseDueDay(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const key = raw.slice(0, DAY_KEY_LENGTH);
  if (!DAY_KEY_PATTERN.test(key)) return null;
  const date = dayKeyToLocalDate(key);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type AutoPlanTrigger = "manual" | "nightly";

// First LA day auto-plan may fill. The nightly run fires at 8pm after the
// shop's day is done, so leftover work rolls forward to tomorrow instead of
// being placed back onto today.
export function autoPlanStartDayKey(
  todayKey: string,
  trigger: AutoPlanTrigger
): string {
  return trigger === "nightly" ? shiftDayKey(todayKey, 1) : todayKey;
}
