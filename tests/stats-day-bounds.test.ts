import assert from "node:assert/strict";
import { test } from "node:test";

import {
  laDayKey,
  laDayRangeMs,
  laDayStartMs,
  laWallClockMs,
  shiftDayKey,
} from "../lib/debt-metrics";

// Stats day windows (/stats/today, /stats/lead-time) are half-open
// [00:00 LA, next 00:00 LA). These checks pin the instants independently of
// the process zone; run with TZ=America/Los_Angeles per the project rule.

const HOUR_MS = 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

test("LA midnight resolves to the right UTC instant on both offsets", () => {
  assert.equal(iso(laDayStartMs("2026-10-26")), "2026-10-26T07:00:00.000Z"); // PDT
  assert.equal(iso(laDayStartMs("2026-12-01")), "2026-12-01T08:00:00.000Z"); // PST
});

test("fall-back day (2026-11-01) is 25 hours long", () => {
  const { start, end } = laDayRangeMs("2026-11-01");
  assert.equal(iso(start), "2026-11-01T07:00:00.000Z");
  assert.equal(iso(end), "2026-11-02T08:00:00.000Z");
  assert.equal(end - start, 25 * HOUR_MS);
});

test("spring-forward day (2027-03-14) is 23 hours long", () => {
  const { start, end } = laDayRangeMs("2027-03-14");
  assert.equal(iso(start), "2027-03-14T08:00:00.000Z");
  assert.equal(iso(end), "2027-03-15T07:00:00.000Z");
  assert.equal(end - start, 23 * HOUR_MS);
});

test("late-evening completions stay on their LA day across DST", () => {
  for (const key of ["2026-10-31", "2026-11-01", "2027-03-13", "2027-03-14"]) {
    const { start, end } = laDayRangeMs(key);
    const lateEvening = laWallClockMs(key, 23, 30);
    assert.ok(lateEvening >= start && lateEvening < end, key);
    assert.equal(laDayKey(new Date(lateEvening)), key);
    // The next LA midnight belongs to the following day (half-open window).
    assert.equal(laDayKey(new Date(end)), shiftDayKey(key, 1));
    assert.equal(laDayKey(new Date(start - 1)), shiftDayKey(key, -1));
  }
});

test("a multi-day lead-time window covers every LA day exactly once", () => {
  const startKey = "2026-10-30";
  const endKey = "2026-11-02";
  const startMs = laDayStartMs(startKey);
  const endExclusiveMs = laDayStartMs(shiftDayKey(endKey, 1));
  // 4 calendar days including the 25h fall-back day.
  assert.equal(endExclusiveMs - startMs, (4 * 24 + 1) * HOUR_MS);
  assert.equal(laDayKey(new Date(endExclusiveMs - 1)), endKey);
});
