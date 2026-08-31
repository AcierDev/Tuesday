import assert from "node:assert/strict";
import { test } from "node:test";
import { PDFDocument } from "pdf-lib";

import {
  ingestShippingLabelPdf,
  type IngestShippingLabelDeps,
} from "../lib/shipping-labels/ingest";
import { filterLegacyLabelKeys } from "../lib/shipping-labels/storage";
import type { ShippingLabelRecord } from "../types/shipping-labels";

async function makePdf(pageCount: number): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    pdf.addPage([100 + pageIndex, 200 + pageIndex]);
  }
  return Buffer.from(await pdf.save());
}

function createMemoryDeps() {
  const records: ShippingLabelRecord[] = [];
  const uploadedObjects = new Map<string, Buffer>();
  let nextId = 1;
  let now = 1_000;

  const deps: IngestShippingLabelDeps = {
    orderExists: async (orderId) => orderId === "order-1",
    findBySource: async (orderId, sourceFileHash) =>
      records.filter(
        (record) =>
          record.orderId === orderId &&
          record.sourceFileHash === sourceFileHash
      ),
    saveRecord: async (record) => {
      const existingIndex = records.findIndex(
        (candidate) =>
          candidate.orderId === record.orderId &&
          candidate.sourceFileHash === record.sourceFileHash &&
          candidate.pageNumber === record.pageNumber
      );
      if (existingIndex >= 0) {
        return records[existingIndex]!;
      }
      records.push(record);
      return record;
    },
    uploadObject: async (key, bytes) => {
      uploadedObjects.set(key, Buffer.from(bytes));
    },
    createId: () => `id-${nextId++}`,
    now: () => now++,
  };

  return { deps, records, uploadedObjects };
}

test("ingestion creates one future record and PDF object per source page", async () => {
  const memory = createMemoryDeps();
  const result = await ingestShippingLabelPdf(
    {
      orderId: "order-1",
      sourceFileName: "customer-labels.pdf",
      pdfBuffer: await makePdf(3),
    },
    memory.deps
  );

  assert.equal(result.duplicate, false);
  assert.equal(result.labels.length, 3);
  assert.deepEqual(
    result.labels.map((record) => record.pageNumber),
    [1, 2, 3]
  );
  assert.ok(
    result.labels.every((record) =>
      record.s3Key.startsWith("shipping-label-pages/order-1/")
    )
  );
  assert.equal(
    [...memory.uploadedObjects.keys()].filter((key) =>
      key.startsWith("shipping-label-uploads/order-1/")
    ).length,
    1
  );
  assert.equal(
    [...memory.uploadedObjects.keys()].filter((key) =>
      key.startsWith("shipping-label-pages/order-1/")
    ).length,
    3
  );
});

test("re-uploading the same PDF returns existing records without new writes", async () => {
  const memory = createMemoryDeps();
  const input = {
    orderId: "order-1",
    sourceFileName: "customer-labels.pdf",
    pdfBuffer: await makePdf(2),
  };

  const first = await ingestShippingLabelPdf(input, memory.deps);
  const firstObjectCount = memory.uploadedObjects.size;
  const second = await ingestShippingLabelPdf(input, memory.deps);

  assert.equal(second.duplicate, true);
  assert.deepEqual(
    second.labels.map((record) => record.id),
    first.labels.map((record) => record.id)
  );
  assert.equal(memory.records.length, 2);
  assert.equal(memory.uploadedObjects.size, firstObjectCount);
});

test("ingestion rejects missing orders before writing storage", async () => {
  const memory = createMemoryDeps();

  await assert.rejects(
    ingestShippingLabelPdf(
      {
        orderId: "missing-order",
        sourceFileName: "labels.pdf",
        pdfBuffer: await makePdf(1),
      },
      memory.deps
    ),
    /order not found/i
  );
  assert.equal(memory.uploadedObjects.size, 0);
  assert.equal(memory.records.length, 0);
});

test("legacy listing excludes every future-label prefix", () => {
  assert.deepEqual(
    filterLegacyLabelKeys([
      "order-1.pdf",
      "order-1-1.pdf",
      "shipping-label-pages/order-1/label.pdf",
      "shipping-label-uploads/order-1/upload/source.pdf",
      "nested/unrelated.pdf",
      "notes.txt",
    ]),
    ["order-1.pdf", "order-1-1.pdf"]
  );
});
