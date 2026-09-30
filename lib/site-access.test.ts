import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createAccessToken, verifyAccessToken } from "./site-access";

const TEST_SECRET = "test-secret-long-enough-for-signing";
const TEST_NOW = 1_700_000_000_000;
const TEST_DURATION_MS = 60_000;

test("a signed browser token remains valid until it expires", async () => {
  const token = await createAccessToken(TEST_SECRET, TEST_NOW, TEST_DURATION_MS);
  assert.equal(await verifyAccessToken(token, TEST_SECRET, TEST_NOW), true);
  assert.equal(await verifyAccessToken(token, TEST_SECRET, TEST_NOW + TEST_DURATION_MS), false);
});

test("a changed token or different secret cannot grant access", async () => {
  const token = await createAccessToken(TEST_SECRET, TEST_NOW, TEST_DURATION_MS);
  assert.equal(await verifyAccessToken(`${token}x`, TEST_SECRET, TEST_NOW), false);
  assert.equal(await verifyAccessToken(token, "another-secret", TEST_NOW), false);
  assert.equal(await verifyAccessToken("invalid", TEST_SECRET, TEST_NOW), false);
});
