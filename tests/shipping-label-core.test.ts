import assert from "node:assert/strict";
import { test } from "node:test";
import { PDFDocument } from "pdf-lib";

import { mergePdfPages, splitPdfPages } from "../lib/shipping-labels/pdf";
import {
  canCompleteFutureLabelOrder,
  classifyShippingLabel,
} from "../lib/shipping-labels/status";
import type { ShippingLabelRecord } from "../types/shipping-labels";
import type { Tracker, TrackerStatus } from "../typings/types";

const NON_PRE_TRANSIT_STATUSES: TrackerStatus[] = [
  "unknown",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "available_for_pickup",
  "return_to_sender",
  "failure",
  "cancelled",
  "error",
];

function trackerWithStatus(status: TrackerStatus): Tracker {
  return {
    id: `tracker-${status}`,
    object: "Tracker",
    mode: "production",
    tracking_code: `tracking-${status}`,
    status,
    status_detail: "unknown",
    signed_by: null,
    weight: null,
    est_delivery_date: null,
    shipment_id: null,
    carrier: "UPS",
    tracking_details: [],
    carrier_detail: null,
    public_url: "https://example.test/tracking",
    fees: [],
    created_at: "2026-08-31T00:00:00.000Z",
    updated_at: "2026-08-31T00:00:00.000Z",
  };
}

function labelRecord(
  status: TrackerStatus | null,
  processingStatus: ShippingLabelRecord["processingStatus"] = "ready"
): ShippingLabelRecord {
  return {
    id: status ? `label-${status}` : "label-no-tracker",
    orderId: "order-1",
    uploadId: "upload-1",
    sourceFileName: "labels.pdf",
    sourceFileHash: "source-hash",
    pageNumber: 1,
    pageCount: 1,
    s3Key: "shipping-label-pages/order-1/label.pdf",
    processingStatus,
    trackingNumber: status ? `tracking-${status}` : null,
    carrier: status ? "UPS" : null,
    trackerId: status ? `tracker-${status}` : null,
    tracker: status ? trackerWithStatus(status) : null,
    createdAt: 1,
    updatedAt: 1,
  };
}

async function makeDimensionedPdf(): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.addPage([100, 200]);
  pdf.addPage([200, 300]);
  pdf.addPage([300, 400]);
  return Buffer.from(await pdf.save());
}

test("only pre_transit labels are unused", () => {
  assert.equal(classifyShippingLabel(labelRecord("pre_transit")), "unused");

  for (const status of NON_PRE_TRANSIT_STATUSES) {
    assert.equal(
      classifyShippingLabel(labelRecord(status)),
      "used",
      `${status} must count as used`
    );
  }
});

test("missing or unresolved trackers are issues", () => {
  assert.equal(classifyShippingLabel(labelRecord(null)), "issues");
  assert.equal(
    classifyShippingLabel(labelRecord("pre_transit", "scanning")),
    "issues"
  );
  assert.equal(
    classifyShippingLabel(labelRecord("delivered", "needs_review")),
    "issues"
  );
});

test("every future label must leave pre_transit before order completion", () => {
  assert.equal(
    canCompleteFutureLabelOrder([
      labelRecord("in_transit"),
      labelRecord("pre_transit"),
    ]),
    false
  );
  assert.equal(
    canCompleteFutureLabelOrder([
      labelRecord("delivered"),
      labelRecord("failure"),
    ]),
    true
  );
  assert.equal(
    canCompleteFutureLabelOrder([
      labelRecord("delivered"),
      labelRecord(null, "needs_review"),
    ]),
    false
  );
  assert.equal(canCompleteFutureLabelOrder([]), false);
});

test("PDF splitting produces one PDF per page with original dimensions", async () => {
  const pages = await splitPdfPages(await makeDimensionedPdf());

  assert.equal(pages.length, 3);
  const dimensions = await Promise.all(
    pages.map(async (pageBytes) => {
      const pagePdf = await PDFDocument.load(pageBytes);
      assert.equal(pagePdf.getPageCount(), 1);
      const page = pagePdf.getPage(0);
      return [page.getWidth(), page.getHeight()];
    })
  );
  assert.deepEqual(dimensions, [
    [100, 200],
    [200, 300],
    [300, 400],
  ]);
});

test("PDF merging preserves the requested page order", async () => {
  const pages = await splitPdfPages(await makeDimensionedPdf());
  const merged = await PDFDocument.load(
    await mergePdfPages([pages[2]!, pages[0]!])
  );

  assert.equal(merged.getPageCount(), 2);
  assert.deepEqual(
    merged.getPages().map((page) => [page.getWidth(), page.getHeight()]),
    [
      [300, 400],
      [100, 200],
    ]
  );
});
