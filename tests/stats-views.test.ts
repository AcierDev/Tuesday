import assert from "node:assert/strict";
import { test } from "node:test";

import { laDayKey, laDayStartMs, laWallClockMs, shiftDayKey } from "../lib/debt-metrics";
import {
  bucketShippingSpendByDay,
  computeCurrentlyLate,
  computeLeadTimeStats,
  summarizeShippingSpend,
} from "../lib/production-metrics";
import {
  computeForecastView,
  computeHealthWhatIfView,
  computeLateView,
  computeOverviewView,
  computeTodayView,
} from "../lib/server/stats-views/active";
import {
  computeBottlenecksView,
  computeLeadTimeView,
  computeQualityView,
  computeTrendingView,
  computeWipView,
} from "../lib/server/stats-views/history";
import { STATS_VIEWS, StatsViewParamError, type StatsViewSources } from "../lib/server/stats-views";
import { STATS_VIEW_MAX_DAYS } from "../lib/server/stats-views/shared";
import { computeSummaryView } from "../lib/server/stats-views/summary";
import {
  computeDeliveryView,
  computeMapView,
  computeShippingView,
} from "../lib/server/stats-views/shipping";
import { ItemStatus, type Activity, type Item, type OrderTrackingInfo } from "../typings/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOON = 12;
// Fields a stats row may carry (StatsItemRef).
const ITEM_REF_FIELDS = new Set(["id", "customerName", "design", "size", "status", "dueDate"]);
// Row caps the views apply (mirrors the view modules' config).
const QUALITY_RECENT_LIMIT = 50;
const DELIVERY_RECENT_LIMIT = 30;
const TRENDING_TOP_ROWS = 12;
const AT_RISK_DAYS = 3;

const today = laDayKey();
const day = (offset: number) => shiftDayKey(today, offset);

function item(overrides: Partial<Item>): Item {
  return {
    id: overrides.id ?? "item",
    customerName: `Customer ${overrides.id ?? "item"}`,
    status: ItemStatus.New,
    createdAt: Date.now() - MS_PER_DAY,
    index: 0,
    visible: true,
    deleted: false,
    // Bulk the views must not forward.
    notes: "internal notes",
    shippingDetails: { state: "NV" },
    ...overrides,
  } as Item;
}

function statusChange(itemId: string, timestamp: number, oldValue: ItemStatus, newValue: ItemStatus, id = `${itemId}-${timestamp}`): Activity {
  return { _id: id, id, itemId, timestamp, type: "status_change", changes: [{ field: "status", oldValue, newValue }] } as unknown as Activity;
}

const jsonKeys = (value: unknown) => Object.keys(JSON.parse(JSON.stringify(value)) as object);

function assertTrimmed(ref: unknown) {
  for (const key of jsonKeys(ref)) assert.ok(ITEM_REF_FIELDS.has(key), `unexpected field ${key}`);
}

const activeFixture = (): Item[] => [
  item({ id: "late5", status: ItemStatus.Wip, dueDate: day(-5), size: "16 x 10" }),
  item({ id: "late1", status: ItemStatus.New, dueDate: day(-1), size: "8x8" }),
  item({ id: "due-today", status: ItemStatus.OnDeck, dueDate: day(0), size: "custom" }),
  item({ id: "risk2", status: ItemStatus.Packaging, dueDate: day(2), size: "10x10" }),
  item({ id: "risk3", status: ItemStatus.At_The_Door, dueDate: `${day(AT_RISK_DAYS)}T00:00:00.000Z` }),
  item({ id: "safe4", status: ItemStatus.New, dueDate: day(AT_RISK_DAYS + 1) }),
  item({ id: "hidden-late", status: ItemStatus.Hidden, dueDate: day(-9) }),
  item({ id: "done-today", status: ItemStatus.Done, completedAt: Date.now(), dueDate: day(-2) }),
  item({ id: "done-yesterday", status: ItemStatus.Done, completedAt: laWallClockMs(day(-1), NOON) }),
  item({ id: "reopened", status: ItemStatus.Wip, completedAt: Date.now(), dueDate: day(1) }),
];

test("today view: LA-day completions, due today, late and at-risk rows trimmed to refs", () => {
  const view = computeTodayView(activeFixture());
  assert.equal(view.completedToday, 1, "reopened and yesterday's completions excluded");
  assert.deepEqual(view.dueToday.map((r) => r.id), ["due-today"]);
  assert.deepEqual(view.lateNow.map((r) => [r.item.id, r.daysLate]), [["late5", 5], ["late1", 1]]);
  assert.deepEqual(view.atRisk.map((r) => [r.item.id, r.daysToDue]), [["reopened", 1], ["risk2", 2], ["risk3", 3]]);
  assert.equal(view.atRiskDays, AT_RISK_DAYS);
  for (const ref of [...view.dueToday, ...view.lateNow.map((r) => r.item), ...view.atRisk.map((r) => r.item)]) assertTrimmed(ref);
});

