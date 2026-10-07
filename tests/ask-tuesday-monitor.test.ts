import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import type { Collection } from "mongodb";
import type { TuesdayScanResponse } from "../lib/ask-tuesday/types";
import { scanTuesdaySnapshot } from "../lib/ask-tuesday/scan";
import { ItemStatus } from "../typings/types";

const modulePromise = import("../lib/ask-tuesday/monitor").catch(() => null);
const configPromise = import("../config/tuesday-monitor").catch(() => null);
const BASE_TIME = Date.parse("2026-10-07T01:00:00.000Z");
const EMPTY_COUNT = 0;
const ONE_RECORD = 1;
const TWO_RECORDS = 2;
const DUPLICATE_KEY_ERROR = 11000;
const CHILD_TIMEOUT_MS = 10_000;
const LARGE_ORDER_COUNT = 500;
const LARGE_SAVED_FIELD_LENGTH = 12_000;
const LARGE_EXPECTED_ISSUE_COUNT = 1000;
const MONGO_DOCUMENT_BYTES = 16_777_216;
const MAX_COMPACT_DOCUMENT_BYTES = 4096;
const SENSITIVE_ERROR = "mongodb://secret-password@private-host/customer-data";
const scan: TuesdayScanResponse = {mode: "issue-scan", checkedAt: new Date(BASE_TIME).toISOString(),
  status: "checked", totalIssues: EMPTY_COUNT, issues: [], customerChats: [], orderIssues: [],
  freshness: {ordersCheckedAt: new Date(BASE_TIME).toISOString(), activitiesCheckedAt: null,
    reviewObservedOn: null, sourceUpdatedAt: null, importedAt: null},
  capabilities: {inference: "unavailable", liveEtsy: "unavailable", savedConversations: "unavailable"}, limitations: []};
const compactScan = {mode: "issue-scan", checkedAt: new Date(BASE_TIME).toISOString(), status: "checked", totalIssues: EMPTY_COUNT,
  orderIssueCount: EMPTY_COUNT, customerChatCount: EMPTY_COUNT};

async function implementation() {
  const [module, config] = await Promise.all([modulePromise, configPromise]);
  assert.ok(module && config, "The background monitor implementation is missing.");
  return { ...module, ...config };
}

type Document = Record<string, unknown>;
function matches(document: Document, filter: Document): boolean {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return (value as Document[]).some(branch => matches(document, branch));
    if (value && typeof value === "object") {
      const condition = value as Document;
      return Object.entries(condition).every(([operator, expected]) => operator === "$exists"
        ? (document[key] !== undefined) === expected
        : operator === "$lte" ? (document[key] as number) <= (expected as number)
        : operator === "$gt" ? (document[key] as number) > (expected as number) : false);
    }
    return document[key] === value;
  });
}

function memoryCollection() {
  const state: {document: Document | null; rejectPublish: boolean; rejectFailure: boolean; operations: Document[]} = {
    document: null, rejectPublish: false, rejectFailure: false, operations: [],
  };
  const apply = (update: Document) => {
    Object.assign(state.document!, update.$set);
    for (const key of Object.keys((update.$unset ?? {}) as Document)) delete state.document![key];
  };
  const collection = {
    async findOneAndUpdate(filter: Document, update: Document, options: {upsert?: boolean}) {
      state.operations.push({operation: "claim", filter, update});
      if (state.document && !matches(state.document, filter)) {
        if (options.upsert) throw Object.assign(new Error(SENSITIVE_ERROR), {code: DUPLICATE_KEY_ERROR});
        return null;
      }
      state.document ??= {_id: filter._id};
      apply(update);
      return {...state.document};
    },
    async updateOne(filter: Document, update: Document) {
      state.operations.push({operation: "update", filter, update});
      const values = update.$set as Document | undefined;
      if ((state.rejectPublish && values?.scan) || (state.rejectFailure && values?.status === "failed")) {
        throw new Error(SENSITIVE_ERROR);
      }
      if (!state.document || !matches(state.document, filter)) return {matchedCount: EMPTY_COUNT};
      apply(update);
      return {matchedCount: ONE_RECORD};
    },
  } as unknown as Collection<import("../lib/ask-tuesday/monitor").TuesdayMonitorDocument>;
  return {state, collection};
}

function runOptions(collection: ReturnType<typeof memoryCollection>["collection"], overrides: Record<string, unknown> = {}) {
  return {collection, now: () => new Date(BASE_TIME).toISOString(), makeToken: () => "worker-a",
    work: async () => ({scan, generated: ONE_RECORD, failed: EMPTY_COUNT}), ...overrides};
}

