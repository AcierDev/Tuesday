import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildItemPatch, findItemPatchConflicts, itemValuesEqual } from "../lib/order-patch";
import { laDayKey, shiftDayKey } from "../lib/debt-metrics";
import { ItemStatus, type Item } from "../typings/types";

const PAUSE_OFFSET_DAYS = 5;
const base: Item = {
  id: "patch-fixture", customerName: "Alex Lee", painted: "", glued: "", notes: "",
  dueDate: "2026-11-02", tags: { isVertical: false }, status: ItemStatus.OnDeck,
  createdAt: 0, index: 0, visible: true, deleted: false,
};

test("only changed fields are sent, with the values this client last saw", () => {
  const next = { ...base, painted: "Yes", searchText: "stale", isScheduled: true, _id: "abc" } as Item;
  const patch = buildItemPatch(base, next);
  assert.deepEqual(patch.updates, { painted: "Yes" });
  assert.deepEqual(patch.expected, { painted: "" });
});

test("a caller's stale copy of other fields is ignored when the edited field is named", () => {
  const latest = { ...base, glued: "Yes" };
  const staleEdit = { ...base, painted: "Yes" };
  assert.deepEqual(buildItemPatch(latest, staleEdit, new Set(["painted"])).updates, { painted: "Yes" });
  // Without the restriction the stale glued value would be written back.
  assert.deepEqual(buildItemPatch(latest, staleEdit).updates, { painted: "Yes", glued: "" });
});

test("pausing or resuming persists the due date shown on the board", () => {
  const paused = { ...base, onHold: true, dueDatePauseOffsetDays: PAUSE_OFFSET_DAYS };
  const resumed = { ...paused, onHold: false, dueDatePauseOffsetDays: null };
  assert.deepEqual(buildItemPatch(paused, resumed).updates, {
    onHold: false, dueDatePauseOffsetDays: null, dueDate: base.dueDate,
  });
});

test("server-owned history fields never decide a conflict", () => {
  const completing = { ...base, status: ItemStatus.Done, completedAt: Date.now() };
  assert.deepEqual(buildItemPatch(base, completing).expected, { status: ItemStatus.OnDeck });
  assert.deepEqual(findItemPatchConflicts({ ...base, completedAt: 1 }, { completedAt: 2 } as Partial<Item>), []);
});

test("missing, undefined and null are equal and object key order is ignored", () => {
  assert.equal(itemValuesEqual(undefined, null), true);
  assert.equal(itemValuesEqual({ a: 1, b: undefined }, { a: 1 }), true);
  assert.equal(itemValuesEqual({ a: 1, b: 2 }, { b: 2, a: 1 }), true);
  assert.equal(itemValuesEqual({ a: 1 }, { a: 2 }), false);
  assert.equal(itemValuesEqual("", null), false);
});

test("a field changed elsewhere since this client loaded it is a conflict", () => {
  const stored = { ...base, painted: "No", glued: "Yes" };
  assert.deepEqual(findItemPatchConflicts(stored, { painted: "" }), ["painted"]);
  // Other fields changing meanwhile does not block this save.
  assert.deepEqual(findItemPatchConflicts(stored, { notes: "" }), []);
});

test("paused due dates are compared as the client sees them", () => {
  const today = laDayKey();
  const stored = { ...base, dueDate: "2020-01-01", onHold: true, dueDatePauseOffsetDays: PAUSE_OFFSET_DAYS };
  assert.deepEqual(findItemPatchConflicts(stored, { dueDate: shiftDayKey(today, PAUSE_OFFSET_DAYS) }), []);
  assert.deepEqual(findItemPatchConflicts({ ...base, dueDate: "2026-11-02T08:00:00.000Z" }, { dueDate: "2026-11-02" }), []);
});

test("the items API escapes search text, batches pause migrations and returns the saved item", () => {
  const route = readFileSync(new URL("../app/api/items/route.ts", import.meta.url), "utf8");
  assert.match(route, /literalSearchRegex\(search\)/);
  assert.match(route, /\.slice\(0, SEARCH_MAX_LENGTH\)/);
  assert.match(route, /bulkWrite\(pauseOffsetMigrations/);
  assert.doesNotMatch(route, /await collection\.updateOne\(/);
  assert.match(route, /status: 409/);
  assert.doesNotMatch(route, /requestOrigin\.startsWith/);
});

test("live updates share one change stream and unregister on disconnect", () => {
  const route = readFileSync(new URL("../app/api/items/changes/route.ts", import.meta.url), "utf8");
  const hub = readFileSync(new URL("../app/api/items/changes/item-change-hub.ts", import.meta.url), "utf8");
  assert.doesNotMatch(route, /\.watch\(/);
  assert.match(route, /cancel\(\)\s*\{\s*closeConnection\(\);/);
  assert.match(hub, /fullDocument: "updateLookup"/);
  assert.match(hub, /type: "delete", documentId/);
});
