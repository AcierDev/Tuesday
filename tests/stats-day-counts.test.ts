import assert from "node:assert/strict";
import { test } from "node:test";

import { dayDiffKeys, laDayKey, laWallClockMs, shiftDayKey } from "../lib/debt-metrics";
import {
  bucketByDayOfWeek,
  bucketCompletionsByDay,
  bucketDayCounts,
  DAY_OF_WEEK_LABELS,
  bucketDayCountsByDayOfWeek,
  bucketOnTimeByWeek,
  bucketOnTimeDaysByWeek,
  completedAtIfDone,
  computeOnTimeStats,
  countCompletionsByDay,
  countOnTimeByDay,
  countShippedSquaresByDay,
  onTimeStatsFromDays,
  parseSquareSize,
  sumDayCounts,
} from "../lib/production-metrics";
import { computeSummaryView } from "../lib/server/stats-views/summary";
import { ItemStatus, type Item } from "../typings/types";

// The stats server ships per-day totals instead of items; these checks pin the
// day-count helpers to the item-based functions the pages used to call. The
// legacy* functions are verbatim copies of the pre-refactor implementations
// (which scanned items per window), so the comparison is not circular.

function legacyBucketCompletionsByDay(list: Item[], startKey: string, endKey: string) {
  const counts = new Map<string, number>();
  for (const item of list) {
    const completedAt = completedAtIfDone(item);
    if (completedAt === null) continue;
    const key = laDayKey(new Date(completedAt));
    if (key < startKey || key > endKey) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const span = dayDiffKeys(startKey, endKey);
  const out: { date: string; value: number }[] = [];
  for (let i = 0; i <= span; i++) {
    const key = shiftDayKey(startKey, i);
    out.push({ date: key, value: counts.get(key) ?? 0 });
  }
  return out;
}

function legacyComputeOnTimeStats(list: Item[], startKey: string, endKey: string) {
  let total = 0;
  let onTime = 0;
  let lateDaysSum = 0;
  let lateCount = 0;
  for (const item of list) {
    const completedAt = completedAtIfDone(item);
    if (completedAt === null) continue;
    const due = item.dueDate?.slice(0, 10);
    if (!due || due.length !== 10) continue;
    const completedKey = laDayKey(new Date(completedAt));
    if (completedKey < startKey || completedKey > endKey) continue;
    total += 1;
    const diff = dayDiffKeys(due, completedKey);
    if (diff <= 0) {
      onTime += 1;
    } else {
      lateCount += 1;
      lateDaysSum += diff;
    }
  }
  return {
    total,
    onTime,
    late: lateCount,
    onTimePct: total === 0 ? null : (onTime / total) * 100,
    avgDaysLate: lateCount === 0 ? 0 : lateDaysSum / lateCount,
  };
}

function legacyBucketOnTimeByWeek(list: Item[], startKey: string, endKey: string) {
  const span = dayDiffKeys(startKey, endKey);
  const buckets: { date: string; value: number | null; total: number }[] = [];
  for (let i = 6; i <= span; i += 7) {
    const weekEnd = shiftDayKey(startKey, i);
    const weekStart = shiftDayKey(weekEnd, -6);
    const stats = legacyComputeOnTimeStats(list, weekStart, weekEnd);
    buckets.push({
      date: weekEnd,
      total: stats.total,
      value: stats.total === 0 ? null : stats.onTimePct,
    });
  }
  return buckets;
}

function legacyBucketByDayOfWeek(list: Item[], startKey: string, endKey: string) {
  const perDay = new Map<string, number>();
  for (const item of list) {
    const completedAt = completedAtIfDone(item);
    if (completedAt === null) continue;
    const key = laDayKey(new Date(completedAt));
    if (key < startKey || key > endKey) continue;
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  const totals = [0, 0, 0, 0, 0, 0, 0];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  const span = dayDiffKeys(startKey, endKey);
  for (let i = 0; i <= span; i++) {
    const key = shiftDayKey(startKey, i);
    const [y, m, d] = key.split("-").map(Number);
    if (y === undefined || m === undefined || d === undefined) continue;
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const v = perDay.get(key) ?? 0;
    totals[dow]! += v;
    dayCounts[dow]! += 1;
  }
  return DAY_OF_WEEK_LABELS.map((day, dow) => ({
    day,
    total: totals[dow]!,
    activeDays: dayCounts[dow]!,
    avg: dayCounts[dow]! ? totals[dow]! / dayCounts[dow]! : 0,
  }));
}

const FIXTURE_DAYS = 120;
const FIXTURE_START = "2026-09-01"; // spans the 2026-11-01 DST fall-back
const STATUSES = [
  ItemStatus.Done,
  ItemStatus.Done,
  ItemStatus.Done,
  ItemStatus.Wip, // reopened: keeps a stale completedAt
  ItemStatus.Hidden,
  ItemStatus.Packaging,
];
const SIZES = ["16 x 10", "8x8", "custom", undefined, "20 × 12", "0x5"];
// Hours chosen to land on both sides of LA midnight (00:30, 23:30) and DST.
const HOURS = [0, 1, 12, 23];
const DUE_OFFSETS = [-3, 0, 2, 9];

function fixtureItems(): Item[] {
  const items: Item[] = [];
  for (let day = 0; day < FIXTURE_DAYS; day++) {
    const key = shiftDayKey(FIXTURE_START, day);
    const perDay = (day * 7) % 5;
    for (let n = 0; n < perDay; n++) {
      const seed = day * 31 + n * 17;
      const status = STATUSES[seed % STATUSES.length]!;
      const dueOffset = DUE_OFFSETS[seed % DUE_OFFSETS.length]!;
      const dueKey = shiftDayKey(key, dueOffset);
      const dueVariants = [dueKey, `${dueKey}T00:00:00.000Z`, "", "abc", undefined];
      items.push({
        id: `${key}-${n}`,
        status,
        completedAt:
          seed % 13 === 0
            ? undefined
            : seed % 29 === 0
              ? Number.NaN
              : laWallClockMs(key, HOURS[seed % HOURS.length]!, 30),
        createdAt: laWallClockMs(shiftDayKey(key, -10), 9),
        dueDate: dueVariants[seed % dueVariants.length],
        size: SIZES[seed % SIZES.length],
        design: `D${seed % 4}`,
        customerName: `C${seed}`,
        visible: true,
        deleted: false,
        index: 0,
      } as Item);
    }
  }
  return items;
}

const items = fixtureItems();
const WINDOWS: [string, string][] = [
  [FIXTURE_START, shiftDayKey(FIXTURE_START, FIXTURE_DAYS - 1)],
  ["2026-10-25", "2026-11-08"], // across DST
  ["2026-08-01", "2026-09-10"], // starts before the data
  ["2026-10-01", "2026-10-01"], // single day
  ["2027-03-01", "2027-03-31"], // after the data
  ["2026-09-03", "2026-12-17"], // span not a multiple of 7
];

test("the fixture exercises reopened, hidden, undated and DST-edge rows", () => {
  assert.ok(items.some((i) => i.status === ItemStatus.Wip && i.completedAt));
  assert.ok(items.some((i) => i.status === ItemStatus.Hidden && i.completedAt));
  assert.ok(items.some((i) => i.dueDate === "abc"));
  assert.ok(items.some((i) => Number.isNaN(i.completedAt)));
  assert.ok(
    items.some(
      (i) =>
        completedAtIfDone(i) !== null &&
        laDayKey(new Date(i.completedAt!)) === "2026-11-01"
    )
  );
});

test("completion buckets from day counts equal the pre-refactor item scan", () => {
  const counts = countCompletionsByDay(items);
  for (const [start, end] of WINDOWS) {
    const legacy = legacyBucketCompletionsByDay(items, start, end);
    assert.deepEqual(bucketDayCounts(counts, start, end), legacy, `${start}..${end}`);
    assert.deepEqual(bucketCompletionsByDay(items, start, end), legacy);
  }
});

test("on-time stats and weekly series from day totals equal the pre-refactor scan", () => {
  const days = countOnTimeByDay(items);
  let late = 0;
  for (const [start, end] of WINDOWS) {
    const stats = onTimeStatsFromDays(days, start, end);
    const legacy = legacyComputeOnTimeStats(items, start, end);
    assert.deepEqual(stats, legacy, `${start}..${end}`);
    assert.deepEqual(computeOnTimeStats(items, start, end), legacy);
    late += stats.late;
    const legacyWeekly = legacyBucketOnTimeByWeek(items, start, end);
    assert.deepEqual(bucketOnTimeDaysByWeek(days, start, end), legacyWeekly, `weekly ${start}..${end}`);
    assert.deepEqual(bucketOnTimeByWeek(items, start, end), legacyWeekly);
  }
  assert.ok(late > 0, "fixture includes late shipments");
});

test("day-of-week rows from day counts equal the pre-refactor scan", () => {
  const counts = countCompletionsByDay(items);
  for (const [start, end] of WINDOWS) {
    const legacy = legacyBucketByDayOfWeek(items, start, end);
    assert.deepEqual(bucketDayCountsByDayOfWeek(counts, start, end), legacy, `${start}..${end}`);
    assert.deepEqual(bucketByDayOfWeek(items, start, end), legacy);
  }
});

test("shipped squares per day sum to the in-window Done items' squares", () => {
  const squares = countShippedSquaresByDay(items);
  for (const [start, end] of WINDOWS) {
    let expected = 0;
    for (const item of items) {
      const completedAt = completedAtIfDone(item);
      if (completedAt === null) continue;
      const key = laDayKey(new Date(completedAt));
      if (key < start || key > end) continue;
      expected += parseSquareSize(item.size)?.squares ?? 0;
    }
    assert.equal(sumDayCounts(squares, start, end), expected, `${start}..${end}`);
  }
});

test("summary lifetime totals follow the records rule (any status with completedAt)", () => {
  const summary = computeSummaryView(items);
  const completed = items
    .filter((i) => i.completedAt)
    .map((i) => i.completedAt!)
    .sort((a, b) => a - b);
  assert.equal(summary.lifetimeCompleted, completed.length);
  assert.equal(summary.firstCompletedKey, laDayKey(new Date(completed[0]!)));
  assert.deepEqual(summary.completions, countCompletionsByDay(items));
  assert.deepEqual(summary.onTime, countOnTimeByDay(items));
  assert.deepEqual(summary.shippedSquares, countShippedSquaresByDay(items));
});

test("summary of no completed items has no first day", () => {
  const summary = computeSummaryView([
    { id: "open", status: ItemStatus.New, createdAt: 0 } as Item,
  ]);
  assert.equal(summary.lifetimeCompleted, 0);
  assert.equal(summary.firstCompletedKey, null);
  assert.deepEqual(summary.completions, {});
});
