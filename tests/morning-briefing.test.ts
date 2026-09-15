import assert from "node:assert/strict";
import { test } from "node:test";
import { deliverMorningBriefing, morningBriefingDay, isMorningBriefingPage, type MorningBriefingDeps } from "../lib/morning-briefing";
import type { DeliveryBriefing } from "../lib/delivery-briefing";

const TODAY = "2026-09-15";
const MORNING = "2026-09-15T14:00:00Z";
const REPORT = { date: TODAY, summary: "Prioritize overdue orders ready to ship." } as DeliveryBriefing;
function fixture() {
  let received: string | null = null;
  const shown: DeliveryBriefing[] = [];
  const deps: MorningBriefingDeps = {
    now: () => new Date(MORNING),
    available: () => true,
    readReceivedDay: () => received,
    writeReceivedDay: (day) => { received = day; },
    load: async () => ({ report: REPORT, pending: false }),
    show: (report) => { shown.push(report); },
  };
  return { deps, shown, received: () => received };
}

test("7am gate follows Pacific time in summer and winter", () => {
  assert.equal(morningBriefingDay(new Date("2026-09-15T13:59:59Z")), null);
  assert.equal(morningBriefingDay(new Date(MORNING)), TODAY);
  assert.equal(morningBriefingDay(new Date("2026-01-15T14:59:59Z")), null);
  assert.equal(morningBriefingDay(new Date("2026-01-15T15:00:00Z")), "2026-01-15");
  assert.equal(morningBriefingDay(new Date("2026-09-16T06:59:00Z")), TODAY);
});

test("only orders and production planner are eligible", () => {
  assert.equal(isMorningBriefingPage("/orders"), true);
  assert.equal(isMorningBriefingPage("/production-planning"), true);
  assert.equal(isMorningBriefingPage("/stats/overview"), false);
});

test("delivery survives reload checks and becomes eligible again next day", async () => {
  const { deps, shown } = fixture();
  await deliverMorningBriefing(deps);
  await deliverMorningBriefing({ ...deps });
  assert.deepEqual(shown, [REPORT]);
  const tomorrow = { ...REPORT, date: "2026-09-16" };
  await deliverMorningBriefing({ ...deps, now: () => new Date("2026-09-16T14:00:00Z"), load: async () => ({ report: tomorrow, pending: false }) });
  assert.deepEqual(shown, [REPORT, tomorrow]);
});

test("pending, stale, and failed requests do not consume delivery", async () => {
  const { deps, shown, received } = fixture();
  await deliverMorningBriefing({ ...deps, load: async () => ({ report: REPORT, pending: true }) });
  await deliverMorningBriefing({ ...deps, load: async () => ({ report: { ...REPORT, date: "2026-09-14" }, pending: false }) });
  await assert.rejects(deliverMorningBriefing({ ...deps, load: async () => { throw new Error("offline"); } }));
  assert.equal(received(), null);
  assert.deepEqual(shown, []);
  await deliverMorningBriefing(deps);
  assert.deepEqual(shown, [REPORT]);
});

test("hidden tabs and open dialogs defer delivery even if availability changes during fetch", async () => {
  const { deps, shown, received } = fixture();
  await deliverMorningBriefing({ ...deps, available: () => false, load: async () => { throw new Error("Should not fetch"); } });
  let available = true;
  await deliverMorningBriefing({ ...deps, available: () => available, load: async () => { available = false; return { report: REPORT, pending: false }; } });
  assert.deepEqual(shown, []);
  assert.equal(received(), null);
});

test("a different tab claiming the day during loading prevents duplicate display", async () => {
  const { deps, shown } = fixture();
  await deliverMorningBriefing({ ...deps, load: async () => {
    deps.writeReceivedDay(TODAY);
    return { report: REPORT, pending: false };
  } });
  assert.deepEqual(shown, []);
});

test("storage failure never creates a repeating automatic popup", async () => {
  const { deps, shown } = fixture();
  await assert.rejects(deliverMorningBriefing({ ...deps, writeReceivedDay: () => { throw new Error("Storage blocked"); } }));
  assert.deepEqual(shown, []);
});
