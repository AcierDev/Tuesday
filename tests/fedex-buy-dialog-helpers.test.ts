import assert from "node:assert/strict";
import { test } from "node:test";

import {
  chargeMismatchWarning,
  draftSourceHash,
  FEDEX_STREET_LINE_MAX_LENGTH,
  recipientAddressWarnings,
} from "../lib/shipping-labels/buy-label-draft";
import {
  legacyLabelKeyPattern,
  uniqueLegacyLabelFilename,
} from "../lib/shipping-labels/legacy-filename";
import {
  INTERNATIONAL_NOT_SUPPORTED_MESSAGE,
  parseFedExRateRequest,
  parseFedExShipmentRequest,
  publicPurchase,
} from "../lib/shipping-labels/purchase-request";
import type { ShippingDetails } from "../typings/types";

const details: ShippingDetails = {
  name: "Buyer",
  company: null,
  street1: "10 Main St",
  street2: "",
  street3: null,
  city: "Austin",
  state: "TX",
  postalCode: "78701",
  country: "US",
  phone: null,
  residential: true,
  addressVerified: "unknown",
};

test("a saved draft is tied to the order address and the settings version", () => {
  const base = draftSourceHash({ shippingDetails: details, customerName: "Buyer", settingsUpdatedAt: 1 });
  assert.equal(
    base,
    draftSourceHash({ shippingDetails: { ...details }, customerName: "Buyer", settingsUpdatedAt: 1 })
  );
  assert.notEqual(
    base,
    draftSourceHash({ shippingDetails: { ...details, street1: "11 Main St" }, customerName: "Buyer", settingsUpdatedAt: 1 })
  );
  assert.notEqual(
    base,
    draftSourceHash({ shippingDetails: details, customerName: "Buyer", settingsUpdatedAt: 2 })
  );
});

test("PO boxes and street lines over FedEx's limit are flagged", () => {
  const address = {
    name: "Buyer",
    line1: "P.O. Box 12",
    line2: "x".repeat(FEDEX_STREET_LINE_MAX_LENGTH + 1),
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    country: "US",
  };
  const warnings = recipientAddressWarnings(address);
  assert.equal(warnings.length, 2);
  assert.match(warnings[0]!, /PO Box/);
  assert.match(warnings[1]!, /line 2/);
  assert.deepEqual(recipientAddressWarnings({ ...address, line1: "12 Boxwood Ln", line2: "" }), []);
});

test("a charge that differs from the quote (or is missing) is called out", () => {
  assert.equal(chargeMismatchWarning(31.5, 31.5), null);
  assert.equal(chargeMismatchWarning(31.5, 31.505), null);
  assert.match(chargeMismatchWarning(31.5, 35) ?? "", /\$35\.00.*\$31\.50/);
  assert.match(chargeMismatchWarning(31.5, null) ?? "", /did not report/);
});

test("purchased label filenames are unique and still group under their order", () => {
  const first = uniqueLegacyLabelFilename("123", 1_760_000_000_000, () => 0.1234);
  const second = uniqueLegacyLabelFilename("123", 1_760_000_000_000, () => 0.9876);
  assert.notEqual(first, second);
  assert.match(first, legacyLabelKeyPattern("123"));
  assert.match(first, /^[\w.-]+\.pdf$/);
  assert.equal(first.match(/^(.+?)(?:-\d+)?\.pdf$/)?.[1], "123");
});

test("order ids are escaped before building the label regex", () => {
  const pattern = legacyLabelKeyPattern("a.b+c");
  assert.equal(pattern.test("a.b+c-2.pdf"), true);
  assert.equal(pattern.test("aXb+c.pdf"), false);
  assert.equal(pattern.test("a.bbc.pdf"), false);
});

const shipment = {
  orderId: "123",
  serviceType: "FEDEX_GROUND",
  shipFrom: { name: "E", line1: "1", city: "Henderson", state: "NV", postalCode: "89074", country: "US" },
  shipTo: { name: "B", line1: "10 Main", city: "Austin", state: "TX", postalCode: "78701", country: "US" },
  packages: [{ id: "a", length: 41, width: 25, height: 6, weight: 31 }],
  purchaseDefaults: { signatureOption: "NO_SIGNATURE_REQUIRED" },
  quotedNetCharge: 31.5,
};

test("shipment requests are validated before reaching FedEx", () => {
  const parsed = parseFedExShipmentRequest(shipment);
  assert.ok(parsed.ok);
  if (parsed.ok) {
    assert.equal(parsed.value.confirmRepurchase, false);
    assert.equal(parsed.value.quotedNetCharge, 31.5);
  }
  assert.equal(parseFedExShipmentRequest({ ...shipment, confirmRepurchase: true }).ok, true);
  assert.deepEqual(parseFedExShipmentRequest({ ...shipment, orderId: "../x" }), {
    ok: false,
    error: "A valid order id is required.",
  });
  assert.equal(
    parseFedExShipmentRequest({ ...shipment, packages: [{ length: 0, width: 1, height: 1, weight: 1 }] }).ok,
    false
  );
  assert.equal(parseFedExShipmentRequest({ ...shipment, packages: [null] }).ok, false);
  assert.equal(parseFedExRateRequest(null).ok, false);
});

test("international destinations are refused with the customs message", () => {
  assert.deepEqual(
    parseFedExRateRequest({ ...shipment, shipTo: { ...shipment.shipTo, country: "CA" } }),
    { ok: false, error: INTERNATIONAL_NOT_SUPPORTED_MESSAGE }
  );
});

test("label bytes kept for retries never reach the browser", () => {
  assert.equal(
    "pendingLabelBase64" in publicPurchase({ trackingNumber: "1", pendingLabelBase64: "AAAA" }),
    false
  );
});
