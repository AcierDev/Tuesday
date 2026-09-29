import assert from "node:assert/strict";
import { test } from "node:test";

import { getOverdueScheduleRemovals } from "../lib/overdue-planner-orders";
import { ItemStatus, type DayName, type WeeklyScheduleData } from "../typings/types";

const TODAY = "2026-09-29";
const HAKE_ID = "afac79ef-9155-43a0-b285-86912c2d160a";

function schedule(
  weekKey: string,
  placements: Partial<WeeklyScheduleData["schedule"]>
): WeeklyScheduleData {
  const days: DayName[] = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
  ];
  return {
    weekKey,
    schedule: Object.fromEntries(days.map((day) => [day, placements[day] ?? []])) as WeeklyScheduleData["schedule"],
  };
}

test("unfinished orders on elapsed planner days return to Unscheduled", () => {
  const schedules = [
    schedule("2026-09-13", {
      Thursday: [{ id: HAKE_ID, done: false }],
    }),
    schedule("2026-09-27", {
      Monday: [
        { id: "new", done: false },
        { id: "wip", done: false, pinned: true },
        { id: "finished", done: false },
        { id: "checked", done: true },
        { id: "custom", done: false },
      ],
      Tuesday: [{ id: "today", done: false }],
      Wednesday: [{ id: "future", done: false }],
    }),
  ];
  const items = [
    { id: HAKE_ID, status: ItemStatus.OnDeck },
    { id: "new", status: ItemStatus.New },
    { id: "wip", status: ItemStatus.Wip },
    { id: "finished", status: ItemStatus.Packaging },
    { id: "checked", status: ItemStatus.OnDeck },
    { id: "today", status: ItemStatus.OnDeck },
    { id: "future", status: ItemStatus.OnDeck },
    { id: "custom", status: ItemStatus.New, size: "custom" },
  ].map((item) => ({ size: "10 x 10", ...item }));

  assert.deepEqual(getOverdueScheduleRemovals(schedules, items, TODAY), [
    { weekKey: "2026-09-13", day: "Thursday", ids: [HAKE_ID] },
    { weekKey: "2026-09-27", day: "Monday", ids: ["new", "wip"] },
  ]);
});

test("Saturday and Sunday placements stay until their displayed Monday passes", () => {
  const schedules = [schedule("2026-09-27", {
    Saturday: [{ id: "saturday", done: false }],
    Sunday: [{ id: "sunday", done: false }],
  })];
  const items = [
    { id: "saturday", status: ItemStatus.New, size: "10 x 10" },
    { id: "sunday", status: ItemStatus.New, size: "10 x 10" },
  ];

  assert.deepEqual(getOverdueScheduleRemovals(schedules, items, "2026-09-28"), []);
  assert.deepEqual(getOverdueScheduleRemovals(schedules, items, TODAY), [
    { weekKey: "2026-09-27", day: "Sunday", ids: ["sunday"] },
    { weekKey: "2026-09-27", day: "Saturday", ids: ["saturday"] },
  ]);
});
