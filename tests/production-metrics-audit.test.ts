import assert from "node:assert/strict";
import { test } from "node:test";

import { laDayKey, laWallClockMs, shiftDayKey } from "../lib/debt-metrics";
import {
  bucketCompletionsByDay,
  bucketShippingSpendByDay,
  computeCurrentlyLate,
  computeHealthScore,
  computeOnTimeStats,
  computeStatusDurations,
  dayKeyFromWeekSlot,
  onTimeShipmentsToTarget,
  planWeekDayKeys,
  planWeekKeyForDay,
  recentGluedWindow,
  RECENCY_WEIGHTED_FORECAST,
  shipmentCost,
  summarizeGluedForecast,
  summarizeShippingSpend,
} from "../lib/production-metrics";
import { ItemStatus, type Activity, type Item } from "../typings/types";

const NOON = 12;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAY = "2026-10-20";
const at = (key: string) => laWallClockMs(key, NOON);

function item(overrides: Partial<Item>): Item {
  return {
    id: overrides.id ?? "item",
    customerName: "Fixture",
    status: ItemStatus.Done,
    createdAt: at("2026-10-01"),
    index: 0,
    visible: true,
    deleted: false,
    ...overrides,
  } as Item;
}

function statusChange(itemId: string, timestamp: number, oldValue: ItemStatus, newValue: ItemStatus): Activity {
  return {
    _id: `${itemId}-${timestamp}`,
    id: `${itemId}-${timestamp}`,
    itemId,
    timestamp,
    type: "status_change",
    changes: [{ field: "status", oldValue, newValue }],
  } as unknown as Activity;
}

test("completion metrics count Done items only — reopened orders keep a stale completedAt", () => {
  const done = item({ id: "done", completedAt: at(DAY), dueDate: DAY });
  const reopened = item({ id: "reopened", status: ItemStatus.Wip, completedAt: at(DAY), dueDate: DAY });
  const buckets = bucketCompletionsByDay([done, reopened], DAY, DAY);
  assert.deepEqual(buckets, [{ date: DAY, value: 1 }]);
  const onTime = computeOnTimeStats([done, reopened], DAY, DAY);
  assert.equal(onTime.total, 1);
  // The reopened order is past due again and must show as late.
  const lateIds = computeCurrentlyLate([reopened]).map((r) => r.item.id);
  assert.deepEqual(lateIds, ["reopened"]);
});

test("on-time % is null (not 0) when nothing with a due date shipped", () => {
  const stats = computeOnTimeStats([item({ status: ItemStatus.New })], DAY, DAY);
  assert.equal(stats.total, 0);
  assert.equal(stats.onTimePct, null);
});

test("bottlenecks skip items without status history and never add a Done segment", () => {
  const created = at("2026-10-01");
  const noHistory = item({ id: "no-history", createdAt: created, completedAt: at(DAY) });
  const withHistory = item({ id: "tracked", createdAt: created, completedAt: at("2026-10-05") });
  const activities = [
    statusChange("tracked", at("2026-10-03"), ItemStatus.New, ItemStatus.Wip),
    statusChange("tracked", at("2026-10-05"), ItemStatus.Wip, ItemStatus.Done),
  ];
  const rows = computeStatusDurations([noHistory, withHistory], activities);
  const byStatus = new Map(rows.map((r) => [r.status, r]));
  assert.equal(byStatus.has(ItemStatus.Done), false);
  assert.equal(byStatus.get(ItemStatus.New)?.count, 1);
  assert.equal(byStatus.get(ItemStatus.New)?.avgDays, 2);
  assert.equal(byStatus.get(ItemStatus.Wip)?.avgDays, 2);

  // Created before the oldest loaded activity → history may be truncated.
  const truncated = computeStatusDurations([withHistory], activities, created + MS_PER_DAY);
  assert.deepEqual(truncated, []);
});

test("on-time hint: consecutive on-time shipments needed to hit the target", () => {
  // (8 + n) / (10 + n) >= 0.95 → n = 30
  assert.equal(onTimeShipmentsToTarget(8, 10, 95), 30);
  assert.equal(onTimeShipmentsToTarget(19, 20, 95), 0);
  assert.equal(onTimeShipmentsToTarget(0, 0, 95), 0);
  // Weighted totals: 4.5 of 6 → (4.5 + n) / (6 + n) >= 0.95 → n = 24
  assert.equal(onTimeShipmentsToTarget(4.5, 6, 95), 24);
  assert.equal(onTimeShipmentsToTarget(1, 2, 100), null);
});

