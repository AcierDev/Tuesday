import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareNewItemHistory, prepareItemPatchHistory } from "../lib/reporting/item-history";
import { orderIsVertical } from "../lib/order-orientation";
import { ItemStatus, type Item } from "../typings/types";

const TEST_NOW = 100;
const TEST_INDEX = 0;
const baseOrder: Item = {
  id: "orientation-example", customerName: "Alex Lee (custom) Keep darker blue",
  size: "32 x 16", tags: { isVertical: true, hasCustomerMessage: true },
  status: ItemStatus.New, visible: true, deleted: false,
  createdAt: TEST_NOW, index: TEST_INDEX,
};

test("create derives the exact vertical tag while preserving size and manual instructions", () => {
  const saved = prepareNewItemHistory(baseOrder, TEST_NOW);
  assert.equal(saved.customerName, "Alex Lee (custom) Keep darker blue (vertical)");
  assert.equal(saved.size, baseOrder.size);
  assert.equal(saved.tags?.hasCustomerMessage, true);
});

test("explicit horizontal edit removes only exact orientation tags", () => {
  const current = { ...baseOrder, customerName: "Alex Lee (Vertical) (custom) (vertical mounting needs checking)" };
  const saved = prepareItemPatchHistory(current, { tags: { ...current.tags, isVertical: false } }, TEST_NOW);
  assert.equal(saved.customerName, "Alex Lee (custom) (vertical mounting needs checking)");
  assert.equal(saved.tags?.isVertical, false);
  assert.equal(saved.size, undefined);
});

test("inline name edits cannot remove the saved vertical instruction", () => {
  const saved = prepareItemPatchHistory(baseOrder, { customerName: "Alex Lee Revised notes" }, TEST_NOW);
  assert.equal(saved.customerName, "Alex Lee Revised notes (vertical)");
  assert.equal(saved.tags, undefined);
});

test("repeated orientation tags canonicalize once when the name is saved", () => {
  const saved = prepareItemPatchHistory(baseOrder, { customerName: "Alex Lee (Vertical) (vertical)" }, TEST_NOW);
  assert.equal(saved.customerName, "Alex Lee (vertical)");
});

test("unrelated edits leave legacy names and undefined orientation untouched", () => {
  const legacy = { ...baseOrder, customerName: "Alex Lee (vertical)", tags: undefined };
  const saved = prepareItemPatchHistory(legacy, { notes: "Manual edit" }, TEST_NOW);
  assert.equal(saved.customerName, undefined);
  assert.equal(saved.tags, undefined);
  assert.equal(legacy.customerName, "Alex Lee (vertical)");
});

test("legacy manual vertical tag survives inline name edits when no setting exists", () => {
  const legacy = { ...baseOrder, tags: undefined, customerName: "Alex Lee (vertical)" };
  const saved = prepareItemPatchHistory(legacy, { customerName: "Alex Lee Updated note (vertical)" }, TEST_NOW);
  assert.equal(saved.customerName, "Alex Lee Updated note (vertical)");
  assert.equal(saved.tags, undefined);
});

test("a typed vertical tag on a create is kept even when the form saved horizontal", () => {
  const saved = prepareNewItemHistory({ ...baseOrder, customerName: "Alex Lee (vertical) Navy note", tags: { isVertical: false } }, TEST_NOW);
  assert.equal(saved.customerName, "Alex Lee Navy note (vertical)");
  assert.equal(saved.tags?.isVertical, true);
});

test("an unrelated tag edit preserves the saved orientation", () => {
  const saved = prepareItemPatchHistory(baseOrder, { tags: { hasCustomerMessage: false } }, TEST_NOW);
  assert.deepEqual(saved.tags, { isVertical: true, hasCustomerMessage: false });
  assert.equal(saved.customerName, undefined);
});

// The original form saved isVertical: false on every order, so many vertical
// orders carry the name tag with a false flag.
const legacyFalseFlag: Item = { ...baseOrder, customerName: "Alex Lee (vertical) Navy note", tags: { isVertical: false } };

test("a saved false next to a name tag still reads as vertical", () => {
  assert.equal(orderIsVertical(legacyFalseFlag), true);
  assert.equal(orderIsVertical({ customerName: "Alex Lee", tags: { isVertical: false } }), false);
  assert.equal(orderIsVertical({ customerName: "Alex Lee", tags: { isVertical: true } }), true);
});

test("an older client resending isVertical false never strips the tag", () => {
  const saved = prepareItemPatchHistory(legacyFalseFlag, {
    customerName: "Alex Lee (vertical) Navy note, rush", tags: { isVertical: false, hasCustomerMessage: true },
  }, TEST_NOW);
  assert.equal(saved.customerName, "Alex Lee (vertical) Navy note, rush");
  assert.equal(saved.tags?.isVertical, true);
});

test("an inline name edit on a legacy order keeps the name exactly as typed", () => {
  const saved = prepareItemPatchHistory(legacyFalseFlag, { customerName: "Alex Lee (vertical) Updated" }, TEST_NOW);
  assert.equal(saved.customerName, "Alex Lee (vertical) Updated");
  assert.equal(saved.tags, undefined);
});

test("only turning a saved vertical choice off removes the tag", () => {
  const savedVertical = { ...legacyFalseFlag, tags: { isVertical: true } };
  assert.equal(prepareItemPatchHistory(savedVertical, { tags: { isVertical: false } }, TEST_NOW).customerName, "Alex Lee Navy note");
  assert.equal(prepareItemPatchHistory(legacyFalseFlag, { tags: { isVertical: false } }, TEST_NOW).customerName, undefined);
});
