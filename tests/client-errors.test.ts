import assert from "node:assert/strict";
import test from "node:test";
import { CLIENT_ERRORS } from "../config/client-errors";
import { describeThrown, normalizeClientErrorReport } from "../lib/client-errors";
import {
  captureServerError, createClientErrorHandlers, errorFingerprint, recordClientError,
  type ClientErrorCollection, type StoredClientError,
} from "../lib/server/client-errors";
import { createSiteAccessLimiter } from "../lib/site-access-rate-limit";

const BASE_TIME = Date.parse("2026-10-26T12:00:00.000Z");
const ONE = 1;
const TWO = 2;
const HTTP_NO_CONTENT = 204;
const HTTP_BAD_REQUEST = 400;
const HTTP_PAYLOAD_TOO_LARGE = 413;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_OK = 200;
const SENSITIVE_ERROR = "mongodb://secret-password@private-host/customer-data";
const ENDPOINT = "http://localhost/api/client-errors";

type Stored = StoredClientError & {_id: number};
function memoryCollection() {
  const records: Stored[] = [];
  let nextId = 0;
  const matches = (record: Stored, filter: Record<string, any>) => Object.entries(filter).every(([key, value]) => {
    const field = record[key as keyof Stored];
    if (value && typeof value === "object" && "$gte" in value) return (field as Date) >= value.$gte;
    if (value && typeof value === "object" && "$in" in value) return value.$in.includes(field);
    return field === value;
  });
  const byRecent = () => [...records].sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());
  const collection = {
    async updateOne(filter: Record<string, any>, update: {$inc: {count: number}; $set: {lastSeenAt: Date}}) {
      const record = records.find(candidate => matches(candidate, filter));
      if (!record) return {matchedCount: 0};
      record.count += update.$inc.count;
      record.lastSeenAt = update.$set.lastSeenAt;
      return {matchedCount: ONE};
    },
    async insertOne(document: StoredClientError) {
      records.push({...document, _id: nextId++});
      return {acknowledged: true};
    },
    find(_filter: unknown, options: {skip?: number; limit?: number}) {
      return {async toArray() {
        const sorted = byRecent().slice(options.skip ?? 0);
        return options.limit ? sorted.slice(0, options.limit) : sorted;
      }};
    },
    async deleteMany(filter: {_id: {$in: number[]}}) {
      for (const id of filter._id.$in) records.splice(records.findIndex(record => record._id === id), ONE);
      return {deletedCount: filter._id.$in.length};
    },
    async countDocuments(filter: Record<string, any>) {
      return records.filter(record => matches(record, filter)).length;
    },
  };
  return {collection: collection as unknown as ClientErrorCollection, records};
}

const post = (body: string, headers: Record<string, string> = {}) =>
  new Request(ENDPOINT, {method: "POST", body, headers: {"content-type": "application/json", "x-forwarded-for": "10.0.0.1", ...headers}});

test("reports are validated and size-capped", () => {
  assert.equal(normalizeClientErrorReport(null), null);
  assert.equal(normalizeClientErrorReport({source: "window-error", message: "  "}), null);
  assert.equal(normalizeClientErrorReport({source: "server:forged", message: "x"}), null);
  const report = normalizeClientErrorReport({source: "window-error", message: "m".repeat(CLIENT_ERRORS.maxMessageLength + ONE),
    stack: "s".repeat(CLIENT_ERRORS.maxStackLength + ONE), url: "/orders", extra: "ignored"});
  assert.equal(report?.message.length, CLIENT_ERRORS.maxMessageLength);
  assert.equal(report?.stack?.length, CLIENT_ERRORS.maxStackLength);
  assert.deepEqual(Object.keys(report ?? {}).sort(), ["message", "source", "stack", "url"]);
});

test("non-Error rejections still produce a message", () => {
  assert.deepEqual(describeThrown("plain"), {message: "plain"});
  assert.deepEqual(describeThrown({code: TWO}), {message: "{\"code\":2}"});
  assert.equal(describeThrown(new TypeError("bad")).message, "bad");
});

test("repeats within the dedupe window increment one record", async () => {
  const {collection, records} = memoryCollection();
  const input = {source: "window-error", message: "boom", stack: "at x"};
  assert.equal(await recordClientError(collection, input, new Date(BASE_TIME)), "recorded");
  assert.equal(await recordClientError(collection, input, new Date(BASE_TIME + ONE)), "repeated");
  assert.equal(records.length, ONE);
  assert.equal(records[0]!.count, TWO);
  assert.equal(records[0]!.fingerprint, errorFingerprint("boom", "at x"));
  assert.equal(await recordClientError(collection, input, new Date(BASE_TIME + ONE + CLIENT_ERRORS.dedupeWindowMs + ONE)), "recorded");
  assert.equal(records.length, TWO);
  assert.equal(await recordClientError(collection, {...input, stack: "at y"}, new Date(BASE_TIME + TWO)), "recorded");
});

