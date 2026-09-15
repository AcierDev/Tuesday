import assert from "node:assert/strict";
import test from "node:test";
import { ItemStatus } from "../typings/types";
import { calculateDeliveryMetrics, deliverySeverity, fallbackDeliverySummary, isMidnightPacific, type DeliveryItem } from "../lib/delivery-briefing";

const TODAY = "2026-09-14";
const OPEN: DeliveryItem = { status: ItemStatus.New, dueDate: "2026-09-15", visible: true, deleted: false };
const COMPLETED_AT = Date.parse("2026-09-13T18:00:00Z");

test("counts overdue active work but excludes paused, hidden, deleted and done items", () => {
  const overdue = { ...OPEN, dueDate: "2026-09-10" };
  const metrics = calculateDeliveryMetrics([
    overdue, { ...overdue, status: ItemStatus.At_The_Door },
    { ...overdue, onHold: true }, { ...overdue, visible: false },
    { ...overdue, deleted: true }, { ...overdue, status: ItemStatus.Hidden },
    { ...overdue, status: ItemStatus.Done, completedAt: COMPLETED_AT },
    { ...OPEN, dueDate: TODAY },
  ], TODAY);
  assert.equal(metrics.active, 3);
  assert.equal(metrics.overdue, 2);
  assert.equal(metrics.oldestOverdueDays, 4);
  assert.equal(metrics.overdueReadyToShip, 1);
  assert.equal(metrics.dueSoon, 1);
  assert.equal(metrics.overdueDays, 8);
});

test("uses completed Pacific calendar days and Done status for shipping history", () => {
  const metrics = calculateDeliveryMetrics([
    { ...OPEN, status: ItemStatus.Done, dueDate: "2026-09-13", completedAt: Date.parse("2026-09-14T06:59:00Z") },
    { ...OPEN, status: ItemStatus.Done, dueDate: "2026-09-13", completedAt: Date.parse("2026-09-14T07:00:00Z") },
    { ...OPEN, status: ItemStatus.New, completedAt: COMPLETED_AT },
    { ...OPEN, status: ItemStatus.Done, dueDate: "2026-09-12", completedAt: COMPLETED_AT },
    { ...OPEN, status: ItemStatus.Done, dueDate: undefined, completedAt: COMPLETED_AT },
  ], TODAY);
  assert.equal(metrics.shipped, 3);
  assert.equal(metrics.shippedWithDueDate, 2);
  assert.equal(metrics.onTimePercent, 50);
  assert.equal(metrics.active, 1);
});

test("missing or impossible dates and absent history are unknown rather than healthy", () => {
  const metrics = calculateDeliveryMetrics([
    { ...OPEN, dueDate: undefined }, { ...OPEN, dueDate: "2026-02-30" },
    { ...OPEN, dueDate: "invalid" },
  ], TODAY);
  assert.equal(metrics.missingDueDate, 3);
  assert.equal(metrics.overdue, 0);
  assert.equal(metrics.onTimePercent, null);
  assert.equal(metrics.expectedWeeklyShipments, null);
  assert.equal(deliverySeverity(metrics), "unknown");
  assert.match(fallbackDeliverySummary(metrics), /missing|valid/i);
});

test("flags severe lateness even when completed work was on time", () => {
  const metrics = calculateDeliveryMetrics([{ ...OPEN, dueDate: "2026-08-01" }], TODAY);
  assert.equal(deliverySeverity(metrics), "critical");
});

test("due-soon window includes today and excludes the next window", () => {
  const metrics = calculateDeliveryMetrics([
    { ...OPEN, dueDate: TODAY }, { ...OPEN, dueDate: "2026-09-20" },
    { ...OPEN, dueDate: "2026-09-21" },
  ], TODAY);
  assert.equal(metrics.dueSoon, 2);
});

test("midnight cron gate follows Pacific daylight saving time", () => {
  assert.equal(isMidnightPacific(new Date("2026-09-14T07:05:00Z")), true);
  assert.equal(isMidnightPacific(new Date("2026-09-14T08:05:00Z")), false);
  assert.equal(isMidnightPacific(new Date("2026-12-14T07:05:00Z")), false);
  assert.equal(isMidnightPacific(new Date("2026-12-14T08:05:00Z")), true);
});

test("AI failure leaves a usable calculated briefing", async () => {
  const { buildDeliveryNarrative } = await import("../lib/delivery-briefing");
  const metrics = calculateDeliveryMetrics([OPEN], TODAY);
  const narrative = await buildDeliveryNarrative(metrics, null, async () => { throw new Error("quota exceeded"); });
  assert.equal(narrative.source, "calculated");
  assert.match(narrative.summary, /1 more are due/);
});

test("AI receives aggregate evidence and returns the daily narrative", async () => {
  const { buildDeliveryNarrative } = await import("../lib/delivery-briefing");
  const metrics = calculateDeliveryMetrics([OPEN], TODAY);
  const narrative = await buildDeliveryNarrative(metrics, null, async prompt => {
    assert.match(prompt, /Calculated severity: Needs attention/);
    assert.match(prompt, /"dueSoon":1/);
    return "Upcoming deadlines need attention.";
  });
  assert.equal(narrative.source, "ai");
  assert.equal(narrative.summary, "Upcoming deadlines need attention.");
});

test("severity reflects recent on-time results when there is enough history", () => {
  const SAMPLE_SIZE = 10;
  const ALL_ON_TIME = 10;
  const MOST_ON_TIME = 8;
  const HALF_ON_TIME = 5;
  const makeHistory = (onTimeCount: number) => Array.from({ length: SAMPLE_SIZE }, (_, index) => ({
    ...OPEN, status: ItemStatus.Done, completedAt: COMPLETED_AT,
    dueDate: index < onTimeCount ? "2026-09-13" : "2026-09-10",
  }));
  assert.equal(deliverySeverity(calculateDeliveryMetrics(makeHistory(ALL_ON_TIME), TODAY)), "on_track");
  assert.equal(deliverySeverity(calculateDeliveryMetrics(makeHistory(MOST_ON_TIME), TODAY)), "behind");
  assert.equal(deliverySeverity(calculateDeliveryMetrics(makeHistory(HALF_ON_TIME), TODAY)), "critical");
});
