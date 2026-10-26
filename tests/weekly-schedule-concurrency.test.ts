import assert from "node:assert/strict";
import { test } from "node:test";

import {
  scheduleVersion,
  versionedScheduleFilter,
  type VersionedWeeklySchedule,
} from "../app/api/weekly-schedules/version";
import { useWeeklyScheduleStore } from "../stores/useWeeklyScheduleStore";
import { flushStatsInvalidation } from "../lib/stats-shared";

const WEEK = "2026-11-01";
const HTTP_CONFLICT = 409;
const JSON_HEADERS = { "Content-Type": "application/json" };
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: JSON_HEADERS });

function week(version: number | undefined, mondayIds: string[]): VersionedWeeklySchedule {
  return {
    weekKey: WEEK,
    ...(version === undefined ? {} : { version }),
    schedule: {
      Sunday: [], Monday: mondayIds.map((id) => ({ id, done: false })), Tuesday: [],
      Wednesday: [], Thursday: [], Friday: [], Saturday: [],
    },
  };
}

type FetchInit = Parameters<typeof fetch>[1];

async function withFetch(
  handler: (url: string, init: FetchInit) => Promise<Response>,
  run: () => Promise<void>
) {
  const originalFetch = globalThis.fetch;
  const originalState = useWeeklyScheduleStore.getState();
  globalThis.fetch = ((input: Parameters<typeof fetch>[0], init?: FetchInit) =>
    handler(String(input), init)) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
    useWeeklyScheduleStore.setState(originalState);
    flushStatsInvalidation();
  }
}

test("version helpers treat legacy docs (no version) as 0", () => {
  assert.equal(scheduleVersion(undefined), 0);
  assert.equal(scheduleVersion({ weekKey: WEEK }), 0);
  assert.equal(scheduleVersion({ version: 4 }), 4);
  assert.equal(scheduleVersion({ version: -1 }), 0);
  assert.deepEqual(versionedScheduleFilter(WEEK, 0), { weekKey: WEEK, version: { $in: [null, 0] } });
  assert.deepEqual(versionedScheduleFilter(WEEK, 3), { weekKey: WEEK, version: 3 });
});

test("rapid edits to one week are sent in order, each on the previous version", async () => {
  const sent: number[] = [];
  let releaseFirst!: () => void;
  const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
  await withFetch(async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as VersionedWeeklySchedule;
    sent.push(body.version ?? -1);
    if (sent.length === 1) await firstGate;
    return json({ ok: true, version: (body.version ?? 0) + 1 });
  }, async () => {
    useWeeklyScheduleStore.setState({ schedules: [week(2, [])] });
    const store = useWeeklyScheduleStore.getState();
    const first = store.updateSchedule(WEEK, week(2, ["a"]));
    // Second drag is derived from the optimistic state (now v3).
    const optimistic = useWeeklyScheduleStore.getState().schedules[0]!;
    assert.equal(scheduleVersion(optimistic), 3);
    const second = store.updateSchedule(WEEK, { ...optimistic, schedule: week(3, ["a", "b"]).schedule });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(sent, [2], "second PATCH waits for the first");
    releaseFirst();
    await Promise.all([first, second]);
    assert.deepEqual(sent, [2, 3]);
  });
});

test("a 409 replaces the week with the server copy and drops queued edits built on the stale one", async () => {
  const server = week(5, ["kept-by-reconcile"]);
  let patches = 0;
  await withFetch(async (_url, init) => {
    if (init?.method === "PATCH") {
      patches += 1;
      return json({ error: "conflict", current: server }, HTTP_CONFLICT);
    }
    return json([server]);
  }, async () => {
    useWeeklyScheduleStore.setState({ schedules: [week(2, ["stale-entry"])] });
    const store = useWeeklyScheduleStore.getState();
    const stale = store.updateSchedule(WEEK, week(2, ["stale-entry", "x"]));
    const queued = store.updateSchedule(WEEK, week(3, ["stale-entry", "x", "y"]));
    await assert.rejects(stale, { name: "ScheduleConflictError" });
    await assert.rejects(queued, { name: "ScheduleConflictError" });
    assert.equal(patches, 1, "the queued edit is never sent");
    assert.deepEqual(useWeeklyScheduleStore.getState().schedules, [server]);
  });
});

test("fetchSchedules still loads when the reconcile pass fails", async () => {
  const stored = [week(1, ["a"])];
  await withFetch(async (url) => {
    if (url.includes("reconcile-overdue")) return json({ error: "boom" }, 500);
    return json(stored);
  }, async () => {
    useWeeklyScheduleStore.setState({ schedules: [], error: null });
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      await useWeeklyScheduleStore.getState().fetchSchedules();
    } finally {
      console.warn = originalWarn;
    }
    assert.deepEqual(useWeeklyScheduleStore.getState().schedules, stored);
    assert.equal(useWeeklyScheduleStore.getState().error, null);
  });
});

test("createWeek adopts the stored week when another tab created it first", async () => {
  const existing = week(7, ["other-tab"]);
  await withFetch(async () => json(existing), async () => {
    useWeeklyScheduleStore.setState({ schedules: [] });
    await useWeeklyScheduleStore.getState().createWeek(WEEK);
    assert.deepEqual(useWeeklyScheduleStore.getState().schedules, [existing]);
  });
});
