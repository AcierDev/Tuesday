import assert from "node:assert/strict";
import { test } from "node:test";

import { PDFDocument } from "pdf-lib";

import {
  buildShippingLabelPrintPdf,
  type ShippingLabelPrintDeps,
} from "../lib/shipping-labels/print";
import { handlePrintFutureLabels } from "../lib/shipping-labels/print-http";
import type { ShippingLabelRecord } from "../types/shipping-labels";
import type { Tracker, TrackerStatus } from "../typings/types";

const BASE_PAGE_WIDTH = 300;
const PAGE_HEIGHT = 500;

function tracker(id: string, status: TrackerStatus): Tracker {
  return {
    id: `tracker-${id}`,
    object: "Tracker",
    mode: "production",
    tracking_code: `tracking-${id}`,
    status,
    status_detail: status === "pre_transit" ? "label_created" : "in_transit",
    signed_by: null,
    weight: null,
    est_delivery_date: null,
    shipment_id: null,
    carrier: "UPS",
    tracking_details: [],
    carrier_detail: null,
    public_url: `https://example.test/${id}`,
    fees: [],
    created_at: "2026-08-31T00:00:00.000Z",
    updated_at: "2026-08-31T00:00:00.000Z",
  };
}

function label(
  id: string,
  status: TrackerStatus | "issue",
  pageNumber: number,
  createdAt = 1,
  uploadId = "upload-1",
  orderId = "order-1"
): ShippingLabelRecord {
  const labelTracker = status === "issue" ? null : tracker(id, status);
  return {
    id,
    orderId,
    uploadId,
    sourceFileName: "labels.pdf",
    sourceFileHash: `hash-${uploadId}`,
    pageNumber,
    pageCount: 3,
    s3Key: `shipping-label-pages/${orderId}/${id}.pdf`,
    processingStatus: status === "issue" ? "needs_review" : "ready",
    processingError: status === "issue" ? "Unreadable" : undefined,
    trackingNumber: labelTracker?.tracking_code ?? null,
    carrier: labelTracker ? "UPS" : null,
    trackerId: labelTracker?.id ?? null,
    tracker: labelTracker,
    createdAt,
    updatedAt: createdAt,
  };
}

async function onePagePdf(marker: number): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.addPage([BASE_PAGE_WIDTH + marker, PAGE_HEIGHT]);
  return Buffer.from(await pdf.save());
}

async function printDeps(records: ShippingLabelRecord[]) {
  const pages = new Map<string, Buffer>();
  for (const record of records) {
    pages.set(record.s3Key, await onePagePdf(record.pageNumber));
  }
  const reads: string[] = [];
  const deps: ShippingLabelPrintDeps = {
    listLabels: async (orderId) =>
      records.filter((record) => record.orderId === orderId),
    getObject: async (key) => {
      reads.push(key);
      const page = pages.get(key);
      if (!page) throw new Error(`Missing test page ${key}`);
      return page;
    },
  };
  return { deps, reads };
}

test("print unused merges only pre_transit pages in stable order", async () => {
  const records = [
    label("used", "delivered", 3, 1),
    label("unused-later", "pre_transit", 2, 2),
    label("unused-first", "pre_transit", 1, 1),
    label("issue", "issue", 4, 1),
  ];
  const memory = await printDeps(records);

  const bytes = await buildShippingLabelPrintPdf(
    { orderId: "order-1", scope: "unused" },
    memory.deps
  );
  const pdf = await PDFDocument.load(bytes);

  assert.equal(pdf.getPageCount(), 2);
  assert.deepEqual(
    pdf.getPages().map((page) => page.getWidth() - BASE_PAGE_WIDTH),
    [1, 2]
  );
  assert.deepEqual(memory.reads, [records[2]?.s3Key, records[1]?.s3Key]);
});

test("selected printing preserves requested inventory order", async () => {
  const records = [
    label("second", "pre_transit", 2, 2),
    label("first", "pre_transit", 1, 1),
  ];
  const memory = await printDeps(records);
  const bytes = await buildShippingLabelPrintPdf(
    { orderId: "order-1", labelIds: ["second", "first"] },
    memory.deps
  );
  const pdf = await PDFDocument.load(bytes);

  assert.deepEqual(
    pdf.getPages().map((page) => page.getWidth() - BASE_PAGE_WIDTH),
    [1, 2]
  );
});

test("selected printing rejects used, missing, and duplicate labels", async () => {
  const records = [
    label("unused", "pre_transit", 1),
    label("used", "in_transit", 2),
    label("other-order", "pre_transit", 3, 1, "upload-1", "order-2"),
  ];
  const memory = await printDeps(records);

  for (const labelIds of [
    ["used"],
    ["other-order"],
    ["missing"],
    ["unused", "unused"],
  ]) {
    await assert.rejects(
      buildShippingLabelPrintPdf(
        { orderId: "order-1", labelIds },
        memory.deps
      ),
      /unused labels from order order-1/i
    );
  }
  assert.equal(memory.reads.length, 0);
});

test("print endpoint returns one inline PDF and performs only page reads", async () => {
  const memory = await printDeps([
    label("unused", "pre_transit", 1),
    label("used", "delivered", 2),
  ]);
  const response = await handlePrintFutureLabels(
    new Request("https://example.test/api/shipping/labels/print", {
      method: "POST",
      body: JSON.stringify({ orderId: "order-1", scope: "unused" }),
      headers: { "Content-Type": "application/json" },
    }),
    memory.deps
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/pdf");
  assert.match(response.headers.get("Content-Disposition") ?? "", /inline/);
  assert.equal((await PDFDocument.load(await response.arrayBuffer())).getPageCount(), 1);
  assert.equal(memory.reads.length, 1);
});
