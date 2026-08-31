import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyFutureLabelTrackerUpdate,
  type FutureLabelTrackerUpdateDeps,
} from "../lib/shipping-labels/webhook";
import {
  processTrackerCompletion,
  type TrackerCompletionDeps,
} from "../lib/shipping-labels/webhook-completion";
import type { ShippingLabelRecord } from "../types/shipping-labels";
import type { Tracker } from "../typings/types";

function label(id: string, trackerId: string): ShippingLabelRecord {
  return {
    id,
    orderId: "order-1",
    uploadId: "upload-1",
    sourceFileName: "labels.pdf",
    sourceFileHash: "hash",
    pageNumber: id === "label-A" ? 1 : 2,
    pageCount: 2,
    s3Key: `shipping-label-pages/order-1/${id}.pdf`,
    processingStatus: "ready",
    trackingNumber: trackerId,
    carrier: "UPS",
    trackerId,
    tracker: updatedTracker(trackerId, "pre_transit"),
    createdAt: 1,
    updatedAt: 1,
  };
}

function updatedTracker(
  trackerId: string,
  status: Tracker["status"]
): Tracker {
  return {
    id: trackerId,
    object: "Tracker",
    mode: "production",
    tracking_code: `tracking-${trackerId}`,
    status,
    status_detail: status === "failure" ? "failure" : "in_transit",
    signed_by: null,
    weight: null,
    est_delivery_date: null,
    shipment_id: null,
    carrier: "UPS",
    tracking_details: [],
    carrier_detail: null,
    public_url: "https://example.test/tracker",
    fees: [],
    created_at: "2026-08-31T00:00:00.000Z",
    updated_at: "2026-08-31T01:00:00.000Z",
  };
}

test("webhook tracker updates exactly its matching future label", async () => {
  const labels = [label("label-A", "tracker-A"), label("label-B", "tracker-B")];
  const completionOrderIds: string[] = [];
  const deps: FutureLabelTrackerUpdateDeps = {
    updateByTrackerId: async (trackerId, tracker, updatedAt) => {
      const index = labels.findIndex((record) => record.trackerId === trackerId);
      if (index < 0) return null;
      labels[index] = {
        ...labels[index]!,
        tracker,
        trackingNumber: tracker.tracking_code,
        updatedAt,
      };
      return labels[index]!;
    },
    evaluateOrderCompletion: async (orderId) => {
      completionOrderIds.push(orderId);
      return false;
    },
    now: () => 2,
  };

  const result = await applyFutureLabelTrackerUpdate(
    updatedTracker("tracker-B", "failure"),
    deps
  );

  assert.equal(result.orderId, "order-1");
  assert.equal(labels[0]?.tracker?.status, "pre_transit");
  assert.equal(labels[1]?.tracker?.status, "failure");
  assert.deepEqual(completionOrderIds, ["order-1"]);
});

test("unmatched webhook trackers leave future labels untouched", async () => {
  let updateAttempts = 0;
  let completionCalls = 0;
  const deps: FutureLabelTrackerUpdateDeps = {
    updateByTrackerId: async () => {
      updateAttempts += 1;
      return null;
    },
    evaluateOrderCompletion: async () => {
      completionCalls += 1;
      return false;
    },
    now: () => 2,
  };

  const result = await applyFutureLabelTrackerUpdate(
    updatedTracker("legacy-tracker", "in_transit"),
    deps
  );

  assert.equal(result.orderId, null);
  assert.equal(result.completion, null);
  assert.equal(updateAttempts, 1);
  assert.equal(completionCalls, 0);
});

function completionDeps(
  futureUpdate: Awaited<
    ReturnType<TrackerCompletionDeps["applyFutureLabelUpdate"]>
  >,
  futureCompletion: boolean | null
) {
  const calls = {
    evaluated: [] as string[],
    legacy: [] as string[],
  };
  const deps: TrackerCompletionDeps = {
    applyFutureLabelUpdate: async () => futureUpdate,
    evaluateFutureLabelCompletion: async (orderId) => {
      calls.evaluated.push(orderId);
      return futureCompletion;
    },
    completeLegacyOrder: async (orderId) => {
      calls.legacy.push(orderId);
      return true;
    },
  };
  return { calls, deps };
}

test("a matched future tracker completes only when every future label has left pre_transit", async () => {
  const blocked = completionDeps(
    { orderId: "order-1", completion: false },
    null
  );
  assert.equal(
    await processTrackerCompletion(
      updatedTracker("tracker-A", "in_transit"),
      "order-1",
      blocked.deps
    ),
    null
  );
  assert.deepEqual(blocked.calls.legacy, []);

  const complete = completionDeps(
    { orderId: "order-1", completion: true },
    null
  );
  assert.equal(
    await processTrackerCompletion(
      updatedTracker("tracker-B", "in_transit"),
      "order-1",
      complete.deps
    ),
    "order-1"
  );
  assert.deepEqual(complete.calls.legacy, []);
});

test("legacy trackers remain backward compatible but cannot bypass future labels", async () => {
  const mixedOrder = completionDeps(
    { orderId: null, completion: null },
    false
  );
  assert.equal(
    await processTrackerCompletion(
      updatedTracker("legacy-tracker", "delivered"),
      "order-1",
      mixedOrder.deps
    ),
    null
  );
  assert.deepEqual(mixedOrder.calls.evaluated, ["order-1"]);
  assert.deepEqual(mixedOrder.calls.legacy, []);

  const legacyOnly = completionDeps(
    { orderId: null, completion: null },
    null
  );
  assert.equal(
    await processTrackerCompletion(
      updatedTracker("legacy-tracker", "delivered"),
      "order-legacy",
      legacyOnly.deps
    ),
    "order-legacy"
  );
  assert.deepEqual(legacyOnly.calls.legacy, ["order-legacy"]);
});

test("legacy pre_transit updates never complete an order", async () => {
  const legacyOnly = completionDeps(
    { orderId: null, completion: null },
    null
  );
  assert.equal(
    await processTrackerCompletion(
      updatedTracker("legacy-tracker", "pre_transit"),
      "order-legacy",
      legacyOnly.deps
    ),
    null
  );
  assert.deepEqual(legacyOnly.calls.legacy, []);
});
