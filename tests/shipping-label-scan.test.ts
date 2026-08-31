import assert from "node:assert/strict";
import { test } from "node:test";

import {
  scanShippingLabel,
  type ScanShippingLabelDeps,
} from "../lib/shipping-labels/scanner";
import {
  handleScanFutureLabel,
  type ScanShippingLabelHttpDeps,
} from "../lib/shipping-labels/scan-http";
import { mergeTrackerProjection } from "../lib/shipping-labels/tracker-projection";
import type { TrackingInfo } from "../types/shipping";
import type { ShippingLabelRecord } from "../types/shipping-labels";
import type { Tracker, TrackerStatus } from "../typings/types";

const TRACKING_A = "1Z999AA10123456783";
const TRACKING_B = "1Z999AA10123456784";

function tracker(
  trackingCode: string,
  status: TrackerStatus = "pre_transit"
): Tracker {
  return {
    id: `tracker-${trackingCode}`,
    object: "Tracker",
    mode: "production",
    tracking_code: trackingCode,
    status,
    status_detail: "unknown",
    signed_by: null,
    weight: null,
    est_delivery_date: null,
    shipment_id: null,
    carrier: "UPS",
    tracking_details: [],
    carrier_detail: null,
    public_url: `https://example.test/${trackingCode}`,
    fees: [],
    created_at: "2026-08-31T00:00:00.000Z",
    updated_at: "2026-08-31T00:00:00.000Z",
  };
}

function pendingLabel(id = "label-B"): ShippingLabelRecord {
  return {
    id,
    orderId: "order-1",
    uploadId: "upload-1",
    sourceFileName: "labels.pdf",
    sourceFileHash: "hash",
    pageNumber: 2,
    pageCount: 3,
    s3Key: `shipping-label-pages/order-1/${id}.pdf`,
    processingStatus: "pending",
    trackingNumber: null,
    carrier: null,
    trackerId: null,
    tracker: null,
    createdAt: 1,
    updatedAt: 1,
  };
}

function createScanMemory(options?: {
  extractionError?: Error;
  initialTrackers?: Tracker[];
  trackingCode?: string;
}) {
  let record = pendingLabel();
  let projectedTrackers = [...(options?.initialTrackers ?? [])];
  let extractionCalls = 0;
  let fetchTrackerCalls = 0;
  let completionCalls = 0;

  const extractedTracking: TrackingInfo = {
    trackingNumber: options?.trackingCode ?? TRACKING_B,
    carrier: "UPS",
    sender: "Everwood",
    receiver: "Customer",
  };

  const deps: ScanShippingLabelDeps = {
    getLabel: async (labelId) => (labelId === record.id ? record : null),
    claimLabel: async (labelId, timestamp) => {
      if (labelId !== record.id) return null;
      record = { ...record, processingStatus: "scanning", updatedAt: timestamp };
      return record;
    },
    getObject: async () => Buffer.from("one-page-pdf"),
    extractTracking: async () => {
      extractionCalls += 1;
      if (options?.extractionError) throw options.extractionError;
      return extractedTracking;
    },
    fetchTracker: async (trackingNumber) => {
      fetchTrackerCalls += 1;
      return tracker(trackingNumber);
    },
    saveReady: async (labelId, update) => {
      assert.equal(labelId, record.id);
      record = {
        ...record,
        ...update,
        processingStatus: "ready",
        processingError: undefined,
      };
      return record;
    },
    saveNeedsReview: async (labelId, processingError, updatedAt) => {
      assert.equal(labelId, record.id);
      record = {
        ...record,
        processingStatus: "needs_review",
        processingError,
        updatedAt,
      };
      return record;
    },
    upsertTrackerProjection: async (_orderId, incoming) => {
      projectedTrackers = mergeTrackerProjection(projectedTrackers, incoming);
    },
    evaluateOrderCompletion: async () => {
      completionCalls += 1;
    },
    now: () => 2,
  };

  return {
    deps,
    getRecord: () => record,
    getProjectedTrackers: () => projectedTrackers,
    getExtractionCalls: () => extractionCalls,
    getFetchTrackerCalls: () => fetchTrackerCalls,
    getCompletionCalls: () => completionCalls,
  };
}

