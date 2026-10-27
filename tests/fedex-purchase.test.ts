import assert from "node:assert/strict";
import { test } from "node:test";

import type { FedExPurchaseResult } from "../lib/fedex-api";
import {
  completePurchaseFollowUps,
  purchaseFedExLabel,
  type FedExPurchaseDeps,
  type FedExPurchaseInput,
} from "../lib/shipping-labels/fedex-purchase";
import type {
  OrderPurchaseFields,
  PurchasedShipmentRecord,
} from "../lib/shipping-labels/purchase-records";

const NOW = 1_760_000_000_000;
const LABEL = Buffer.from("%PDF-label");

const input: FedExPurchaseInput = {
  orderId: "order-1",
  serviceType: "FEDEX_GROUND",
  shipFrom: { name: "Everwood", line1: "1 Origin", city: "Henderson", state: "NV", postalCode: "89074", country: "US" },
  shipTo: { name: "Buyer", line1: "10 Main", city: "Austin", state: "TX", postalCode: "78701", country: "US" },
  packages: [{ id: "a", length: 41, width: 25, height: 6, weight: 31 }],
  purchaseDefaults: {
    pickupType: "DROPOFF_AT_FEDEX_LOCATION",
    packagingType: "YOUR_PACKAGING",
    labelStockType: "PAPER_4X6",
    signatureOption: "NO_SIGNATURE_REQUIRED",
  },
  confirmRepurchase: false,
  quotedNetCharge: 31.5,
};

function purchaseResult(overrides: Partial<FedExPurchaseResult> = {}): FedExPurchaseResult {
  return {
    serviceType: "FEDEX_GROUND",
    serviceName: "Fedex Ground",
    trackingNumber: "794600000001",
    trackingNumbers: ["794600000001", "794600000002"],
    labelBuffer: LABEL,
    totalNetCharge: 31.5,
    currency: "USD",
    ...overrides,
  };
}

function harness(order: OrderPurchaseFields | null = {}) {
  const events: string[] = [];
  let saved: PurchasedShipmentRecord | null = null;
  const patches: { patch: Partial<PurchasedShipmentRecord>; unset: string[] }[] = [];
  const deps: FedExPurchaseDeps = {
    getOrder: async () => order,
    claimPurchaseLock: async () => {
      events.push("lock");
      return true;
    },
    releasePurchaseLock: async () => {
      events.push("unlock");
    },
    purchase: async () => {
      events.push("purchase");
      return purchaseResult();
    },
    savePurchase: async (_orderId, record) => {
      events.push("save");
      saved = record;
    },
    updatePurchase: async (_orderId, _id, patch, unset) => {
      patches.push({ patch, unset: unset as string[] });
    },
    createLabelFilename: async (orderId) => `${orderId}-17600000000001234.pdf`,
    uploadLabel: async (filename) => {
      events.push("upload");
      return `https://bucket.test/${filename}`;
    },
    createTracker: async (_orderId, trackingNumber) => {
      events.push(`tracker:${trackingNumber}`);
    },
    createId: () => "purchase-1",
    now: () => NOW,
  };
  return { deps, events, patches, saved: () => saved };
}

const existingPurchase = {
  trackingNumber: "111111111111",
  purchasedAt: NOW - 1000,
  carrier: "FedEx",
};

test("records tracking and charge before uploading the label or creating trackers", async () => {
  const { deps, events, saved } = harness();
  const outcome = await purchaseFedExLabel(input, deps);

  assert.equal(outcome.status, 200);
  assert.deepEqual(events, [
    "lock",
    "purchase",
    "save",
    "upload",
    "tracker:794600000001",
    "tracker:794600000002",
    "unlock",
  ]);
  const record = saved();
  assert.equal(record?.trackingNumber, "794600000001");
  assert.deepEqual(record?.trackingNumbers, ["794600000001", "794600000002"]);
  assert.equal(record?.totalNetCharge, 31.5);
  assert.equal(record?.quotedNetCharge, 31.5);
  assert.equal(record?.pendingLabelBase64, LABEL.toString("base64"));
  if (outcome.status === 200 && "purchasedShipment" in outcome) {
    assert.equal(outcome.purchasedShipment.labelStatus, "done");
    assert.equal(outcome.purchasedShipment.trackerStatus, "done");
    assert.equal(outcome.purchasedShipment.pendingLabelBase64, undefined);
    assert.deepEqual(outcome.warnings, []);
  }
});

test("an existing purchase needs explicit confirmation (409, nothing bought)", async () => {
  const { deps, events } = harness({ purchasedShipment: existingPurchase });
  const outcome = await purchaseFedExLabel(input, deps);

  assert.equal(outcome.status, 409);
  assert.ok("error" in outcome && /111111111111/.test(outcome.error));
  assert.equal(events.includes("purchase"), false);
});

test("a confirmed repurchase proceeds and voided or uploaded labels never block", async () => {
  const confirmed = harness({ purchasedShipment: existingPurchase });
  assert.equal(
    (await purchaseFedExLabel({ ...input, confirmRepurchase: true }, confirmed.deps)).status,
    200
  );

  const voided = harness({ purchasedShipment: { ...existingPurchase, voidedAt: NOW } });
  assert.equal((await purchaseFedExLabel(input, voided.deps)).status, 200);

  const uploaded = harness({
    purchasedShipment: { source: "uploaded", carrier: "UPS", purchasedAt: NOW },
  });
  assert.equal((await purchaseFedExLabel(input, uploaded.deps)).status, 200);
});

