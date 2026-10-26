import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { SCHEDULED_JOBS } from "../config/scheduled-jobs";
import {
  isScheduledJobDue, localClock, runScheduledJob, shouldStartScheduledJobs, startScheduledJobs,
  type ScheduledJob, type ScheduledJobResult,
} from "../lib/server/scheduled-jobs";

// 2026-07-15 is PDT (UTC-7); 2026-12-15 is PST (UTC-8).
const PDT_00_29 = new Date("2026-07-15T07:29:00.000Z");
const PDT_00_30 = new Date("2026-07-15T07:30:00.000Z");
const PST_00_30 = new Date("2026-12-15T08:30:00.000Z");
const PST_23_59 = new Date("2026-12-16T07:59:00.000Z");
const PDT_10_00 = new Date("2026-07-15T17:00:00.000Z");
const NEXT_DAY_00_30 = new Date("2026-07-16T07:30:00.000Z");
const DUPLICATE_KEY_ERROR = 11000;
const ONE_RUN = 1;
const TWO_RUNS = 2;
const CHILD_TIMEOUT_MS = 10_000;
const SENSITIVE_ERROR = "mongodb://secret-password@private-host/customer-data";

type Document = Record<string, unknown>;
function matches(document: Document, filter: Document): boolean {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return (value as Document[]).some(branch => matches(document, branch));
    if (key === "$and") return (value as Document[]).every(branch => matches(document, branch));
    if (value && typeof value === "object") {
      return Object.entries(value as Document).every(([operator, expected]) => operator === "$exists"
        ? (document[key] !== undefined) === expected
        : operator === "$lte" ? (document[key] as number) <= (expected as number)
        : operator === "$ne" ? document[key] !== expected : false);
    }
    return document[key] === value;
  });
}

function memoryCollection() {
  const documents = new Map<string, Document>();
  const apply = (document: Document, update: Document) => {
    Object.assign(document, update.$set);
    for (const key of Object.keys((update.$unset ?? {}) as Document)) delete document[key];
  };
  const collection = {
    async findOne(filter: Document) {
      const document = documents.get(filter._id as string);
      return document ? {...document} : null;
    },
    async findOneAndUpdate(filter: Document, update: Document, options: {upsert?: boolean}) {
      const existing = documents.get(filter._id as string);
      if (existing && !matches(existing, filter)) {
        if (options.upsert) throw Object.assign(new Error(SENSITIVE_ERROR), {code: DUPLICATE_KEY_ERROR});
        return null;
      }
      const document = existing ?? {_id: filter._id};
      apply(document, update);
      documents.set(document._id as string, document);
      return {...document};
    },
    async updateOne(filter: Document, update: Document) {
      const document = documents.get(filter._id as string);
      if (!document || !matches(document, filter)) return {matchedCount: 0};
      apply(document, update);
      return {matchedCount: ONE_RUN};
    },
  };
  return {collection: collection as never, documents};
}

function job(run: ScheduledJob["run"] = async () => undefined, id: ScheduledJob["id"] = "health-snapshot"): ScheduledJob {
  return {id, run};
}
let tokenCount = 0;
const options = (collection: never, scheduled: ScheduledJob, now: Date) => ({
  collection, job: scheduled, now: () => now, makeToken: () => `token-${tokenCount++}`,
});

test("local clock follows Los Angeles daylight saving time", () => {
  assert.deepEqual(localClock(PDT_00_30), {date: "2026-07-15", minuteOfDay: 30});
  assert.deepEqual(localClock(PST_00_30), {date: "2026-12-15", minuteOfDay: 30});
  assert.deepEqual(localClock(PST_23_59), {date: "2026-12-15", minuteOfDay: 1439});
});

test("snapshots are due from 00:30 Pacific; the briefing from 00:05", () => {
  assert.equal(isScheduledJobDue("debt-snapshot", PDT_00_29), false);
  assert.equal(isScheduledJobDue("debt-snapshot", PDT_00_30), true);
  assert.equal(isScheduledJobDue("health-snapshot", PST_00_30), true);
  assert.equal(isScheduledJobDue("delivery-briefing", PDT_00_29), true);
  assert.equal(isScheduledJobDue("delivery-briefing", new Date("2026-07-15T07:04:00.000Z")), false);
});

test("a job runs once per local day and records the date", async () => {
  const {collection, documents} = memoryCollection();
  let runs = 0;
  const scheduled = job(async () => {runs += ONE_RUN;});
  assert.equal(await runScheduledJob(options(collection, scheduled, PDT_00_30)), "succeeded");
  assert.equal(await runScheduledJob(options(collection, scheduled, PDT_10_00)), "already-done");
  assert.equal(runs, ONE_RUN);
  const stored = documents.get("health-snapshot")!;
  assert.equal(stored.lastRunDate, "2026-07-15");
  assert.equal(stored.leaseToken, undefined);
  assert.equal(await runScheduledJob(options(collection, scheduled, NEXT_DAY_00_30)), "succeeded");
  assert.equal(runs, TWO_RUNS);
});

test("a second process skips while the first holds the lease", async () => {
  const {collection} = memoryCollection();
  let release!: () => void;
  const blocked = new Promise<void>(resolve => {release = resolve;});
  const first = runScheduledJob(options(collection, job(() => blocked), PDT_00_30));
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(await runScheduledJob(options(collection, job(), PDT_00_30)), "busy");
  release();
  assert.equal(await first, "succeeded");
});