test("storage stays bounded by pruning the least recently seen records", async () => {
  const {collection, records} = memoryCollection();
  for (let index = 0; index <= CLIENT_ERRORS.maxStoredErrors; index++) {
    await recordClientError(collection, {source: "window-error", message: `error ${index}`}, new Date(BASE_TIME + index));
  }
  assert.equal(records.length, CLIENT_ERRORS.maxStoredErrors);
  assert.equal(records.some(record => record.message === "error 0"), false);
});

test("server errors are stored by kind and stack frames, never the private message", async context => {
  const logged = context.mock.method(console, "error", () => undefined);
  const {collection, records} = memoryCollection();
  const failure = Object.assign(new Error(SENSITIVE_ERROR), {name: "MongoServerSelectionError", code: "ECONNREFUSED"});
  await captureServerError("scheduler:health-snapshot", failure, async () => collection);
  assert.equal(records[0]!.source, "server:scheduler:health-snapshot");
  assert.equal(records[0]!.message, "MongoServerSelectionError (code ECONNREFUSED)");
  assert.ok(!JSON.stringify(records).includes("secret-password"));
  await captureServerError("broken", failure, async () => {throw new Error(SENSITIVE_ERROR);});
  assert.equal(logged.mock.callCount(), ONE);
  assert.ok(!String(logged.mock.calls[0]!.arguments[0]).includes("secret-password"));
});

test("POST stores a valid report with the user agent", async () => {
  const {collection, records} = memoryCollection();
  const {POST} = createClientErrorHandlers({collection: async () => collection, now: () => new Date(BASE_TIME)});
  const response = await POST(post(JSON.stringify({source: "error-boundary", message: "boom", digest: "123"}), {"user-agent": "Test"}));
  assert.equal(response.status, HTTP_NO_CONTENT);
  assert.equal(records[0]!.userAgent, "Test");
  assert.equal(records[0]!.digest, "123");
});

test("POST rejects invalid JSON, invalid reports and oversized bodies", async () => {
  const {collection, records} = memoryCollection();
  const {POST} = createClientErrorHandlers({collection: async () => collection});
  assert.equal((await POST(post("{"))).status, HTTP_BAD_REQUEST);
  assert.equal((await POST(post(JSON.stringify({source: "nope", message: "x"})))).status, HTTP_BAD_REQUEST);
  const huge = JSON.stringify({source: "window-error", message: "x", stack: "s".repeat(CLIENT_ERRORS.maxBodyBytes)});
  assert.equal((await POST(post(huge))).status, HTTP_PAYLOAD_TOO_LARGE);
  assert.equal(records.length, 0);
});

test("POST is rate-limited per client", async () => {
  const {collection} = memoryCollection();
  const limiter = createSiteAccessLimiter({windowMs: CLIENT_ERRORS.rateLimitWindowMs, maxPerClient: ONE, maxTotal: CLIENT_ERRORS.maxReportsTotal});
  const {POST} = createClientErrorHandlers({collection: async () => collection, limiter});
  const body = JSON.stringify({source: "window-error", message: "boom"});
  assert.equal((await POST(post(body))).status, HTTP_NO_CONTENT);
  const limited = await POST(post(body));
  assert.equal(limited.status, HTTP_TOO_MANY_REQUESTS);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.equal((await POST(post(body, {"x-forwarded-for": "10.0.0.2"}))).status, HTTP_NO_CONTENT);
});

test("GET lists recent errors with a capped limit and a recent count", async () => {
  const {collection} = memoryCollection();
  for (let index = 0; index < CLIENT_ERRORS.maxListLimit + ONE; index++) {
    await recordClientError(collection, {source: "window-error", message: `error ${index}`}, new Date(BASE_TIME + index));
  }
  const {GET} = createClientErrorHandlers({collection: async () => collection, now: () => new Date(BASE_TIME)});
  const capped = await GET(new Request(`${ENDPOINT}?limit=1000`));
  assert.equal(capped.status, HTTP_OK);
  const body = await capped.json() as {errors: StoredClientError[]; recentCount: number};
  assert.equal(body.errors.length, CLIENT_ERRORS.maxListLimit);
  assert.equal(body.recentCount, CLIENT_ERRORS.maxListLimit + ONE);
  const fallback = await (await GET(new Request(`${ENDPOINT}?limit=abc`))).json() as {errors: unknown[]};
  assert.equal(fallback.errors.length, CLIENT_ERRORS.defaultListLimit);
});
