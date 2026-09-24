import assert from "node:assert/strict";
import test from "node:test";

import { parseCompletedWindow, precedingWindow } from "../lib/reporting/window";

test("completed Wednesday-Tuesday window gets the exact preceding seven days", () => {
  const current = parseCompletedWindow("2026-09-16", "2026-09-22", "2026-09-23");
  assert.deepEqual(precedingWindow(current), { start: "2026-09-09", end: "2026-09-15" });
});

test("future, incomplete, reversed, and invalid dates are rejected", () => {
  assert.throws(() => parseCompletedWindow("2026-09-16", "2026-09-23", "2026-09-23"));
  assert.throws(() => parseCompletedWindow("2026-09-22", "2026-09-16", "2026-09-23"));
  assert.throws(() => parseCompletedWindow("2026-02-30", "2026-03-01", "2026-09-23"));
});
