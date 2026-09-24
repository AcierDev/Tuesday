import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildFulfillmentWeek, firstCarrierAcceptanceAt } from "../lib/reporting/fulfillment";
import { summarizeMarketingWeek } from "../lib/reporting/marketing";
import { ItemStatus, type Item } from "../typings/types";

const WEEK = { start: "2026-09-16", end: "2026-09-22" };
const ms = (iso: string) => Date.parse(iso);
const item = (overrides: Partial<Item>): Item => ({
  id: "item-1",
  createdAt: ms("2026-09-01T12:00:00Z"),
  status: ItemStatus.New,
  visible: true,
  deleted: false,
  index: 0,
  ...overrides,
});

test("weekly fulfillment uses Pacific full days and separates completion from carrier acceptance", () => {
  const items = [
    item({ id: "on-time", status: ItemStatus.Done, completedAt: ms("2026-09-16T07:00:00Z"), dueDateAtCompletion: "2026-09-16" }),
    item({ id: "late", status: ItemStatus.Done, completedAt: ms("2026-09-23T06:59:00Z"), dueDateAtCompletion: "2026-09-21" }),
    item({ id: "next-week", status: ItemStatus.Done, completedAt: ms("2026-09-23T07:00:00Z"), dueDateAtCompletion: "2026-09-23" }),
    item({ id: "overdue", dueDate: "2026-09-20", size: "24x36" }),
    item({ id: "held", dueDate: "2026-09-19", onHold: true }),
  ];
  const trackers = [
    { orderId: "on-time", trackers: [{ tracking_details: [
      { status: "pre_transit", datetime: "2026-09-16T07:00:00Z" },
      { status: "in_transit", datetime: "2026-09-17T15:00:00Z" },
    ] }] },
    { orderId: "late", trackers: [{ tracking_details: [
      { status: "pre_transit", datetime: "2026-09-22T17:00:00Z" },
    ] }] },
  ];

  const result = buildFulfillmentWeek(items, trackers, WEEK, ms("2026-09-23T12:00:00Z"));
  assert.equal(result.completedItems, 2);
  assert.equal(result.onTimeCompleted, 1);
  assert.equal(result.lateCompleted, 1);
  assert.equal(result.carrierAcceptedItems, 1);
  assert.equal(result.overdueNow, 1);
  assert.equal(result.backlogByStatus.New, 1);
  assert.equal(result.backlogSquares, 864);
  assert.equal(firstCarrierAcceptanceAt(trackers[1]!.trackers), null);
});

test("historical completion without a saved due date is unknown, not on time", () => {
  const result = buildFulfillmentWeek([
    item({ id: "legacy", status: ItemStatus.Done, completedAt: ms("2026-09-20T12:00:00Z"), dueDate: "2026-09-21" }),
  ], [], WEEK, ms("2026-09-23T12:00:00Z"));
  assert.equal(result.completedItems, 1);
  assert.equal(result.unknownDueAtCompletion, 1);
  assert.equal(result.onTimeCompleted, 0);
});

test("a saved completion remains in its original week after an item is reopened", () => {
  const reopened = item({ id: "reopened", status: ItemStatus.Wip, completedAt: undefined });
  const report = buildFulfillmentWeek([reopened], [], WEEK, ms("2026-09-23T12:00:00Z"), [
    { itemId: "reopened", completedAt: ms("2026-09-20T12:00:00Z"), createdAt: reopened.createdAt, dueDateAtCompletion: "2026-09-19" },
  ]);
  assert.equal(report.completedItems, 1);
  assert.equal(report.lateCompleted, 1);
});

test("revised promises do not hide lateness against the original promise", () => {
  const result = buildFulfillmentWeek([
    item({ id: "extended", status: ItemStatus.Done,
      completedAt: ms("2026-09-20T12:00:00Z"),
      originalDueDate: "2026-09-17", dueDateAtCompletion: "2026-09-21" }),
  ], [], WEEK, ms("2026-09-23T12:00:00Z"));
  assert.equal(result.onTimeCompleted, 1);
  assert.equal(result.lateOriginalPromise, 1);
  assert.equal(result.promiseExtensions, 1);
});

test("linked production items are counted by sales channel without exposing order IDs", () => {
  const result = buildFulfillmentWeek([
    item({ id: "etsy-item", status: ItemStatus.Done, completedAt: ms("2026-09-20T12:00:00Z") }),
    item({ id: "unknown-item", status: ItemStatus.Done, completedAt: ms("2026-09-20T13:00:00Z") }),
  ], [], WEEK, ms("2026-09-23T12:00:00Z"), [], [
    { itemId: "etsy-item", platform: "etsy", orderId: "external-private" },
  ]);
  assert.deepEqual(result.completedBySalesChannel, { etsy: 1, shopify: 0, other: 0, unknown: 1 });
  assert.equal(JSON.stringify(result).includes("external-private"), false);
});