test("scanning one page appends its tracker without replacing siblings", async () => {
  const memory = createScanMemory({ initialTrackers: [tracker(TRACKING_A)] });

  const result = await scanShippingLabel("label-B", null, memory.deps);

  assert.equal(result.processingStatus, "ready");
  assert.equal(result.trackingNumber, TRACKING_B);
  assert.deepEqual(
    memory.getProjectedTrackers().map((entry) => entry.tracking_code),
    [TRACKING_A, TRACKING_B]
  );
  assert.equal(memory.getCompletionCalls(), 1);
});

test("projection replaces the same tracking code instead of duplicating it", () => {
  const original = tracker(TRACKING_B, "pre_transit");
  const updated = tracker(TRACKING_B, "in_transit");

  const merged = mergeTrackerProjection([tracker(TRACKING_A), original], updated);

  assert.equal(merged.length, 2);
  assert.equal(merged[1]?.status, "in_transit");
});

test("failed extraction marks only that page for review", async () => {
  const memory = createScanMemory({
    extractionError: new Error("Tracking number could not be read"),
    initialTrackers: [tracker(TRACKING_A)],
  });

  const result = await scanShippingLabel("label-B", null, memory.deps);

  assert.equal(result.processingStatus, "needs_review");
  assert.match(result.processingError ?? "", /tracking number/i);
  assert.deepEqual(
    memory.getProjectedTrackers().map((entry) => entry.tracking_code),
    [TRACKING_A]
  );
  assert.equal(memory.getCompletionCalls(), 0);
});

test("manual correction skips extraction and creates the page tracker", async () => {
  const memory = createScanMemory();

  const result = await scanShippingLabel(
    "label-B",
    { trackingNumber: "1Z999AA10123456784", carrier: "UPS" },
    memory.deps
  );

  assert.equal(result.trackingNumber, "1Z999AA10123456784");
  assert.equal(memory.getExtractionCalls(), 0);
  assert.equal(memory.getFetchTrackerCalls(), 1);
});

test("an already-ready page repairs projection without rescanning", async () => {
  const memory = createScanMemory();
  const first = await scanShippingLabel("label-B", null, memory.deps);
  const second = await scanShippingLabel("label-B", null, memory.deps);

  assert.equal(second.id, first.id);
  assert.equal(memory.getExtractionCalls(), 1);
  assert.equal(memory.getFetchTrackerCalls(), 1);
  assert.equal(memory.getProjectedTrackers().length, 1);
  assert.equal(memory.getCompletionCalls(), 2);
});

test("scan HTTP accepts an empty automatic-scan request", async () => {
  const calls: unknown[] = [];
  const deps: ScanShippingLabelHttpDeps = {
    scan: async (labelId, manual) => {
      calls.push({ labelId, manual });
      return pendingLabel(labelId);
    },
  };
  const response = await handleScanFutureLabel(
    new Request("https://example.test/scan", { method: "POST" }),
    "label-B",
    deps
  );

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [{ labelId: "label-B", manual: null }]);
});

test("scan HTTP passes validated manual tracking correction", async () => {
  const calls: unknown[] = [];
  const deps: ScanShippingLabelHttpDeps = {
    scan: async (labelId, manual) => {
      calls.push({ labelId, manual });
      return pendingLabel(labelId);
    },
  };
  const response = await handleScanFutureLabel(
    new Request("https://example.test/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackingNumber: "1Z999AA10123456784",
        carrier: "UPS",
      }),
    }),
    "label-B",
    deps
  );

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [
    {
      labelId: "label-B",
      manual: {
        trackingNumber: "1Z999AA10123456784",
        carrier: "UPS",
      },
    },
  ]);
});
