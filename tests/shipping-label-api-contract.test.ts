import assert from "node:assert/strict";
import { test } from "node:test";

import {
  handleDeleteFutureLabel,
  handleFutureLabelPdf,
  handleFutureLabelUpload,
  handleListFutureLabels,
  handleSummarizeFutureLabels,
  type ShippingLabelHttpDeps,
} from "../lib/shipping-labels/http";
import type {
  FutureLabelSummariesByOrder,
  ShippingLabelRecord,
} from "../types/shipping-labels";

function pendingLabel(overrides: Partial<ShippingLabelRecord> = {}): ShippingLabelRecord {
  return {
    id: "label-1",
    orderId: "order-1",
    uploadId: "upload-1",
    sourceFileName: "labels.pdf",
    sourceFileHash: "hash",
    pageNumber: 1,
    pageCount: 1,
    s3Key: "shipping-label-pages/order-1/label-1.pdf",
    processingStatus: "pending",
    trackingNumber: null,
    carrier: null,
    trackerId: null,
    tracker: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function createDeps() {
  const futureLabels = [pendingLabel()];
  const deletedObjectKeys: string[] = [];
  const deletedRecordIds: string[] = [];
  const summaries: FutureLabelSummariesByOrder = {
    "order-1": { total: 1, unused: 0, used: 0, issues: 1 },
  };
  let ingestedFileName = "";
  let ingestedBytes = 0;

  const deps: ShippingLabelHttpDeps = {
    ingest: async (input) => {
      ingestedFileName = input.sourceFileName;
      ingestedBytes = input.pdfBuffer.length;
      return { uploadId: "upload-1", labels: futureLabels, duplicate: false };
    },
    listLabels: async (orderId) =>
      futureLabels.filter((label) => label.orderId === orderId),
    summarizeLabels: async () => summaries,
    getLabel: async (labelId) =>
      futureLabels.find((label) => label.id === labelId) ?? null,
    getObject: async (key) =>
      key === futureLabels[0]!.s3Key ? Buffer.from("pdf-bytes") : Buffer.alloc(0),
    deleteObject: async (key) => {
      deletedObjectKeys.push(key);
    },
    deleteRecord: async (labelId) => {
      deletedRecordIds.push(labelId);
      return futureLabels.find((label) => label.id === labelId) ?? null;
    },
  };

  return {
    deps,
    futureLabels,
    deletedObjectKeys,
    deletedRecordIds,
    getIngestedFileName: () => ingestedFileName,
    getIngestedBytes: () => ingestedBytes,
  };
}

function uploadRequest(file: File, orderId = "order-1"): Request {
  const body = new FormData();
  body.set("orderId", orderId);
  body.set("label", file);
  return new Request("https://example.test/api/shipping/labels/upload", {
    method: "POST",
    body,
  });
}

test("future upload rejects non-PDF files before ingestion", async () => {
  const memory = createDeps();
  const response = await handleFutureLabelUpload(
    uploadRequest(new File(["not a pdf"], "labels.txt", { type: "text/plain" })),
    memory.deps
  );

  assert.equal(response.status, 400);
  assert.equal(memory.getIngestedBytes(), 0);
});

test("future upload passes the PDF and order into ingestion", async () => {
  const memory = createDeps();
  const response = await handleFutureLabelUpload(
    uploadRequest(
      new File(["pdf-content"], "customer-labels.pdf", {
        type: "application/pdf",
      })
    ),
    memory.deps
  );

  assert.equal(response.status, 201);
  assert.equal(memory.getIngestedFileName(), "customer-labels.pdf");
  assert.equal(memory.getIngestedBytes(), Buffer.byteLength("pdf-content"));
  assert.deepEqual((await response.json()).labels, memory.futureLabels);
});

test("future list requires orderId and returns only that order", async () => {
  const memory = createDeps();
  const missing = await handleListFutureLabels(new URLSearchParams(), memory.deps);
  const found = await handleListFutureLabels(
    new URLSearchParams({ orderId: "order-1" }),
    memory.deps
  );

  assert.equal(missing.status, 400);
  assert.equal(found.status, 200);
  assert.deepEqual(await found.json(), { labels: memory.futureLabels });
});

test("future summary returns per-order category counts", async () => {
  const memory = createDeps();
  const response = await handleSummarizeFutureLabels(memory.deps);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    summaries: { "order-1": { total: 1, unused: 0, used: 0, issues: 1 } },
  });
});

test("future PDF serves only a canonical future-label record", async () => {
  const memory = createDeps();
  const found = await handleFutureLabelPdf("label-1", memory.deps);
  const missing = await handleFutureLabelPdf("order-1.pdf", memory.deps);

  assert.equal(found.status, 200);
  assert.equal(found.headers.get("content-type"), "application/pdf");
  assert.equal(Buffer.from(await found.arrayBuffer()).toString(), "pdf-bytes");
  assert.equal(missing.status, 404);
});

test("future deletion refuses records that point at legacy object keys", async () => {
  const memory = createDeps();
  memory.futureLabels.push(
    pendingLabel({ id: "unsafe", s3Key: "order-1.pdf" })
  );

  const response = await handleDeleteFutureLabel("unsafe", memory.deps);

  assert.equal(response.status, 409);
  assert.deepEqual(memory.deletedObjectKeys, []);
  assert.deepEqual(memory.deletedRecordIds, []);
});

test("future deletion refuses retained source-upload objects", async () => {
  const memory = createDeps();
  memory.futureLabels.push(
    pendingLabel({
      id: "source-object",
      s3Key: "shipping-label-uploads/order-1/upload-1/source.pdf",
    })
  );

  const response = await handleDeleteFutureLabel(
    "source-object",
    memory.deps
  );

  assert.equal(response.status, 409);
  assert.deepEqual(memory.deletedObjectKeys, []);
  assert.deepEqual(memory.deletedRecordIds, []);
});

test("future deletion removes the page object before its record", async () => {
  const memory = createDeps();
  const response = await handleDeleteFutureLabel("label-1", memory.deps);

  assert.equal(response.status, 200);
  assert.deepEqual(memory.deletedObjectKeys, [
    "shipping-label-pages/order-1/label-1.pdf",
  ]);
  assert.deepEqual(memory.deletedRecordIds, ["label-1"]);
});
