import type { WeeklyScheduleData } from "@/typings/types";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🔢 OPTIMISTIC CONCURRENCY FOR WEEKLY SCHEDULE DOCS                   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Each week doc carries a `version` that every server-side write bumps
// (PATCH, reconcile-overdue). A PATCH names the version its edit was derived
// from; if the stored doc moved on, the write is refused with 409 so a stale
// tab can't resurrect entries another writer removed. Docs written before
// this field existed have no version and count as 0.

export type VersionedWeeklySchedule = WeeklyScheduleData & { version?: number };

export const SCHEDULE_VERSION_FIELD = "version";
export const HTTP_CONFLICT = 409;

// Accepts any schedule-shaped object (plain WeeklyScheduleData included).
export function scheduleVersion(doc: object | null | undefined): number {
  const v = (doc as { version?: unknown } | null | undefined)?.version;
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : 0;
}

// Mongo filter matching `weekKey` at exactly `baseVersion` (a missing field
// matches 0).
export function versionedScheduleFilter(
  weekKey: string,
  baseVersion: number
): Record<string, unknown> {
  return baseVersion === 0
    ? { weekKey, [SCHEDULE_VERSION_FIELD]: { $in: [null, 0] } }
    : { weekKey, [SCHEDULE_VERSION_FIELD]: baseVersion };
}

export function emptyWeekSchedule(): WeeklyScheduleData["schedule"] {
  return {
    Sunday: [],
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
  };
}
