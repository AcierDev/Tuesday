import type { DayName } from "@/typings/types";

// Weekday columns shown on the planner board.
export const DAYS: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

// Day-of-week offsets from Sunday (week start). Used to compute a column's date.
export const DAY_OFFSET_FROM_WEEK_START: Record<DayName, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

// Sat/Sun work folds into Monday's column for display.
export const DAYS_FOLDED_INTO_MONDAY: DayName[] = ["Saturday", "Sunday"];

// Per-day opt-in for the auto-plan run. Stored in localStorage so the user's
// pick sticks across reloads. Defaults match the original Mon–Thu target set.
export type AutoPlanDayMap = Record<DayName, boolean>;
export const AUTO_PLAN_STORAGE_KEY = "production-planning:auto-plan-days";
export const EXCLUDED_ITEMS_STORAGE_KEY = "production-planning:excluded-item-ids";
export const AUTO_PLAN_DEFAULTS: AutoPlanDayMap = {
  Sunday: false,
  Monday: true,
  Tuesday: true,
  Wednesday: true,
  Thursday: true,
  Friday: false,
  Saturday: false,
};
