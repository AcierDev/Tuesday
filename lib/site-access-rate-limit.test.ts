import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createSiteAccessLimiter, siteAccessClient } from "./site-access-rate-limit";

const TEST_WINDOW_MS = 60_000;
const TEST_MAX_PER_CLIENT = 3;
const TEST_MAX_TOTAL = 5;
const TEST_NOW = 1_700_000_000_000;
const limits = { windowMs: TEST_WINDOW_MS, maxPerClient: TEST_MAX_PER_CLIENT, maxTotal: TEST_MAX_TOTAL };

test("a client is blocked after its failure limit until the window ends", () => {
  const limiter = createSiteAccessLimiter(limits);
  for (let index = 0; index < TEST_MAX_PER_CLIENT; index++) {
    assert.equal(limiter.retryAfterMs("a", TEST_NOW), 0);
    limiter.recordFailure("a", TEST_NOW);
  }
  assert.equal(limiter.retryAfterMs("a", TEST_NOW), TEST_WINDOW_MS);
  assert.equal(limiter.retryAfterMs("b", TEST_NOW), 0);
  assert.equal(limiter.retryAfterMs("a", TEST_NOW + TEST_WINDOW_MS), 0);
});

test("a success clears the client's failures", () => {
  const limiter = createSiteAccessLimiter(limits);
  limiter.recordFailure("a", TEST_NOW);
  limiter.recordFailure("a", TEST_NOW);
  limiter.recordSuccess("a");
  limiter.recordFailure("a", TEST_NOW);
  assert.equal(limiter.retryAfterMs("a", TEST_NOW), 0);
});

test("rotating forged client addresses still hits the shared ceiling", () => {
  const limiter = createSiteAccessLimiter(limits);
  for (let index = 0; index < TEST_MAX_TOTAL; index++) limiter.recordFailure(`client-${index}`, TEST_NOW);
  assert.equal(limiter.retryAfterMs("fresh-client", TEST_NOW), TEST_WINDOW_MS);
});

test("the client is the first forwarded hop", () => {
  const request = (headers: Record<string, string>) => new Request("http://localhost/api/site-access", { headers });
  assert.equal(siteAccessClient(request({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" })), "203.0.113.7");
  assert.equal(siteAccessClient(request({ "x-real-ip": "198.51.100.2" })), "198.51.100.2");
  assert.equal(siteAccessClient(request({})), "unknown");
});
