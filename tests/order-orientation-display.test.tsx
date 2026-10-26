import assert from "node:assert/strict";
import { test } from "node:test";
import { parseNameTokens } from "../components/orders/name-tokens";

test("saved vertical setting displays a badge even without a manual name tag", () => {
  assert.equal(parseNameTokens("Alex Lee", true).isVertical, true);
});

test("saved horizontal setting wins over a conflicting legacy manual tag", () => {
  const displayed = parseNameTokens("Alex Lee (vertical) Navy note", false);
  assert.equal(displayed.isVertical, false);
  assert.equal(displayed.displayName, "Alex Lee Navy note");
});

test("unconfigured legacy orientation preserves the manual tag display", () => {
  assert.equal(parseNameTokens("Alex Lee (vertical)").isVertical, true);
  assert.equal(parseNameTokens("Alex Lee").isVertical, false);
});

test("duplicate exact orientation tags do not appear in employee name text", () => {
  assert.equal(parseNameTokens("Alex Lee (vertical) (Vertical)", true).displayName, "Alex Lee");
});