test("an expired lease from a crashed process can be reclaimed", async () => {
  const {collection, documents} = memoryCollection();
  documents.set("health-snapshot", {_id: "health-snapshot", leaseToken: "crashed",
    leaseUntil: PDT_00_30.getTime() - ONE_RUN});
  assert.equal(await runScheduledJob(options(collection, job(), PDT_00_30)), "succeeded");
});

test("a failure is reported, releases the lease and waits before retrying", async () => {
  const {collection, documents} = memoryCollection();
  const reported: unknown[] = [];
  const failing = job(async () => {throw new Error(SENSITIVE_ERROR);});
  const result = await runScheduledJob({...options(collection, failing, PDT_00_30),
    reportError: (_id, error) => reported.push(error)});
  assert.equal(result, "failed");
  assert.equal(reported.length, ONE_RUN);
  const stored = documents.get("health-snapshot")!;
  assert.equal(stored.leaseToken, undefined);
  assert.equal(stored.error, SCHEDULED_JOBS.failureMessage);
  assert.equal(stored.lastRunDate, undefined);
  const beforeRetry = new Date(PDT_00_30.getTime() + SCHEDULED_JOBS.retryDelayMs - ONE_RUN);
  assert.equal(await runScheduledJob(options(collection, job(), beforeRetry)), "busy");
  const afterRetry = new Date(PDT_00_30.getTime() + SCHEDULED_JOBS.retryDelayMs);
  assert.equal(await runScheduledJob(options(collection, job(), afterRetry)), "succeeded");
  assert.equal(documents.get("health-snapshot")!.retryAt, undefined);
});

test("runs long after the scheduled time are marked as catch-up", async () => {
  const {collection} = memoryCollection();
  const seen: boolean[] = [];
  const recordCatchUp = job(async ({catchUp}) => {seen.push(catchUp);}, "debt-snapshot");
  await runScheduledJob(options(collection, recordCatchUp, PDT_00_30));
  await runScheduledJob(options(collection, recordCatchUp, new Date("2026-07-16T17:00:00.000Z")));
  assert.deepEqual(seen, [false, true]);
});

test("the loop catches up at startup, skips jobs not yet due and finished jobs", async context => {
  context.mock.timers.enable({apis: ["setInterval"]});
  let now = PDT_00_29;
  const calls: string[] = [];
  const loop = startScheduledJobs({
    jobs: [job(undefined, "delivery-briefing"), job(undefined, "debt-snapshot")],
    runJob: async scheduled => {calls.push(scheduled.id); return "succeeded" satisfies ScheduledJobResult;},
    now: () => now,
  });
  context.after(() => loop.stop());
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ["delivery-briefing"]);
  now = PDT_00_30;
  context.mock.timers.tick(SCHEDULED_JOBS.checkIntervalMs);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ["delivery-briefing", "debt-snapshot"]);
  context.mock.timers.tick(SCHEDULED_JOBS.checkIntervalMs);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(calls.length, TWO_RUNS);
});

test("the loop reports a failing job and still runs the others", async context => {
  context.mock.timers.enable({apis: ["setInterval"]});
  const failures: string[] = [];
  const calls: string[] = [];
  const loop = startScheduledJobs({
    jobs: [job(undefined, "health-snapshot"), job(undefined, "backlog-snapshot")],
    runJob: async scheduled => {
      calls.push(scheduled.id);
      if (scheduled.id === "health-snapshot") throw new Error(SENSITIVE_ERROR);
      return "succeeded";
    },
    now: () => PDT_10_00,
    reportFailure: id => failures.push(id),
  });
  context.after(() => loop.stop());
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ["health-snapshot", "backlog-snapshot"]);
  assert.deepEqual(failures, ["health-snapshot"]);
});

test("the scheduler uses the monitor's production gating with its own opt-out flag", () => {
  const production = {NODE_ENV: "production", NEXT_RUNTIME: "nodejs"};
  assert.equal(shouldStartScheduledJobs(production), true);
  assert.equal(shouldStartScheduledJobs({...production, SCHEDULED_JOBS_ENABLED: "false"}), false);
  assert.equal(shouldStartScheduledJobs({...production, ASK_TUESDAY_MONITOR_ENABLED: "false"}), true);
  assert.equal(shouldStartScheduledJobs({...production, NEXT_PHASE: "phase-production-build"}), false);
  assert.equal(shouldStartScheduledJobs({NODE_ENV: "development", NEXT_RUNTIME: "nodejs"}), false);
});

test("the startup hook starts the scheduler timer only when enabled", () => {
  const url = new URL("../instrumentation.ts", import.meta.url).href;
  const marker = "SCHEDULER_TIMER";
  for (const enabled of [true, false]) {
    const environment: NodeJS.ProcessEnv = {...process.env, NODE_ENV: "production", NEXT_RUNTIME: "nodejs",
      ASK_TUESDAY_MONITOR_ENABLED: "false", SCHEDULED_JOBS_ENABLED: String(enabled)};
    delete environment.MONGODB_URI;
    const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", `
      globalThis.setInterval = () => {throw new Error(${JSON.stringify(marker)});};
      const loaded = await import(${JSON.stringify(url)});
      await (loaded.default ?? loaded).register().then(
        () => process.exit(${JSON.stringify(enabled)} ? 1 : 0),
        error => process.exit(error?.message === ${JSON.stringify(marker)} && ${JSON.stringify(enabled)} ? 0 : 1));
    `], {cwd: fileURLToPath(new URL("../", import.meta.url)), env: environment, encoding: "utf8", timeout: CHILD_TIMEOUT_MS});
    assert.ifError(child.error);
    assert.equal(child.status, 0, `${enabled ? "enabled" : "disabled"}: ${child.stderr}`);
  }
});
