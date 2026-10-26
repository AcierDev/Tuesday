import assert from "node:assert/strict";
import { test } from "node:test";
import type { Db } from "mongodb";

import {
  DEFAULT_SHIPPING_LABEL_FILTER,
  filterShippingLabelInventory,
  isLabelAddedRecently,
  normalizePrintableSelection,
  shippingLabelInventoryCounts,
} from "../lib/shipping-labels/inventory";
import { futureLabelCounts } from "../lib/shipping-labels/repository";
import type { ShippingLabelRecord } from "../types/shipping-labels";
import type { Tracker, TrackerStatus } from "../typings/types";

// A ready label whose tracker is still "unknown" counts as unused (printable).
const EXPECTED_INVENTORY_COUNTS = {
  all: 5,
  unused: 2,
  used: 1,
  issues: 2,
};
const LABEL_CREATED_AT = 1;

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
    record("e", "unknown"),
  ];

  assert.deepEqual(shippingLabelInventoryCounts(labels), EXPECTED_INVENTORY_COUNTS);
  assert.deepEqual(
    filterShippingLabelInventory(labels, "used").map((label) => label.id),
    ["b"]
  );
  assert.deepEqual(
    filterShippingLabelInventory(labels, "issues").map((label) => label.id),
    ["c", "d"]
  );
  assert.deepEqual(
    filterShippingLabelInventory(labels, DEFAULT_SHIPPING_LABEL_FILTER),
    labels
  );
});

test("order summary counts do not report unknown or failed trackers as used", async () => {
  const labels = [
    record("a", "pre_transit"),
    record("b", "delivered"),
    record("c", "failure"),
    record("d", "issue"),
    record("e", "unknown"),
  ];
  const db = {
    collection: () => ({
      find: () => ({ toArray: async () => labels }),
    }),
  } as unknown as Db;

  assert.deepEqual(await futureLabelCounts(db), {
    "order-1": {
      total: EXPECTED_INVENTORY_COUNTS.all,
      unused: EXPECTED_INVENTORY_COUNTS.unused,
      used: EXPECTED_INVENTORY_COUNTS.used,
      issues: EXPECTED_INVENTORY_COUNTS.issues,
      latestCreatedAt: LABEL_CREATED_AT,
    },
  });
});

test("unused, freshly unknown and shipped labels remain selectable for printing", () => {
  const labels = [
    record("unused", "pre_transit"),
    record("used", "in_transit"),
    record("issue", "issue"),
    record("unknown", "unknown"),
  ];
  assert.deepEqual(
    [...normalizePrintableSelection(new Set(["unused", "used", "issue", "unknown", "deleted"]), labels)],
    ["unused", "used", "unknown"]
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
