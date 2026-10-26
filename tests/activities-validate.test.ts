import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTIVITIES_DEFAULT_LIMIT,
  ACTIVITIES_MAX_LIMIT,
  ACTIVITY_MAX_CHANGES,
  ACTIVITY_MAX_VALUE_LENGTH,
  clampedInteger,
  parseActivityInput,
} from "../app/api/activities/validate";

const valid = {
  itemId: "EW-100", type: "update",
  changes: [{ field: "status", oldValue: "New", newValue: "Done" }],
  metadata: { customerName: "Ana", design: "Oak" },
};

test("activity input keeps only allowlisted fields", () => {
  const parsed = parseActivityInput({ ...valid, timestamp: 1, _id: "x", id: "y", extra: "z",
    changes: [{ ...valid.changes[0], injected: true }], metadata: { ...valid.metadata, other: "x" } });
  assert.deepEqual(parsed, {
    itemId: "EW-100", type: "update",
    changes: [{ field: "status", oldValue: "New", newValue: "Done" }],
    metadata: { customerName: "Ana", design: "Oak" },
  });
});

test("malformed or oversized activities are rejected", () => {
  for (const input of [
    null, [], "text",
    { ...valid, itemId: "" },
    { ...valid, itemId: { $ne: null } },
    { ...valid, type: "drop" },
    { ...valid, changes: "status" },
    { ...valid, changes: Array.from({ length: ACTIVITY_MAX_CHANGES + 1 }, () => valid.changes[0]) },
    { ...valid, changes: [{ field: "status", newValue: "x".repeat(ACTIVITY_MAX_VALUE_LENGTH + 1) }] },
    { ...valid, changes: [{ field: "status", newValue: { $gt: "" } }] },
    { ...valid, metadata: { customerName: 5 } },
  ]) assert.equal(parseActivityInput(input), null, JSON.stringify(input));
});

test("list paging values are clamped and malformed values use defaults", () => {
  assert.equal(clampedInteger("abc", ACTIVITIES_DEFAULT_LIMIT, 1, ACTIVITIES_MAX_LIMIT), ACTIVITIES_DEFAULT_LIMIT);
  assert.equal(clampedInteger(null, ACTIVITIES_DEFAULT_LIMIT, 1, ACTIVITIES_MAX_LIMIT), ACTIVITIES_DEFAULT_LIMIT);
  assert.equal(clampedInteger("0", ACTIVITIES_DEFAULT_LIMIT, 1, ACTIVITIES_MAX_LIMIT), 1);
  assert.equal(clampedInteger("999999", ACTIVITIES_DEFAULT_LIMIT, 1, ACTIVITIES_MAX_LIMIT), ACTIVITIES_MAX_LIMIT);
  assert.equal(clampedInteger("5000", ACTIVITIES_DEFAULT_LIMIT, 1, ACTIVITIES_MAX_LIMIT), 5000);
  assert.equal(clampedInteger("-3", 0, 0, 100), 0);
  assert.equal(clampedInteger("2.5", 0, 0, 100), 0);
});