test("persistent production startup is enabled while development, builds, edge and serverless are excluded", async () => {
  const {shouldStartTuesdayMonitor} = await implementation();
  const production = {NODE_ENV: "production", NEXT_RUNTIME: "nodejs"};
  assert.equal(shouldStartTuesdayMonitor(production), true);
  for (const environment of [
    {...production, NODE_ENV: "development"}, {...production, NEXT_RUNTIME: "edge"},
    {...production, NEXT_PHASE: "phase-production-build"}, {...production, NEXT_PRIVATE_BUILD_WORKER: "1"},
    {...production, VERCEL: "1"}, {...production, AWS_LAMBDA_FUNCTION_NAME: "function"},
    {...production, NETLIFY: "true"}, {...production, ASK_TUESDAY_MONITOR_ENABLED: "false"},
    {...production, ASK_TUESDAY_MONITOR_ENABLED: "0"},
  ]) assert.equal(shouldStartTuesdayMonitor(environment), false);
});

test("successful checks publish a scan and release only the owned lease", async () => {
  const {runTuesdayMonitor, TUESDAY_MONITOR} = await implementation();
  const {collection, state} = memoryCollection();
  const result = await runTuesdayMonitor(runOptions(collection));
  assert.equal(result, "saved");
  assert.equal(state.document?._id, TUESDAY_MONITOR.documentId);
  assert.equal(state.document?.lastSuccessAt, new Date(BASE_TIME).toISOString());
  assert.equal(state.document?.status, "checked");
  assert.deepEqual(state.document?.summaryCounts, {generated: ONE_RECORD, failed: EMPTY_COUNT});
  assert.deepEqual(state.document?.scan, compactScan);
  assert.equal(state.document?.leaseToken, undefined);
  assert.equal(state.document?.leaseUntil, undefined);
});

test("a second worker cannot do source work while the first owns the lease", async () => {
  const {runTuesdayMonitor} = await implementation();
  const {collection, state} = memoryCollection();
  let resolveWork!: () => void;
  const blocked = new Promise<void>(resolve => {resolveWork = resolve;});
  const first = runTuesdayMonitor(runOptions(collection, {work: async () => {
    await blocked; return {scan, generated: EMPTY_COUNT, failed: EMPTY_COUNT};
  }}));
  await new Promise<void>(resolve => setImmediate(resolve));
  const second = await runTuesdayMonitor(runOptions(collection, {makeToken: () => "worker-b", work: async () => {
    assert.fail("A competing worker must not read or summarize customer records.");
  }}));
  assert.equal(second, "skipped");
  assert.equal(state.document?.leaseToken, "worker-a");
  resolveWork();
  assert.equal(await first, "saved");
});

test("an expired worker cannot publish or clear a replacement worker's lease", async () => {
  const {runTuesdayMonitor, TUESDAY_MONITOR} = await implementation();
  const {collection, state} = memoryCollection();
  let time = BASE_TIME;
  const result = await runTuesdayMonitor(runOptions(collection, {now: () => new Date(time).toISOString(), work: async () => {
    time += TUESDAY_MONITOR.leaseDurationMs;
    state.document!.leaseToken = "replacement-worker";
    state.document!.leaseUntil = time + TUESDAY_MONITOR.leaseDurationMs;
    state.document!.lastSuccessAt = "replacement-success";
    return {scan, generated: ONE_RECORD, failed: EMPTY_COUNT};
  }}));
  assert.equal(result, "lost-lease");
  assert.equal(state.document?.scan, undefined);
  assert.equal(state.document?.lastSuccessAt, "replacement-success");
  assert.equal(state.document?.leaseToken, "replacement-worker");
});

test("expiry alone prevents success even when no replacement worker exists", async () => {
  const {runTuesdayMonitor, TUESDAY_MONITOR} = await implementation();
  const {collection, state} = memoryCollection();
  let time = BASE_TIME;
  const result = await runTuesdayMonitor(runOptions(collection, {now: () => new Date(time).toISOString(), work: async () => {
    time += TUESDAY_MONITOR.leaseDurationMs;
    return {scan, generated: EMPTY_COUNT, failed: EMPTY_COUNT};
  }}));
  assert.equal(result, "lost-lease");
  assert.equal(state.document?.lastSuccessAt, undefined);
  assert.equal(state.document?.scan, undefined);
});

