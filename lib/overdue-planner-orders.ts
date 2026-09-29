import { shiftDayKey } from "./debt-metrics";
import { parseSquareSize } from "./production-metrics";
import { ItemStatus, type DayName, type Item, type WeeklyScheduleData } from "../typings/types";

// Weekend entries are displayed in Monday's planner column.
const DISPLAY_DAY_OFFSET: Record<DayName, number> = {
  Sunday: 1,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 1,
};
const PLANNER_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UNFINISHED_PRODUCTION_STATUSES = new Set<ItemStatus>([
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
]);

export type OverdueScheduleRemoval = {
  weekKey: string;
  day: DayName;
  ids: string[];
};

export function getOverdueScheduleRemovals(
  schedules: WeeklyScheduleData[],
  items: Pick<Item, "id" | "status" | "onHold" | "size">[],
  todayKey: string
): OverdueScheduleRemoval[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const removals: OverdueScheduleRemoval[] = [];

  for (const week of schedules) {
    if (!PLANNER_DATE_KEY_PATTERN.test(week.weekKey)) continue;
    for (const [day, entries] of Object.entries(week.schedule) as [DayName, WeeklyScheduleData["schedule"][DayName]][]) {
      if (shiftDayKey(week.weekKey, DISPLAY_DAY_OFFSET[day]) >= todayKey) continue;
      const ids = entries
        .filter((entry) => {
          const item = byId.get(entry.id);
          return !entry.done && item && !item.onHold &&
            UNFINISHED_PRODUCTION_STATUSES.has(item.status) &&
            parseSquareSize(item.size) !== null;
        })
        .map((entry) => entry.id);
      if (ids.length) removals.push({ weekKey: week.weekKey, day, ids });
    }
  }

  return removals;
}