test("marketing week keeps source data separate and marks missing days incomplete", () => {
  const records = [
    { kind: "shop", key: "etsy:2026-09-16", platform: "etsy", date: "2026-09-16", favorites: 2, listingViews: 100, orders: 1, revenue: 500, visits: 80 },
    { kind: "shop", key: "etsy:2026-09-17", platform: "etsy", date: "2026-09-17", favorites: 3, listingViews: 200, orders: 0, revenue: 0, visits: 150 },
    { kind: "ad", key: "meta:fb:2026-09-16", platform: "meta", placement: "facebook", date: "2026-09-16", spend: 10, impressions: 1000, clicks: 20, sourceTimezone: "America/Los_Angeles" },
    { kind: "ad", key: "meta:ig:2026-09-16", platform: "meta", placement: "instagram", date: "2026-09-16", spend: 5, impressions: 500, clicks: 10 },
    { kind: "cart", key: "cart:2026-09-23", platform: "etsy", capturedAt: "2026-09-23T11:00:00Z", windowDays: 7, windowStart: "2026-09-17", windowEnd: "2026-09-23", count: 34 },
    { kind: "inquiry", key: "inquiry:2026-09-16", platform: "etsy", start: WEEK.start, end: WEEK.end, count: null, minimumVerified: 2,
      sourceUrl: "https://www.etsy.com/messages/thread-private" },
    { kind: "economics", key: "economics:etsy:one", platform: "etsy", orderId: "one", date: "2026-09-16",
      grossRevenue: 500, discounts: 10, refunds: 0, shippingCharged: 20,
      shippingCost: 30, materialsCost: 100, laborCost: 50 },
    { kind: "social", key: "social:instagram:2026-09-16", platform: "instagram", date: "2026-09-16",
      reach: 1000, engagements: 25, saves: 4, shopLinkClicks: 8 },
  ] as const;

  const report = summarizeMarketingWeek(records, WEEK);
  assert.deepEqual(report.shops.etsy.favorites, { value: 5, coveredDays: 2, complete: false });
  assert.equal(report.shops.etsy.favoritesPer100Views, 5 / 300 * 100);
  assert.equal(report.shops.shopify.orders.value, null);
  assert.equal(report.ads.meta.facebook.spend.value, 10);
  assert.equal(report.ads.meta.instagram.spend.value, 5);
  assert.equal(report.ads.meta.facebook.ctrPercent, 2);
  assert.equal(report.ads.meta.facebook.cpc, 0.5);
  assert.equal(report.ads.meta.facebook.cpm, 10);
  assert.deepEqual(report.ads.meta.facebook.sourceTimezones, ["America/Los_Angeles"]);
  assert.equal(report.paidSpend.verifiedUpfrontSubtotal, 15);
  assert.ok(report.paidSpend.missingChannels.includes("etsy_ads"));
  assert.equal(report.cartSnapshots.last7Days?.count, 34);
  assert.equal(report.inquiries?.minimumVerified, 2);
  assert.equal(report.inquiries?.count, null);
  assert.deepEqual(report.economics.etsy.contribution, { value: 330, completeOrders: 1 });
  assert.equal(report.social.instagram.reach.value, 1000);
  assert.equal(JSON.stringify(report).includes("thread-private"), false);
  assert.equal(JSON.stringify(report).includes("economics:etsy:one"), false);
});

test("ad ROAS and CPA appear only with complete verified conversion tracking", () => {
  const records = Array.from({ length: 7 }, (_, index) => ({
    kind: "ad" as const,
    key: `etsy-ad:${index}`,
    platform: "etsy_ads" as const,
    date: `2026-09-${String(16 + index).padStart(2, "0")}`,
    spend: 10,
    attributedOrders: 1,
    attributedRevenue: 20,
    quality: "complete" as const,
    conversionTrackingVerified: true,
  }));
  const verified = summarizeMarketingWeek(records, WEEK).ads.etsyAds;
  assert.equal(verified.roas, 2);
  assert.equal(verified.cpa, 10);
  const unverified = summarizeMarketingWeek(records.map((row) => ({ ...row,
    conversionTrackingVerified: false })), WEEK).ads.etsyAds;
  assert.equal(unverified.roas, null);
  assert.equal(unverified.cpa, null);
});

test("channel spend is incomplete when any reported campaign is missing a day", () => {
  const completeCampaign = Array.from({ length: 7 }, (_, index) => ({
    kind: "ad" as const,
    key: `meta:complete:${index}`,
    platform: "meta" as const,
    campaignId: "complete",
    date: `2026-09-${String(16 + index).padStart(2, "0")}`,
    spend: 10,
    quality: "complete" as const,
    sourceUrl: "https://ads.example/report",
  }));
  const partialCampaign = [{
    kind: "ad" as const,
    key: "meta:partial:0",
    platform: "meta" as const,
    campaignId: "partial",
    date: "2026-09-16",
    spend: 5,
    quality: "complete" as const,
    sourceUrl: "https://ads.example/report",
  }];

  const report = summarizeMarketingWeek([...completeCampaign, ...partialCampaign], WEEK);
  assert.equal(report.paidSpend.verifiedUpfrontSubtotal, 75);
  assert.equal(report.paidSpend.incompleteChannels.includes("meta"), true);
  assert.equal(report.ads.meta.other.spend.complete, false);
});

test("channel coverage keeps placements separate within one campaign", () => {
  const facebook = Array.from({ length: 7 }, (_, index) => ({
    kind: "ad" as const,
    key: `meta:shared:facebook:${index}`,
    platform: "meta" as const,
    campaignId: "shared",
    placement: "facebook",
    date: `2026-09-${String(16 + index).padStart(2, "0")}`,
    spend: 10,
    quality: "complete" as const,
    sourceUrl: "https://ads.example/report",
  }));
  const instagram = [{
    kind: "ad" as const,
    key: "meta:shared:instagram:0",
    platform: "meta" as const,
    campaignId: "shared",
    placement: "instagram",
    date: "2026-09-16",
    spend: 5,
    quality: "complete" as const,
    sourceUrl: "https://ads.example/report",
  }];

  const report = summarizeMarketingWeek([...facebook, ...instagram], WEEK);
  assert.equal(report.paidSpend.incompleteChannels.includes("meta"), true);
});

test("the report warns when offsite fee coverage is incomplete", () => {
  const page = readFileSync(new URL("../app/stats/weekly/page.tsx", import.meta.url), "utf8");
  assert.match(page, /!c\.marketing\.paidSpend\.offsiteFeesComplete/);
});