test("a source failure preserves the previous successful scan and sanitizes its error", async () => {
  const {runTuesdayMonitor} = await implementation();
  const {collection, state} = memoryCollection();
  await runTuesdayMonitor(runOptions(collection));
  const previous = state.document?.scan;
  const previousSuccess = state.document?.lastSuccessAt;
  const result = await runTuesdayMonitor(runOptions(collection, {work: async () => {throw new Error(SENSITIVE_ERROR);}}));
  assert.equal(result, "failed");
  assert.equal(state.document?.scan, previous);
  assert.equal(state.document?.lastSuccessAt, previousSuccess);
  assert.equal(state.document?.status, "failed");
  assert.equal(state.document?.lastFailureAt, new Date(BASE_TIME).toISOString());
  assert.equal(typeof state.document?.error, "string");
  assert.equal(JSON.stringify(state.document).includes(SENSITIVE_ERROR), false);
  assert.equal(state.document?.leaseToken, undefined);
});

test("failed publish records a failure without claiming success", async () => {
  const {runTuesdayMonitor} = await implementation();
  const {collection, state} = memoryCollection();
  state.rejectPublish = true;
  assert.equal(await runTuesdayMonitor(runOptions(collection)), "failed");
  assert.equal(state.document?.scan, undefined);
  assert.equal(state.document?.lastSuccessAt, undefined);
  assert.equal(state.document?.status, "failed");
  assert.equal(state.document?.leaseToken, undefined);
});

test("lost leases cannot publish a source failure over newer status", async () => {
  const {runTuesdayMonitor, TUESDAY_MONITOR} = await implementation();
  const {collection, state} = memoryCollection();
  const result = await runTuesdayMonitor(runOptions(collection, {work: async () => {
    state.document!.leaseToken = "new-owner";
    state.document!.leaseUntil = BASE_TIME + TUESDAY_MONITOR.leaseDurationMs;
    state.document!.status = "checked";
    throw new Error(SENSITIVE_ERROR);
  }}));
  assert.equal(result, "lost-lease");
  assert.equal(state.document?.status, "checked");
  assert.equal(state.document?.error, undefined);
  assert.equal(state.document?.leaseToken, "new-owner");
});

test("summary-generation failures retain board results but cannot claim a fully checked run", async () => {
  const {runTuesdayMonitor} = await implementation();
  const {collection, state} = memoryCollection();
  assert.equal(await runTuesdayMonitor(runOptions(collection, {work: async () => ({scan, generated: EMPTY_COUNT, failed: ONE_RECORD})})), "saved");
  assert.deepEqual(state.document?.scan, compactScan);
  assert.equal(state.document?.status, "partial");
  assert.equal(state.document?.lastFailureAt, new Date(BASE_TIME).toISOString());
  assert.equal(typeof state.document?.error, "string");
});

test("the singleton runs immediately, retries after failure, and does not overlap ticks", async context => {
  const {startTuesdayMonitor, TUESDAY_MONITOR} = await implementation();
  context.mock.timers.enable({apis: ["setInterval"]});
  let attempts = EMPTY_COUNT;
  let finish!: () => void;
  const blocked = new Promise<void>(resolve => {finish = resolve;});
  const loop = startTuesdayMonitor({tick: async () => {attempts += ONE_RECORD; await blocked;}});
  context.after(() => loop.stop());
  assert.equal(attempts, ONE_RECORD);
  assert.equal(startTuesdayMonitor({tick: async () => {assert.fail("Duplicate singleton was started.");}}), loop);
  context.mock.timers.tick(TUESDAY_MONITOR.intervalMs);
  assert.equal(attempts, ONE_RECORD);
  finish();
  await new Promise<void>(resolve => setImmediate(resolve));
  context.mock.timers.tick(TUESDAY_MONITOR.intervalMs);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(attempts, TWO_RECORDS);
});

test("the loop handles a rejected tick and continues polling without exposing the error", async context => {
  const {startTuesdayMonitor, TUESDAY_MONITOR} = await implementation();
  context.mock.timers.enable({apis: ["setInterval"]});
  let attempts = EMPTY_COUNT;
  const loop = startTuesdayMonitor({tick: async () => {attempts += ONE_RECORD; throw new Error(SENSITIVE_ERROR);}});
  context.after(() => loop.stop());
  await new Promise<void>(resolve => setImmediate(resolve));
  context.mock.timers.tick(TUESDAY_MONITOR.intervalMs);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(attempts, TWO_RECORDS);
});

