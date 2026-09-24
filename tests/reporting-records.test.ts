import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parseReportingRecord } from "../lib/reporting/records";

test("daily records have stable keys so corrections replace the same metric", () => {
  const input = {
    kind: "ad", platform: "meta", placement: "facebook", campaignId: "fb-1",
    date: "2026-09-16", spend: 12.5, impressions: 1200,
    quality: "complete", sourceUrl: "https://adsmanager.facebook.com/report",
  };
  const first = parseReportingRecord(input, "2026-09-23T12:00:00.000Z");
  const corrected = parseReportingRecord({ ...input, spend: 13 }, "2026-09-24T12:00:00.000Z");
  assert.equal(first.kind, "ad");
  assert.equal(corrected.kind, "ad");
  if (first.kind !== "ad" || corrected.kind !== "ad") return;
  assert.equal(first.key, corrected.key);
  assert.equal(first.spend, 12.5);
  assert.equal(corrected.spend, 13);
});

test("missing values stay missing and invented zeros are not added", () => {
  const record = parseReportingRecord({
    kind: "shop", platform: "shopify", date: "2026-09-16", visits: 20,
  }, "2026-09-23T12:00:00.000Z");
  assert.equal(record.kind, "shop");
  if (record.kind === "shop") {
    assert.equal(record.orders, undefined);
    assert.equal(record.quality, "unverified");
  }
});

test("social profile facts stay separate from paid ad facts", () => {
  const record = parseReportingRecord({
    kind: "social", platform: "instagram", date: "2026-09-16",
    reach: 1000, saves: 4, shopLinkClicks: 8,
  }, "2026-09-23T12:00:00.000Z");
  assert.equal(record.kind, "social");
  assert.equal(record.key, "social:instagram:2026-09-16");
});

test("production order links have one stable key and valid sales channels", () => {
  const record = parseReportingRecord({
    kind: "order_link", itemId: "item-1", platform: "etsy", orderId: "etsy-order-1",
  }, "2026-09-23T12:00:00.000Z");
  assert.equal(record.key, "order_link:item-1");
  assert.throws(() => parseReportingRecord({
    kind: "order_link", itemId: "item-1", platform: "unknown", orderId: "etsy-order-1",
  }, "2026-09-23T12:00:00.000Z"));
});

test("cart snapshots validate their rolling window and never become completed-week adds", () => {
  const snapshot = parseReportingRecord({
    kind: "cart", platform: "etsy", windowDays: 7,
    windowStart: "2026-09-17", windowEnd: "2026-09-23",
    capturedAt: "2026-09-23T11:00:00.000Z", count: 34,
  }, "2026-09-23T12:00:00.000Z");
  assert.equal(snapshot.kind, "cart");
  assert.throws(() => parseReportingRecord({
    kind: "cart", platform: "etsy", windowDays: 7,
    windowStart: "2026-09-16", windowEnd: "2026-09-23",
    capturedAt: "2026-09-23T11:00:00.000Z", count: 34,
  }, "2026-09-23T12:00:00.000Z"));
});

test("rejects private message text, invalid dates, and negative counts", () => {
  assert.throws(() => parseReportingRecord({
    kind: "inquiry", platform: "etsy", start: "2026-09-16", end: "2026-09-22",
    count: 2, messageText: "private",
  }, "2026-09-23T12:00:00.000Z"));
  assert.throws(() => parseReportingRecord({
    kind: "shop", platform: "etsy", date: "2026-02-30", favorites: 3,
  }, "2026-09-23T12:00:00.000Z"));
  assert.throws(() => parseReportingRecord({
    kind: "shop", platform: "etsy", date: "2026-09-16", favorites: -1,
  }, "2026-09-23T12:00:00.000Z"));
  assert.throws(() => parseReportingRecord({
    kind: "ad", platform: "pinterest", date: "2026-09-16", spend: 1,
    sourceTimezone: "not-a-timezone",
  }, "2026-09-23T12:00:00.000Z"));
});

test("a correction replaces the prior record so omitted metrics are removed", () => {
  const route = readFileSync(new URL("../app/api/reporting/records/route.ts", import.meta.url), "utf8");
  assert.match(route, /replaceOne\s*:/);
  assert.match(route, /replacement:\s*\{\s*\.\.\.record,\s*importedAt:\s*now\s*\}/);
});

test("an oversized declared request is rejected before its body is buffered", () => {
  const route = readFileSync(new URL("../app/api/reporting/records/route.ts", import.meta.url), "utf8");
  const declaredLengthCheck = route.indexOf('headers.get("content-length")');
  const bodyRead = route.indexOf("request.text()");
  assert.ok(declaredLengthCheck >= 0);
  assert.ok(declaredLengthCheck < bodyRead);
});
