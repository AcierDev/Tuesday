import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildSnapshotSeries,
  buildSnapshotUpdate,
  isAuthorizedCronRequest,
} from "../app/api/debt-snapshots/snapshot-helpers";

const WINDOW_START = "2026-10-28";
const WINDOW_DAYS = 5;
const SECRET = "test-cron-secret";

type Row = { date: string; totalDebt: number };
const valueOf = (row: Row) => row.totalDebt;
// Routes query rows sorted by date DESC; mirror that here.
const desc = (rows: Row[]) => [...rows].sort((a, b) => b.date.localeCompare(a.date));

test("days before the first-ever snapshot are null, not 0", () => {
  const series = buildSnapshotSeries(
    desc([
      { date: "2026-10-30", totalDebt: 4 },
      { date: "2026-11-01", totalDebt: 0 },
    ]),
    WINDOW_START,
    WINDOW_DAYS,
    valueOf
  );
  assert.deepEqual(
    series.map((p) => [p.date, p.value, p.recorded]),
    [
      ["2026-10-28", null, false],
      ["2026-10-29", null, false],
      ["2026-10-30", 4, true],
      ["2026-10-31", 4, false], // carry-forward gap
      ["2026-11-01", 0, true], // a real recorded 0 stays 0
    ]
  );
});

test("a seed row before the window carries forward into leading gaps", () => {
  const series = buildSnapshotSeries(
    desc([
      { date: "2026-10-20", totalDebt: 2 },
      { date: "2026-10-15", totalDebt: 9 },
      { date: "2026-10-30", totalDebt: 6 },
    ]),
    WINDOW_START,
    WINDOW_DAYS,
    valueOf
  );
  assert.deepEqual(
    series.map((p) => p.value),
    [2, 2, 6, 6, 6]
  );
  assert.deepEqual(
    series.map((p) => p.recorded),
    [false, false, true, false, false]
  );
});

test("no snapshots at all yields an all-null series", () => {
  const series = buildSnapshotSeries([], WINDOW_START, WINDOW_DAYS, valueOf);
  assert.equal(series.length, WINDOW_DAYS);
  assert.ok(series.every((p) => p.value === null && !p.recorded));
});

test("series spans DST fall-back without skipping or repeating a day", () => {
  const series = buildSnapshotSeries([], "2026-10-31", 3, valueOf);
  assert.deepEqual(
    series.map((p) => p.date),
    ["2026-10-31", "2026-11-01", "2026-11-02"]
  );
});

test("page writes are insert-only; the cron overwrites", () => {
  const snapshot = { date: "2026-10-28", totalDebt: 3 };
  assert.deepEqual(buildSnapshotUpdate(snapshot, "insert-only"), {
    $setOnInsert: snapshot,
  });
  assert.deepEqual(buildSnapshotUpdate(snapshot, "overwrite"), {
    $set: snapshot,
  });
});

test("cron auth fails closed when CRON_SECRET is unset", () => {
  const withHeader = (value?: string) =>
    new Request("http://localhost/api/debt-snapshots/cron", {
      headers: value ? { authorization: value } : {},
    });
  assert.equal(isAuthorizedCronRequest(withHeader(), undefined), false);
  assert.equal(isAuthorizedCronRequest(withHeader("Bearer "), ""), false);
  assert.equal(isAuthorizedCronRequest(withHeader("Bearer undefined"), undefined), false);
  assert.equal(isAuthorizedCronRequest(withHeader(`Bearer ${SECRET}`), SECRET), true);
  assert.equal(isAuthorizedCronRequest(withHeader("Bearer wrong"), SECRET), false);
  assert.equal(isAuthorizedCronRequest(withHeader(), SECRET), false);
});