test("late view equals computeCurrentlyLate over open orders, trimmed", () => {
  const items = activeFixture();
  const view = computeLateView(items);
  const expected = computeCurrentlyLate(items.filter((i) => i.status !== ItemStatus.Done && i.status !== ItemStatus.Hidden));
  assert.deepEqual(view.rows.map((r) => [r.item.id, r.daysLate]), expected.map((r) => [r.item.id, r.daysLate]));
  view.rows.forEach((r) => assertTrimmed(r.item));
});

test("overview view: debt, late count and squares over open orders only", () => {
  const view = computeOverviewView(activeFixture());
  assert.equal(view.debt, 6);
  assert.equal(view.lateNow, 2);
  assert.equal(view.wipTotal, 7, "everything but Done and Hidden");
  assert.equal(view.wipSquares, 160 + 64 + 100);
  assert.equal(view.backlogSquares, 160 + 64, "New / On Deck / WIP only");
});

test("summary carries the overview's open-order totals (one request for the overview)", () => {
  const items = activeFixture();
  assert.deepEqual(computeSummaryView(items).openOrders, computeOverviewView(items));
});

test("forecast view: lead-time projection, sort order and day windows", () => {
  const now = Date.now();
  const history = [
    // Design A ships in 10 days, size 8x8 in 3 days.
    item({ id: "hA", status: ItemStatus.Done, design: "A", size: "20x20", createdAt: now - 40 * MS_PER_DAY, completedAt: now - 30 * MS_PER_DAY }),
    item({ id: "hS", status: ItemStatus.Done, design: "Z", size: "8x8", createdAt: now - 33 * MS_PER_DAY, completedAt: now - 30 * MS_PER_DAY }),
  ];
  const open = [
    item({ id: "a", design: "A", size: "1x1", createdAt: now - 2 * MS_PER_DAY }),
    item({ id: "s", design: "new-design", size: "8x8", createdAt: now }),
    item({ id: "old", design: "A", createdAt: now - 60 * MS_PER_DAY }),
  ];
  const view = computeForecastView([...history, ...open]);
  assert.deepEqual(view.rows.map((r) => r.item.id), ["old", "s", "a"]);
  const byId = new Map(view.rows.map((r) => [r.item.id, r]));
  assert.ok(Math.abs(byId.get("a")!.remainingDays - 8) < 0.01);
  assert.ok(Math.abs(byId.get("s")!.remainingDays - 3) < 0.01);
  assert.equal(byId.get("old")!.remainingDays, 1, "never projects below one day");
  assert.equal(byId.get("a")!.projectedDate, day(8));
  assert.deepEqual([view.within7, view.within14, view.within30], [2, 3, 3]);
  assert.equal(view.overallLead, computeLeadTimeStats([...history, ...open]).avgDays);
  view.rows.forEach((r) => assertTrimmed(r.item));
});

test("health what-if view returns the four scenarios", () => {
  const view = computeHealthWhatIfView(activeFixture());
  for (const score of [view.current, view.ifDebtCleared, view.ifOneWeek, view.ifTwoWeeks]) {
    assert.equal(typeof score.total, "number");
    assert.ok(score.breakdown.length > 0);
  }
  assert.ok(view.ifDebtCleared.total >= view.current.total);
});

test("lead-time view counts Done items completed in the half-open LA window", () => {
  const start = "2026-10-01";
  const end = "2026-10-10";
  const created = laDayStartMs("2026-09-20");
  const items = [
    item({ id: "first-instant", status: ItemStatus.Done, createdAt: created, completedAt: laDayStartMs(start) }),
    item({ id: "last-instant", status: ItemStatus.Done, createdAt: created, completedAt: laDayStartMs(shiftDayKey(end, 1)) - 1 }),
    item({ id: "next-day", status: ItemStatus.Done, createdAt: created, completedAt: laDayStartMs(shiftDayKey(end, 1)) }),
    item({ id: "reopened", status: ItemStatus.Wip, createdAt: created, completedAt: laDayStartMs("2026-10-05") }),
  ];
  assert.equal(computeLeadTimeView(items, start, end).count, 2);
});

