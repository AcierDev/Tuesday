import assert from "node:assert/strict";
import { test } from "node:test";
import { format, startOfDay } from "date-fns";

import {
  autoPlanStartDayKey,
  dayKeyToLocalDate,
  parseDueDay,
  planWeekStart,
} from "../components/production-planning/planner-dates";
import {
  laDayKey,
  laDayRangeMs,
  laWallClockMs,
  msUntilNextLaHour,
} from "../lib/debt-metrics";

// Run with TZ=America/Los_Angeles (the shop's zone) — the bug being guarded
// only shows when the process is west of UTC.
const DAY_FORMAT = "yyyy-MM-dd";
const MS_PER_HOUR = 60 * 60 * 1000;
const NIGHTLY_HOUR = 20;
const DST_END = "2026-11-01"; // PDT → PST (25h day)
const DST_START = "2027-03-14"; // PST → PDT (23h day)

test("due dates parse as their own calendar day, not the day before", () => {
  for (const key of ["2026-10-26", DST_END, DST_START, "2026-12-31"]) {
    const parsed = parseDueDay(key);
    assert.ok(parsed);
    assert.equal(format(parsed, DAY_FORMAT), key);
    assert.equal(parsed.getTime(), startOfDay(parsed).getTime());
  }
  if (new Date().getTimezoneOffset() > 0) {
    // Document the old behaviour this replaces (west of UTC only).
    assert.notEqual(format(startOfDay(new Date(DST_END)), DAY_FORMAT), DST_END);
  }
  assert.equal(format(parseDueDay(`${DST_END}T00:00:00.000Z`)!, DAY_FORMAT), DST_END);
  assert.equal(parseDueDay(undefined), null);
  assert.equal(parseDueDay(""), null);
  assert.equal(parseDueDay("tbd"), null);
});

test("nightly auto-plan starts filling tomorrow; manual starts today", () => {
  assert.equal(autoPlanStartDayKey("2026-10-26", "manual"), "2026-10-26");
  assert.equal(autoPlanStartDayKey("2026-10-26", "nightly"), "2026-10-27");
  assert.equal(autoPlanStartDayKey("2026-10-31", "nightly"), DST_END);
  assert.equal(autoPlanStartDayKey("2027-03-13", "nightly"), DST_START);
  // Tomorrow's slot is a local midnight one calendar day later even across DST.
  assert.equal(
    format(dayKeyToLocalDate(autoPlanStartDayKey("2026-10-31", "nightly")), DAY_FORMAT),
    DST_END
  );
});

test("planner weeks run Saturday → Friday keyed by the Sunday", () => {
  const key = (d: string) => format(planWeekStart(dayKeyToLocalDate(d)), DAY_FORMAT);
  assert.equal(key("2026-10-30"), "2026-10-25"); // Fri
  assert.equal(key("2026-10-31"), DST_END); // Sat rolls forward
  assert.equal(key(DST_END), DST_END); // Sun
  assert.equal(key("2027-03-13"), DST_START); // Sat before spring-forward
});

test("next 20:00 LA is computed as a zoned instant across DST", () => {
  // Oct 31 20:30 PDT → Nov 1 20:00 PST is 24.5h (the 25-hour day).
  const oct31Late = new Date(laWallClockMs("2026-10-31", 20, 30));
  assert.equal(msUntilNextLaHour(NIGHTLY_HOUR, oct31Late) / MS_PER_HOUR, 24.5);
  // Nov 1 19:00 PST → 20:00 PST.
  const nov1Evening = new Date(laWallClockMs(DST_END, 19));
  assert.equal(msUntilNextLaHour(NIGHTLY_HOUR, nov1Evening) / MS_PER_HOUR, 1);
  // Mar 13 20:30 PST → Mar 14 20:00 PDT is 22.5h (the 23-hour day).
  const mar13Late = new Date(laWallClockMs("2027-03-13", 20, 30));
  assert.equal(msUntilNextLaHour(NIGHTLY_HOUR, mar13Late) / MS_PER_HOUR, 22.5);
  // Exactly at 20:00 → the next day's 20:00.
  const atTarget = new Date(laWallClockMs(DST_START, NIGHTLY_HOUR));
  assert.equal(msUntilNextLaHour(NIGHTLY_HOUR, atTarget) / MS_PER_HOUR, 24);
  // The target lands on 20:00 LA wall-clock time.
  const target = new Date(oct31Late.getTime() + msUntilNextLaHour(NIGHTLY_HOUR, oct31Late));
  assert.equal(laDayKey(target), DST_END);
  assert.equal(target.toISOString(), "2026-11-02T04:00:00.000Z");
});

test("LA day ranges are 25h / 23h on DST days", () => {
  const fall = laDayRangeMs(DST_END);
  const spring = laDayRangeMs(DST_START);
  assert.equal((fall.end - fall.start) / MS_PER_HOUR, 25);
  assert.equal((spring.end - spring.start) / MS_PER_HOUR, 23);
  assert.equal(laDayKey(new Date(fall.start)), DST_END);
  assert.equal(laDayKey(new Date(fall.end - 1)), DST_END);
  assert.equal(laDayKey(new Date(spring.end)), "2027-03-15");
});