test("the actual disabled startup hook does not load database or create background timers", () => {
  const environment: NodeJS.ProcessEnv = {...process.env, NODE_ENV: "production", NEXT_RUNTIME: "nodejs", ASK_TUESDAY_MONITOR_ENABLED: "false"};
  delete environment.MONGODB_URI;
  const url = new URL("../instrumentation.ts", import.meta.url).href;
  const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", `
    globalThis.setInterval = () => {throw new Error("Unexpected background timer");};
    const loaded = await import(${JSON.stringify(url)});
    await (loaded.default ?? loaded).register();
  `], {cwd: fileURLToPath(new URL("../", import.meta.url)), env: environment, encoding: "utf8", timeout: CHILD_TIMEOUT_MS});
  assert.ifError(child.error);
  assert.equal(child.status, EMPTY_COUNT, child.stderr);
  assert.equal(child.stderr, "");
});

test("a database failure never exposes private connection errors", async () => {
  const {runTuesdayMonitor, TUESDAY_MONITOR} = await implementation();
  const {collection} = memoryCollection();
  collection.findOneAndUpdate = async () => {throw new Error(SENSITIVE_ERROR);};
  await assert.rejects(runTuesdayMonitor(runOptions(collection)), error =>
    error instanceof Error && error.message === TUESDAY_MONITOR.failureMessage);
});

test("failure-status write rejection releases the owned lease and surfaces only a sanitized failure", async () => {
  const {runTuesdayMonitor, TUESDAY_MONITOR} = await implementation();
  const {collection, state} = memoryCollection();
  state.rejectFailure = true;
  await assert.rejects(runTuesdayMonitor(runOptions(collection, {work: async () => {throw new Error(SENSITIVE_ERROR);}})), error =>
    error instanceof Error && error.message === TUESDAY_MONITOR.failureMessage);
  assert.equal(state.document?.leaseToken, undefined);
  assert.equal(state.document?.lastSuccessAt, undefined);
});

test("a worst-case active board persists only compact scan counts while preserving employee details", async () => {
  const {runTuesdayMonitor} = await implementation();
  const {collection, state} = memoryCollection();
  const checkedAt = new Date(BASE_TIME).toISOString();
  const source = scanTuesdaySnapshot({
    orders: Array.from({length: LARGE_ORDER_COUNT}, (_, index) => ({
      id: `active-order-${index}`, customerName: `Buyer ${index}`, status: ItemStatus.New,
      visible: true, deleted: false, onHold: false, dueDate: "2026-10-01", design: "Example", size: "Large",
      notes: "x".repeat(LARGE_SAVED_FIELD_LENGTH), labels: `AI needs double check ${"y".repeat(LARGE_SAVED_FIELD_LENGTH)}`,
      tags: {},
    })), activities: [], knowledge: null, ordersCheckedAt: checkedAt, activitiesCheckedAt: checkedAt,
    ordersTruncated: false, activitiesTruncated: false, limitations: [],
  }, checkedAt);
  assert.ok(Buffer.byteLength(JSON.stringify(source)) > MONGO_DOCUMENT_BYTES);
  assert.equal(source.totalIssues, LARGE_EXPECTED_ISSUE_COUNT);
  assert.equal(source.orderIssues?.length, LARGE_EXPECTED_ISSUE_COUNT);
  const employeeIssues = source.orderIssues;
  const employeeFacts = [...source.orderIssues![EMPTY_COUNT]!.facts];
  assert.equal(await runTuesdayMonitor(runOptions(collection, {work: async () => ({scan: source, generated: EMPTY_COUNT, failed: EMPTY_COUNT})})), "saved");
  assert.deepEqual(state.document?.scan, {
    mode: "issue-scan", checkedAt, status: "partial", totalIssues: LARGE_EXPECTED_ISSUE_COUNT,
    orderIssueCount: LARGE_EXPECTED_ISSUE_COUNT, customerChatCount: EMPTY_COUNT,
  });
  assert.ok(Buffer.byteLength(JSON.stringify(state.document)) < MAX_COMPACT_DOCUMENT_BYTES);
  assert.equal(source.orderIssues, employeeIssues);
  assert.equal(source.orderIssues?.length, LARGE_EXPECTED_ISSUE_COUNT);
  assert.deepEqual(source.orderIssues?.[EMPTY_COUNT]?.facts, employeeFacts);
});
