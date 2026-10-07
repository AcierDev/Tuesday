import assert from "node:assert/strict";
import test from "node:test";
import { handleAskTuesday } from "../lib/ask-tuesday/http";
import { authorizeAskTuesday } from "../lib/ask-tuesday/access";
import { createAccessToken, SITE_ACCESS_COOKIE } from "../lib/site-access";
import { ASK_TUESDAY } from "../config/ask-tuesday";
import type { TuesdaySnapshot } from "../lib/ask-tuesday/types";

const now = "2026-10-06T23:30:00.000Z";
const snapshot: TuesdaySnapshot = {orders: [], activities: [], knowledge: null, ordersCheckedAt: now,
  activitiesCheckedAt: now, ordersTruncated: false, activitiesTruncated: false, limitations: []};
const request = (body: unknown, cookie?: string) => new Request("http://localhost/api/ask-tuesday", {
  method: "POST", headers: {"Content-Type": "application/json", ...(cookie ? {Cookie: cookie} : {})}, body: JSON.stringify(body),
});

test("unauthorized requests cannot read any source", async () => {
  let loaded = false;
  const response = await handleAskTuesday(request({question: "Harrison", page: "/orders"}), {
    authorize: async () => false, load: async () => {loaded = true; return snapshot;}, now: () => now,
  });
  assert.equal(response.status, 401);
  assert.equal(loaded, false);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("real signed site cookies are required, with expiry and secret enforced", async () => {
  const token = await createAccessToken("test-secret", Date.parse(now));
  const req = request({}, `${SITE_ACCESS_COOKIE}=${token}`);
  assert.equal(await authorizeAskTuesday(req, "test-secret", Date.parse(now)), true);
  assert.equal(await authorizeAskTuesday(req, "wrong", Date.parse(now)), false);
  assert.equal(await authorizeAskTuesday(req, "", Date.parse(now)), false);
  const expired = await createAccessToken("test-secret", Date.parse(now), -1);
  assert.equal(await authorizeAskTuesday(request({}, `${SITE_ACCESS_COOKIE}=${expired}`), "test-secret", Date.parse(now)), false);
});

test("malformed, empty, oversized and remote-page questions are rejected before source reads", async () => {
  let reads = 0;
  const deps = {authorize: async () => true, load: async () => {reads += 1; return snapshot;}, now: () => now};
  for (const body of [{question: " "}, {question: "x".repeat(ASK_TUESDAY.maxQuestionLength + 1), page: "/orders"},
    {question: "Harrison", page: "https://example.com/"}, {question: "Harrison", page: "/orders", orderSearch: {"$ne": null}}]) {
    const response = await handleAskTuesday(request(body), deps);
    assert.equal(response.status, 400);
  }
  const invalid = new Request("http://localhost/api/ask-tuesday", {method: "POST", body: "{"});
  assert.equal((await handleAskTuesday(invalid, deps)).status, 400);
  const large = new Request("http://localhost/api/ask-tuesday", {method: "POST", body: "x".repeat(ASK_TUESDAY.maxBodyBytes + 1)});
  assert.equal((await handleAskTuesday(large, deps)).status, 413);
  assert.equal(reads, 0);
});

test("successful questions expose evidence freshness and never call a write or model dependency", async () => {
  const response = await handleAskTuesday(request({question: "Which orders need attention?", page: "/orders"}), {
    authorize: async () => true, load: async () => snapshot, now: () => now,
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.mode, "record-search");
  assert.equal(data.capabilities.inference, "unavailable");
  assert.equal(data.freshness.ordersCheckedAt, now);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
