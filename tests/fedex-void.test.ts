import assert from "node:assert/strict";
import { test } from "node:test";

import { voidFedExLabel, type FedExVoidDeps } from "../lib/shipping-labels/fedex-void";
import {
  activePurchase,
  planVoid,
  type OrderPurchaseFields,
  type StoredPurchase,
  type VoidPlan,
} from "../lib/shipping-labels/purchase-records";

const NOW = 1_760_000_000_000;

function purchase(trackingNumber: string, extra: Partial<StoredPurchase> = {}): StoredPurchase {
  return {
    id: `p-${trackingNumber}`,
    source: "fedex-api",
    trackingNumber,
    trackingNumbers: [trackingNumber, `${trackingNumber}-2`],
    labelFilename: `order-1-${trackingNumber}.pdf`,
    totalNetCharge: 30,
    purchasedAt: NOW - 1000,
    shipFrom: { name: "E", line1: "1", city: "H", state: "NV", postalCode: "89074", country: "US" },
    ...extra,
  };
}

test("voiding the latest purchase moves the order to the previous live one", () => {
  const first = purchase("111");
  const second = purchase("222");
  const plan = planVoid(
    { purchasedShipment: second, purchasedShipments: [first, second] },
    "222",
    NOW
  );
  assert.ok(plan);
  assert.equal(plan.alreadyVoided, false);
  assert.equal(plan.history[1]?.voidedAt, NOW);
  assert.equal(plan.nextPurchasedShipment?.trackingNumber, "111");
});

test("voiding the only (pre-history) purchase clears it so spend stats drop it", () => {
  const legacy = { trackingNumber: "333", carrier: "FedEx", purchasedAt: NOW, totalNetCharge: 25 };
  const order: OrderPurchaseFields = { purchasedShipment: legacy };
  const plan = planVoid(order, "333", NOW);
  assert.ok(plan);
  assert.equal(plan.nextPurchasedShipment, null);
  assert.equal(plan.history.length, 1);
  assert.equal(plan.history[0]?.voidedAt, NOW);
  assert.equal(activePurchase({ purchasedShipment: plan.history[0] }), null);
});

test("a box tracking number finds its purchase; voided purchases report already voided", () => {
  const voided = purchase("444", { voidedAt: NOW });
  assert.equal(planVoid({ purchasedShipments: [voided] }, "444-2", NOW)?.alreadyVoided, true);
  assert.equal(planVoid({ purchasedShipments: [voided] }, "999", NOW), null);
});

function voidHarness(order: OrderPurchaseFields | null, cancelled = true) {
  const events: string[] = [];
  let savedPlan: VoidPlan | null = null;
  const deps: FedExVoidDeps = {
    getOrder: async () => order,
    cancel: async (trackingNumber, country, accountId) => {
      events.push(`cancel:${trackingNumber}:${country}${accountId ? `:${accountId}` : ""}`);
      return { cancelled, message: cancelled ? "Shipment is successfully cancelled" : "Already tendered" };
    },
    saveVoid: async (_orderId, plan) => {
      events.push("save");
      savedPlan = plan;
    },
    removeTrackers: async (_orderId, numbers) => {
      events.push(`trackers:${numbers.join(",")}`);
    },
    removeLabelFile: async (filename) => {
      events.push(`file:${filename}`);
    },
    now: () => NOW,
  };
  return { deps, events, savedPlan: () => savedPlan };
}

test("a successful void cancels the master number, saves, then clears trackers and the PDF", async () => {
  const current = purchase("555");
  const { deps, events, savedPlan } = voidHarness({
    purchasedShipment: current,
    purchasedShipments: [current],
  });
  const outcome = await voidFedExLabel({ orderId: "order-1", trackingNumber: "555-2" }, deps);

  assert.equal(outcome.status, 200);
  assert.deepEqual(events, [
    "cancel:555:US",
    "save",
    "trackers:555,555-2",
    "file:order-1-555.pdf",
  ]);
  assert.equal(savedPlan()?.nextPurchasedShipment, null);
});

test("when FedEx refuses the void nothing is saved", async () => {
  const current = purchase("666");
  const { deps, events } = voidHarness({ purchasedShipments: [current] }, false);
  const outcome = await voidFedExLabel({ orderId: "order-1", trackingNumber: "666" }, deps);
  assert.equal(outcome.status, 422);
  assert.ok("error" in outcome && /Already tendered/.test(outcome.error));
  assert.deepEqual(events, ["cancel:666:US"]);
});

test("unknown orders, unknown labels and repeated voids are rejected before FedEx", async () => {
  assert.equal((await voidFedExLabel({ orderId: "x", trackingNumber: "1" }, voidHarness(null).deps)).status, 404);
  const missing = voidHarness({ purchasedShipments: [purchase("777")] });
  assert.equal((await voidFedExLabel({ orderId: "o", trackingNumber: "1" }, missing.deps)).status, 404);
  const repeated = voidHarness({ purchasedShipments: [purchase("888", { voidedAt: NOW })] });
  assert.equal((await voidFedExLabel({ orderId: "o", trackingNumber: "888" }, repeated.deps)).status, 409);
  assert.deepEqual([...missing.events, ...repeated.events], []);
});

test("a void is cancelled on the FedEx account that bought the label", async () => {
  const current = purchase("777", { accountId: "125" });
  const { deps, events } = voidHarness({ purchasedShipment: current, purchasedShipments: [current] });
  const outcome = await voidFedExLabel({ orderId: "order-1", trackingNumber: "777" }, deps);
  assert.equal(outcome.status, 200);
  assert.equal(events[0], "cancel:777:US:125");
});