test("health velocity ignores today's partial day", () => {
  const today = laDayKey();
  const PER_DAY = 5;
  const items: Item[] = [];
  const dueFar = shiftDayKey(today, 365);
  for (let back = 1; back <= 14; back++) {
    const key = shiftDayKey(today, -back);
    for (let n = 0; n < PER_DAY; n++) {
      items.push(item({ id: `${key}-${n}`, completedAt: at(key), dueDate: dueFar }));
    }
  }
  // One order shipped so far today — would have read as a slowdown.
  items.push(item({ id: "today-1", completedAt: Math.min(Date.now(), at(today)), dueDate: dueFar }));
  const velocity = computeHealthScore(items).breakdown.find((r) => r.label === "Velocity");
  assert.ok(velocity);
  assert.equal(velocity.earned, velocity.weight);
});

test("shipping spend excludes unpriced and uploaded labels", () => {
  const ship = (cost: unknown, source?: string) => ({
    orderId: "o", carrier: "FedEx", serviceType: "GROUND", serviceName: "Ground",
    trackingNumber: "t", labelFilename: "f", labelUrl: "u", currency: "USD",
    packages: [], shipFrom: {}, shipTo: {}, purchasedAt: at(DAY),
    totalNetCharge: cost, ...(source ? { source } : {}),
  }) as unknown as Item["purchasedShipment"];
  assert.equal(shipmentCost(ship(12.5)), 12.5);
  assert.equal(shipmentCost(ship("8.25")), 8.25);
  assert.equal(shipmentCost(ship(0)), null);
  assert.equal(shipmentCost(ship(undefined)), null);
  assert.equal(shipmentCost(ship(20, "uploaded")), null);
  const items = [
    item({ id: "a", purchasedShipment: ship(10) }),
    item({ id: "b", purchasedShipment: ship(0) }),
    item({ id: "c", purchasedShipment: ship(30, "uploaded") }),
    item({ id: "d", purchasedShipment: ship(20) }),
  ];
  const summary = summarizeShippingSpend(bucketShippingSpendByDay(items, DAY, DAY));
  assert.equal(summary.count, 2);
  assert.equal(summary.total, 30);
  assert.equal(summary.avgPerShipment, 15);
});

test("planner week helpers: Sat → Fri keyed by Sunday, incl. DST weeks", () => {
  assert.equal(planWeekKeyForDay("2026-10-31"), "2026-11-01"); // Sat
  assert.equal(planWeekKeyForDay("2026-11-01"), "2026-11-01"); // Sun (DST end)
  assert.equal(planWeekKeyForDay("2026-11-06"), "2026-11-01"); // Fri
  assert.equal(planWeekKeyForDay("2027-03-13"), "2027-03-14"); // Sat before DST start
  assert.deepEqual(planWeekDayKeys("2026-11-01"), [
    "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03",
    "2026-11-04", "2026-11-05", "2026-11-06",
  ]);
  // Glue attribution puts a week's Saturday slot inside that planner week.
  assert.equal(dayKeyFromWeekSlot("2026-11-01", "Saturday"), "2026-10-31");
  assert.equal(dayKeyFromWeekSlot("2026-11-01", "Monday"), "2026-11-02");
});

test("glued forecast uses complete days only, over the shared recent window", () => {
  const today = "2026-11-01";
  const window = recentGluedWindow(today);
  assert.equal(window.end, today);
  assert.equal(window.start, shiftDayKey(today, -RECENCY_WEIGHTED_FORECAST.lookbackDays));
  const VALUE = 900;
  const buckets = [];
  for (let back = RECENCY_WEIGHTED_FORECAST.lookbackDays; back >= 1; back--) {
    buckets.push({ date: shiftDayKey(today, -back), value: VALUE });
  }
  buckets.push({ date: today, value: 50 }); // partial day so far
  assert.equal(summarizeGluedForecast(buckets, today).weightedAvgActive, VALUE);
});
