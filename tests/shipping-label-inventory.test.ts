import assert from "node:assert/strict";
import { test } from "node:test";

import {
  defaultShippingLabelFilter,
  filterShippingLabelInventory,
  isLabelAddedRecently,
  normalizeUnusedSelection,
  shippingLabelInventoryCounts,
} from "../lib/shipping-labels/inventory";
import type { ShippingLabelRecord } from "../types/shipping-labels";
import type { Tracker, TrackerStatus } from "../typings/types";

function record(
  id: string,
  status: TrackerStatus | "issue"
): ShippingLabelRecord {
  const tracker: Tracker | null =
    status === "issue"
      ? null
      : {
          id: `tracker-${id}`,
          object: "Tracker",
          mode: "production",
          tracking_code: `tracking-${id}`,
          status,
          status_detail: "unknown",
          signed_by: null,
          weight: null,
          est_delivery_date: null,
          shipment_id: null,
          carrier: "UPS",
          tracking_details: [],
          carrier_detail: null,
          public_url: "https://example.test",
          fees: [],
          created_at: "2026-08-31T00:00:00.000Z",
          updated_at: "2026-08-31T00:00:00.000Z",
        };
  return {
    id,
    orderId: "order-1",
    uploadId: "upload-1",
    sourceFileName: "labels.pdf",
    sourceFileHash: "hash",
    pageNumber: id.charCodeAt(0),
    pageCount: 3,
    s3Key: `shipping-label-pages/order-1/${id}.pdf`,
    processingStatus: status === "issue" ? "needs_review" : "ready",
    processingError: status === "issue" ? "Unreadable" : undefined,
    trackingNumber: tracker?.tracking_code ?? null,
    carrier: tracker ? "UPS" : null,
    trackerId: tracker?.id ?? null,
    tracker,
    createdAt: 1,
    updatedAt: 1,
  };
}

test("inventory filters use exact automatic categories", () => {
  const labels = [
    record("a", "pre_transit"),
    record("b", "delivered"),
    record("c", "failure"),
    record("d", "issue"),
  ];

  assert.deepEqual(shippingLabelInventoryCounts(labels), {
    all: 4,
    unused: 1,
    used: 2,
    issues: 1,
  });
  assert.deepEqual(
    filterShippingLabelInventory(labels, "used").map((label) => label.id),
    ["b", "c"]
  );
  assert.equal(defaultShippingLabelFilter(labels), "unused");
});

test("only current unused labels remain selectable", () => {
  const labels = [
    record("unused", "pre_transit"),
    record("used", "in_transit"),
    record("issue", "issue"),
  ];
  assert.deepEqual(
    [...normalizeUnusedSelection(new Set(["unused", "used", "issue"]), labels)],
    ["unused"]
  );
});

test("inventory defaults to all when no unused labels remain", () => {
  assert.equal(
    defaultShippingLabelFilter([
      record("used", "delivered"),
      record("issue", "issue"),
    ]),
    "all"
  );
});

test("recent-label indicator expires after twelve hours", () => {
  const now = Date.UTC(2026, 7, 31, 18);
  const oneMinute = 60 * 1000;
  const twelveHours = 12 * 60 * oneMinute;

  assert.equal(isLabelAddedRecently(now - twelveHours + oneMinute, now), true);
  assert.equal(isLabelAddedRecently(now - twelveHours, now), false);
  assert.equal(isLabelAddedRecently(undefined, now), false);
});
