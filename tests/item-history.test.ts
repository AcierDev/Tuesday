import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { prepareNewItemHistory, prepareItemPatchHistory } from "../lib/reporting/item-history";
import { ItemStatus, type Item } from "../typings/types";

const original: Item = {
  id: "item-1", createdAt: Date.parse("2026-09-01T12:00:00Z"),
  dueDate: "2026-09-20", status: ItemStatus.New,
  visible: true, deleted: false, index: 0,
};

test("new items preserve their first promised due date", () => {
  assert.equal(prepareNewItemHistory(original).originalDueDate, "2026-09-20");
  assert.equal(prepareNewItemHistory({ ...original, dueDate: "" }).originalDueDate, undefined);
});

test("completion freezes the due date without trusting client history fields", () => {
  const updates = prepareItemPatchHistory(original, {
    status: ItemStatus.Done, dueDate: "2026-09-25",
    originalDueDate: "2026-09-25", dueDateAtCompletion: "2026-09-25",
  }, Date.parse("2026-09-19T12:00:00Z"));
  assert.equal(updates.originalDueDate, undefined);
  assert.equal(updates.dueDateAtCompletion, "2026-09-25");
  assert.equal(updates.completedAt, Date.parse("2026-09-19T12:00:00Z"));
  assert.equal(prepareItemPatchHistory({ ...original, status: ItemStatus.Done, dueDateAtCompletion: "2026-09-20" }, {
    dueDate: "2026-09-30",
  }, Date.now()).dueDateAtCompletion, undefined);
});

test("the first due date entered after creation becomes the original promise", () => {
  const updates = prepareItemPatchHistory({ ...original, dueDate: "", originalDueDate: undefined, promiseTrackingStartedAt: Date.now() }, {
    dueDate: "2026-09-26",
  }, Date.now());
  assert.equal(updates.originalDueDate, "2026-09-26");
  assert.equal(prepareItemPatchHistory({ ...original, dueDate: "", originalDueDate: undefined }, {
    dueDate: "2026-09-26",
  }, Date.now()).originalDueDate, undefined);
});

test("completion state and its reporting event are committed in the same transaction", () => {
  const itemRoute = readFileSync(new URL("../app/api/items/route.ts", import.meta.url), "utf8");
  const labelCompletion = readFileSync(new URL(
    "../lib/shipping-labels/order-completion-server.ts",
    import.meta.url
  ), "utf8");
  const eventWriter = readFileSync(new URL(
    "../lib/reporting/completion-events-server.ts",
    import.meta.url
  ), "utf8");

  for (const source of [itemRoute, labelCompletion]) {
    assert.match(source, /withTransaction\s*\(/);
    assert.match(source, /recordCompletionEvent\([\s\S]*?session/);
  }
  assert.match(eventWriter, /session\??:\s*ClientSession/);
  assert.match(eventWriter, /updateOne\([\s\S]*?\{\s*upsert:\s*true,\s*session\s*\}/);
});