test("trending view caps each table and sorts by change", () => {
  const recent = laWallClockMs(day(-1), NOON);
  const prior = laWallClockMs(day(-40), NOON);
  const items: Item[] = [];
  for (let d = 0; d < TRENDING_TOP_ROWS + 3; d++) {
    for (let n = 0; n <= d; n++) items.push(item({ id: `r${d}-${n}`, design: `rise${d}`, createdAt: recent }));
    items.push(item({ id: `p${d}`, design: `quiet${d}`, createdAt: prior }));
  }
  const view = computeTrendingView(items, today, 30);
  assert.equal(view.rising.length, TRENDING_TOP_ROWS);
  assert.equal(view.rising[0]!.design, `rise${TRENDING_TOP_ROWS + 2}`);
  assert.ok(view.rising.every((r, i, rows) => i === 0 || rows[i - 1]!.delta >= r.delta));
  assert.equal(view.dying.length, TRENDING_TOP_ROWS);
  assert.ok(view.dying.every((r) => r.recent === 0 && r.prior > 0));
  assert.ok(view.falling.every((r) => r.delta < 0));
});

test("quality view: reversals newest first, names joined, capped list", () => {
  const items = [item({ id: "q1", customerName: "Ada" }), item({ id: "q2", customerName: "Bo" })];
  const activities: Activity[] = [];
  const total = QUALITY_RECENT_LIMIT + 10;
  for (let i = 0; i < total; i++) {
    activities.push(statusChange(i % 3 === 0 ? "q1" : i % 3 === 1 ? "q2" : "gone", 1_000 + i, ItemStatus.Packaging, ItemStatus.Wip));
  }
  activities.push(statusChange("q1", 5_000, ItemStatus.Wip, ItemStatus.Packaging)); // forward
  activities.push(statusChange("q1", 5_001, ItemStatus.Done, ItemStatus.Hidden)); // off-flow
  activities.push({ ...statusChange("q1", 5_002, ItemStatus.Done, ItemStatus.New), type: "update" } as Activity);
  const view = computeQualityView(items, activities);
  assert.equal(view.total, total);
  assert.equal(view.distinctItems, 3);
  assert.equal(view.recent.length, QUALITY_RECENT_LIMIT);
  assert.equal(view.recent[0]!.timestamp, 1_000 + total - 1);
  assert.ok(view.recent.every((r, i, rows) => i === 0 || rows[i - 1]!.timestamp >= r.timestamp));
  const names = new Map(view.recent.map((r) => [r.itemId, r.customerName]));
  assert.equal(names.get("q1"), "Ada");
  assert.equal(names.get("q2"), "Bo");
  assert.equal(names.get("gone"), undefined);
});

test("wip and bottleneck views read full history and trim rows", () => {
  const created = Date.now() - 20 * MS_PER_DAY;
  const items = [
    item({ id: "w", status: ItemStatus.Wip, createdAt: created }),
    item({ id: "h", status: ItemStatus.Hidden, createdAt: created }),
  ];
  const activities = [
    statusChange("w", created + 5 * MS_PER_DAY, ItemStatus.New, ItemStatus.Wip),
    statusChange("h", created + 2 * MS_PER_DAY, ItemStatus.New, ItemStatus.Hidden),
  ];
  const wip = computeWipView(items, activities);
  assert.deepEqual(wip.rows.map((r) => r.item.id), ["w"]);
  assert.ok(Math.abs(wip.rows[0]!.daysInStatus - 15) < 0.01);
  wip.rows.forEach((r) => assertTrimmed(r.item));
  const bottlenecks = computeBottlenecksView(items, activities);
  assert.ok(bottlenecks.rows.every((r) => r.status !== ItemStatus.Hidden));
  assert.ok(bottlenecks.rows.some((r) => r.status === ItemStatus.New && r.count === 2));
});

test("delivery view keeps the newest rows, the full count and service averages", () => {
  const items: Item[] = [];
  const trackers: OrderTrackingInfo[] = [];
  const shipped = DELIVERY_RECENT_LIMIT + 5;
  for (let i = 0; i < shipped; i++) {
    const purchasedAt = laWallClockMs("2026-09-01", NOON) + i * MS_PER_DAY;
    const transit = (i % 4) + 1;
    items.push(item({ id: `d${i}`, purchasedShipment: { orderId: `o${i}`, purchasedAt, serviceType: i % 2 ? "GROUND" : "EXPRESS" } as unknown as Item["purchasedShipment"] }));
    trackers.push({ orderId: `o${i}`, trackers: [{ tracking_details: [{ status: "delivered", datetime: new Date(purchasedAt + transit * MS_PER_DAY).toISOString() }] }] } as unknown as OrderTrackingInfo);
  }
  const view = computeDeliveryView(items, trackers);
  assert.equal(view.count, shipped);
  assert.equal(view.recent.length, DELIVERY_RECENT_LIMIT);
  assert.equal(view.recent[0]!.itemId, `d${shipped - 1}`, "newest purchase first");
  assert.equal(view.fastest, 1);
  assert.equal(view.slowest, 4);
  assert.ok(view.byService.every((r, i, rows) => i === 0 || rows[i - 1]!.avg <= r.avg));
  assert.equal(view.byService.reduce((s, r) => s + r.count, 0), shipped);
  assert.deepEqual(computeDeliveryView([], []), { count: 0, recent: [], avg: 0, median: 0, fastest: 0, slowest: 0, byService: [] });
});