test("a purchase already in progress for the order is refused", async () => {
  const { deps, events } = harness();
  deps.claimPurchaseLock = async () => false;
  const outcome = await purchaseFedExLabel(input, deps);
  assert.equal(outcome.status, 409);
  assert.equal(events.includes("purchase"), false);
});

test("upload and tracker failures are recorded as retryable warnings, not a 500", async () => {
  const { deps, patches } = harness();
  deps.uploadLabel = async () => {
    throw new Error("S3 unavailable");
  };
  deps.createTracker = async (_orderId, trackingNumber) => {
    if (trackingNumber.endsWith("2")) throw new Error("EasyPost down");
  };

  const outcome = await purchaseFedExLabel(input, deps);
  assert.equal(outcome.status, 200);
  assert.ok("purchasedShipment" in outcome);
  if (!("purchasedShipment" in outcome)) return;
  const purchase = outcome.purchasedShipment;
  assert.equal(purchase.labelStatus, "failed");
  assert.equal(purchase.labelError, "S3 unavailable");
  assert.equal(purchase.pendingLabelBase64, LABEL.toString("base64"));
  assert.equal(purchase.trackerStatus, "failed");
  assert.deepEqual(purchase.pendingTrackerNumbers, ["794600000002"]);
  assert.equal(outcome.warnings.length, 2);
  assert.ok(patches.some(({ patch }) => patch.labelStatus === "failed"));

  // Retrying later uploads the kept label and only the missing tracker.
  const retried: string[] = [];
  const result = await completePurchaseFollowUps("order-1", purchase, {
    updatePurchase: async () => undefined,
    uploadLabel: async (filename) => {
      retried.push(`upload:${filename}`);
      return "https://bucket.test/label.pdf";
    },
    createTracker: async (_orderId, trackingNumber) => {
      retried.push(`tracker:${trackingNumber}`);
    },
  });
  assert.deepEqual(retried, [
    "upload:order-1-17600000000001234.pdf",
    "tracker:794600000002",
  ]);
  assert.equal(result.purchasedShipment.labelStatus, "done");
  assert.equal(result.purchasedShipment.pendingLabelBase64, undefined);
  assert.equal(result.purchasedShipment.trackerStatus, "done");
  assert.deepEqual(result.warnings, []);
});

test("a shipment FedEx created without a readable label keeps its tracking", async () => {
  const { deps, saved, events } = harness();
  deps.purchase = async () =>
    purchaseResult({ labelBuffer: null, labelError: "no label", totalNetCharge: null });
  const outcome = await purchaseFedExLabel(input, deps);

  assert.equal(outcome.status, 200);
  assert.equal(saved()?.labelStatus, "failed");
  assert.equal(saved()?.totalNetCharge, null);
  assert.equal(events.includes("upload"), false);
  assert.ok("warnings" in outcome && outcome.warnings[0]?.includes("no label"));
});

test("if saving the purchase fails, the response still carries the tracking numbers", async () => {
  const { deps, events } = harness();
  deps.savePurchase = async () => {
    throw new Error("Mongo down");
  };
  const outcome = await purchaseFedExLabel(input, deps);
  assert.equal(outcome.status, 500);
  assert.ok("error" in outcome && /794600000001/.test(outcome.error));
  assert.equal(events.includes("upload"), false);
  assert.equal(events.at(-1), "unlock");
});

test("FedEx purchase errors propagate and release the lock", async () => {
  const { deps, events } = harness();
  deps.purchase = async () => {
    throw new Error("FedEx said no");
  };
  await assert.rejects(purchaseFedExLabel(input, deps), /FedEx said no/);
  assert.equal(events.at(-1), "unlock");
});

test("a new purchase sends its tracking to Etsy after the label and trackers", async () => {
  const { deps, events, saved } = harness();
  deps.pushEtsyTracking = async (_orderId, purchase) => {
    events.push(`etsy:${purchase.trackingNumber}`);
    return "done";
  };
  const outcome = await purchaseFedExLabel(input, deps);
  assert.equal(outcome.status, 200);
  assert.equal(saved()?.etsyStatus, "pending");
  assert.equal(events.at(-2), "etsy:794600000001");
  assert.ok("purchasedShipment" in outcome && outcome.purchasedShipment.etsyStatus === "done");
});

test("an Etsy tracking failure is a retryable warning; legacy purchases are never sent", async () => {
  const { deps, patches } = harness();
  let calls = 0;
  deps.pushEtsyTracking = async () => {
    calls++;
    throw new Error("Etsy error 503");
  };
  const base = {
    id: "purchase-1", orderId: "order-1", trackingNumber: "794600000001", trackingNumbers: ["794600000001"],
    labelStatus: "done", trackerStatus: "done",
  } as PurchasedShipmentRecord;

  const failed = await completePurchaseFollowUps("order-1", { ...base, etsyStatus: "pending" }, deps);
  assert.equal(failed.purchasedShipment.etsyStatus, "failed");
  assert.equal(failed.purchasedShipment.etsyError, "Etsy error 503");
  assert.match(failed.warnings.join(" "), /Tracking not sent to Etsy/);
  assert.deepEqual(patches.at(-1)?.patch, { etsyStatus: "failed", etsyError: "Etsy error 503" });

  await completePurchaseFollowUps("order-1", base, deps);
  assert.equal(calls, 1);
});
