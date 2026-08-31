import assert from "node:assert/strict";
import { test } from "node:test";

import {
  evaluateFutureLabelCompletion,
  type FutureLabelCompletionDeps,
} from "../lib/shipping-labels/order-completion";
import type { ShippingLabelRecord } from "../types/shipping-labels";
import { ItemStatus, type Item, type Tracker, type TrackerStatus } from "../typings/types";

function tracker(status: TrackerStatus): Tracker {
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
    public_url: "https://example.test/tracker",
    fees: [],
    created_at: "2026-08-31T00:00:00.000Z",
    updated_at: "2026-08-31T00:00:00.000Z",
  };
}

function readyLabel(status: TrackerStatus, pageNumber: number): ShippingLabelRecord {
  const labelTracker = tracker(status);
  return {
    id: `label-${pageNumber}`,
    orderId: "order-1",
    uploadId: "upload-1",
    sourceFileName: "labels.pdf",
    sourceFileHash: "hash",
    pageNumber,
    pageCount: 2,
    s3Key: `shipping-label-pages/order-1/label-${pageNumber}.pdf`,
    processingStatus: "ready",
    trackingNumber: labelTracker.tracking_code,
    carrier: "UPS",
    trackerId: labelTracker.id,
    tracker: labelTracker,
    createdAt: pageNumber,
    updatedAt: pageNumber,
  };
}

function issueLabel(pageNumber: number): ShippingLabelRecord {
  return {
    ...readyLabel("pre_transit", pageNumber),
    processingStatus: "needs_review",
    processingError: "Tracking unreadable",
    trackingNumber: null,
    carrier: null,
    trackerId: null,
    tracker: null,
  };
}

function order(status = ItemStatus.At_The_Door): Item {
  return {
    id: "order-1",
    customerName: "Customer",
    createdAt: 1,
    status,
    visible: true,
    deleted: false,
    index: 1,
  };
}

function completionMemory(labels: ShippingLabelRecord[]) {
  let currentOrder = order();
  const completedTransitions: Array<{
    previousStatus: ItemStatus;
    completedAt: number;
  }> = [];

  const deps: FutureLabelCompletionDeps = {
    listLabels: async () => labels,
    getOrder: async () => currentOrder,
    completeOrder: async (_item, completedAt) => {
      completedTransitions.push({
        previousStatus: currentOrder.status,
        completedAt,
      });
      currentOrder = {
        ...currentOrder,
        prevStatus: currentOrder.status,
        status: ItemStatus.Done,
        completedAt,
      };
      return true;
    },
    now: () => 5_000,
  };

  return {
    deps,
    completedTransitions,
    getOrder: () => currentOrder,
  };
}

test("one pre_transit future label blocks order completion", async () => {
  const memory = completionMemory([
    readyLabel("in_transit", 1),
    readyLabel("pre_transit", 2),
  ]);

  assert.equal(
    await evaluateFutureLabelCompletion("order-1", memory.deps),
    false
  );
  assert.equal(memory.completedTransitions.length, 0);
  assert.equal(memory.getOrder().status, ItemStatus.At_The_Door);
});

test("one unresolved future label blocks order completion", async () => {
  const memory = completionMemory([
    readyLabel("delivered", 1),
    issueLabel(2),
  ]);

  assert.equal(
    await evaluateFutureLabelCompletion("order-1", memory.deps),
    false
  );
  assert.equal(memory.completedTransitions.length, 0);
});

test("all non-pre_transit labels complete the order exactly once", async () => {
  const memory = completionMemory([
    readyLabel("in_transit", 1),
    readyLabel("failure", 2),
  ]);

  assert.equal(
    await evaluateFutureLabelCompletion("order-1", memory.deps),
    true
  );
  assert.equal(
    await evaluateFutureLabelCompletion("order-1", memory.deps),
    true
  );
  assert.equal(memory.completedTransitions.length, 1);
  assert.equal(memory.completedTransitions[0]?.completedAt, 5_000);
  assert.equal(memory.getOrder().status, ItemStatus.Done);
});

test("orders without future records delegate to legacy completion", async () => {
  const memory = completionMemory([]);

  assert.equal(
    await evaluateFutureLabelCompletion("order-1", memory.deps),
    null
  );
  assert.equal(memory.completedTransitions.length, 0);
});

test("hidden future-label orders are never changed", async () => {
  const memory = completionMemory([
    readyLabel("delivered", 1),
    readyLabel("delivered", 2),
  ]);
  const hiddenOrder = await memory.deps.getOrder("order-1");
  assert.ok(hiddenOrder);
  Object.assign(hiddenOrder, {
    status: ItemStatus.Hidden,
  });

  assert.equal(
    await evaluateFutureLabelCompletion("order-1", memory.deps),
    true
  );
  assert.equal(memory.completedTransitions.length, 0);
});
