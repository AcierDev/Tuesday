import assert from "node:assert/strict";
import { test } from "node:test";

import {
  hasAnyShippingLabel,
  resumeIncompleteLabels,
  uploadAndScanFutureLabelFile,
  type FutureLabelClientApi,
} from "../lib/shipping-labels/client";
import { LABEL_SCAN_CONCURRENCY } from "../lib/shipping-labels/config";
import type { ShippingLabelRecord } from "../types/shipping-labels";

function pending(
  id: string,
  processingStatus: ShippingLabelRecord["processingStatus"] = "pending"
): ShippingLabelRecord {
  return {
    id,
    orderId: "order-1",
    uploadId: "upload-1",
    sourceFileName: "labels.pdf",
    sourceFileHash: "hash",
    pageNumber: Number(id.replace(/\D/g, "")) || 1,
    pageCount: 5,
    s3Key: `shipping-label-pages/order-1/${id}.pdf`,
    processingStatus,
    processingError:
      processingStatus === "needs_review" ? "Unreadable" : undefined,
    trackingNumber: null,
    carrier: null,
    trackerId: null,
    tracker: null,
    createdAt: 1,
    updatedAt: 1,
  };
}

function apiWithLabels(labels: ShippingLabelRecord[]) {
  const scannedIds: string[] = [];
  let activeScans = 0;
  let peakScans = 0;
  const api: FutureLabelClientApi = {
    upload: async () => ({
      uploadId: "upload-1",
      labels,
      duplicate: false,
    }),
    scan: async (labelId) => {
      scannedIds.push(labelId);
      activeScans += 1;
      peakScans = Math.max(peakScans, activeScans);
      await Promise.resolve();
      activeScans -= 1;
      return labels.find((label) => label.id === labelId) ?? pending(labelId);
    },
  };
  return { api, scannedIds, peakScans: () => peakScans };
}

test("a multi-page upload scans every returned page with bounded concurrency", async () => {
  const memory = apiWithLabels([
    pending("label-1"),
    pending("label-2"),
    pending("label-3"),
    pending("label-4"),
    pending("label-5"),
  ]);

  const result = await uploadAndScanFutureLabelFile(
    "order-1",
    new File(["pdf"], "labels.pdf", { type: "application/pdf" }),
    memory.api
  );

  assert.deepEqual(memory.scannedIds.sort(), [
    "label-1",
    "label-2",
    "label-3",
    "label-4",
    "label-5",
  ]);
  assert.equal(result.scanResults.length, 5);
  assert.ok(memory.peakScans() <= LABEL_SCAN_CONCURRENCY);
});

test("one scan request failure does not prevent sibling pages", async () => {
  const labels = [pending("label-1"), pending("label-2"), pending("label-3")];
  const memory = apiWithLabels(labels);
  memory.api.scan = async (labelId) => {
    memory.scannedIds.push(labelId);
    if (labelId === "label-2") throw new Error("Network failure");
    return labels.find((label) => label.id === labelId)!;
  };

  const result = await uploadAndScanFutureLabelFile(
    "order-1",
    new File(["pdf"], "labels.pdf", { type: "application/pdf" }),
    memory.api
  );

  assert.deepEqual(memory.scannedIds.sort(), [
    "label-1",
    "label-2",
    "label-3",
  ]);
  assert.equal(result.scanResults.filter((entry) => entry.error).length, 1);
});

test("opening inventory resumes every incomplete page, including stale scan claims", async () => {
  const labels = [
    pending("pending", "pending"),
    pending("ready", "ready"),
    pending("issue", "needs_review"),
    pending("scanning", "scanning"),
  ];
  const memory = apiWithLabels(labels);

  await resumeIncompleteLabels(labels, memory.api);

  assert.deepEqual(memory.scannedIds.sort(), ["issue", "pending", "scanning"]);
});

test("future summary counts make the existing row report a label", () => {
  assert.equal(hasAnyShippingLabel([], undefined), false);
  assert.equal(hasAnyShippingLabel(["legacy.pdf"], undefined), true);
  assert.equal(
    hasAnyShippingLabel([], { total: 3, unused: 2, used: 1, issues: 0 }),
    true
  );
});