test("shipping and map views", () => {
  const start = "2026-10-01";
  const end = "2026-10-30";
  const items = Array.from({ length: 12 }, (_, i) =>
    item({
      id: `s${i}`,
      shippingDetails: { state: i % 3 ? "CA" : "NV" } as Item["shippingDetails"],
      purchasedShipment: { orderId: `s${i}`, purchasedAt: laWallClockMs("2026-10-05", NOON), serviceType: `SVC${i}`, serviceName: `Service ${i}`, totalNetCharge: 10 + i, trackingNumber: `T${i}` } as unknown as Item["purchasedShipment"],
    })
  );
  const shipping = computeShippingView(items, start, end);
  assert.deepEqual(shipping.summary, summarizeShippingSpend(bucketShippingSpendByDay(items, start, end)));
  assert.equal(shipping.serviceRows.length, 8);
  assert.equal(shipping.serviceRows[0]!.service, "Service 11");
  const map = computeMapView(items);
  assert.equal(map.totalShipped, 12);
  assert.equal(map.top?.state, "CA");
  assert.equal(map.distinctStates, 2);
});

test("registry: range views validate their window, trending its days", async () => {
  const sources: StatsViewSources = {
    items: async () => activeFixture(),
    statusActivities: async () => [],
    trackers: async () => [],
  };
  const run = (view: string, query: string) => STATS_VIEWS[view]!(sources, new URLSearchParams(query));
  for (const view of ["lead-time", "mix", "shipping"]) {
    await assert.rejects(run(view, ""), StatsViewParamError);
    await assert.rejects(run(view, "start=2026-10-01&end=oops"), StatsViewParamError);
    await assert.rejects(run(view, "start=2026-10-10&end=2026-10-01"), StatsViewParamError, "end before start");
    await assert.rejects(run(view, `start=${shiftDayKey("2026-10-01", -STATS_VIEW_MAX_DAYS)}&end=2026-10-01`), StatsViewParamError, "too long");
    await run(view, `start=${shiftDayKey("2026-10-01", -(STATS_VIEW_MAX_DAYS - 1))}&end=2026-10-01`);
  }
  await assert.rejects(run("trending", "days=45"), StatsViewParamError);
  await assert.rejects(run("trending", ""), StatsViewParamError);
  await run("trending", "days=30");
  await run("trending", "days=90");
  for (const view of ["summary", "late", "today", "forecast", "health-whatif", "wip", "bottlenecks", "quality", "map", "delivery"]) {
    assert.ok(await run(view, ""), view);
  }
  assert.equal(Object.hasOwn(STATS_VIEWS, "toString"), false, "prototype names are not views");
});

test("status history merge skips ids already held and tracks the newest timestamp", async () => {
  // stats-dataset imports the DB module, which connects eagerly at load; point
  // it at a closed local port that fails fast so nothing real is touched.
  process.env.MONGODB_URI = "mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=50&connectTimeoutMS=50";
  const { mergeStatusHistory } = await import("../lib/server/stats-dataset");
  const doc = (id: string, timestamp: number) => ({ _id: id, itemId: "x", type: "status_change", timestamp, changes: [] }) as unknown as Parameters<typeof mergeStatusHistory>[1][number];
  const first = mergeStatusHistory(undefined, [doc("a", 10), doc("b", 30), doc("a", 10)], 1);
  assert.equal(first.activities.length, 2);
  assert.equal(first.newestTimestamp, 30);
  assert.equal(first.fullLoadAt, 1);
  const next = mergeStatusHistory(first, [doc("b", 30), doc("c", 25), doc("d", 40)], first.fullLoadAt);
  assert.deepEqual(next.activities.map((a) => a._id), ["a", "b", "c", "d"]);
  assert.equal(next.newestTimestamp, 40);
  assert.equal(first.activities.length, 2, "previous history is not mutated");
  assert.equal(typeof next.activities[0]!._id, "string");
});
