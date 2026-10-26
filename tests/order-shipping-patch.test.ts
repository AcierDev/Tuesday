import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mergeOrderShippingPatch,
  normalizeOrderShippingInput,
  OrderShippingValidationError,
} from "../lib/order-shipping-patch";
import type { ShippingDetails } from "../typings/types";

const existing: ShippingDetails = {
  name: "Recipient", company: "Saved business", street1: "12 Saved St", street2: "Unit 7", street3: null,
  city: "Saved city", state: "CA", postalCode: "90210", country: "US", phone: null,
  buyer_email: "buyer@example.test", residential: false, addressVerified: "Address validated successfully",
};

test("changing recipient fields resets stale validation even if the caller sends verified text", () => {
  const result = mergeOrderShippingPatch({ shippingDetails: existing }, { shippingDetails: { name: "New recipient", addressVerified: "Address validated successfully" } });
  assert.equal(result.shippingDetails?.name, "New recipient");
  assert.equal(result.shippingDetails?.addressVerified, "");
  assert.equal(result.shippingDetails?.street1, "12 Saved St");
  assert.equal(existing.name, "Recipient");
});

test("unchanged address and contact-only edits preserve verification", () => {
  const result = mergeOrderShippingPatch({ shippingDetails: existing }, { shippingDetails: { street1: "12 Saved St", country: "us", phone: "5551112222", buyer_email: "new@example.test" } });
  assert.equal(result.shippingDetails?.addressVerified, "Address validated successfully");
  assert.equal(result.shippingDetails?.phone, "5551112222");
  assert.equal(result.shippingDetails?.country, "US");
});

test("missing legacy metadata accepts partial updates without dropping nullable fields", () => {
  const result = mergeOrderShippingPatch({}, { shippingDetails: { street1: "New street", phone: null }, etsyOrder: { receiptId: "123" } });
  assert.equal(result.shippingDetails?.street1, "New street");
  assert.equal(result.shippingDetails?.phone, null);
  assert.equal(result.shippingDetails?.addressVerified, "");
  assert.deepEqual(result.etsyOrder, { receiptId: "123" });
});

test("explicit empty strings clear saved fields and Etsy IDs while omitted IDs survive", () => {
  const result = mergeOrderShippingPatch({ shippingDetails: existing, etsyOrder: { receiptId: "123", transactionId: "456" } }, { shippingDetails: { company: "", street2: "" }, etsyOrder: { receiptId: "" } });
  assert.equal(result.shippingDetails?.company, "");
  assert.equal(result.shippingDetails?.street2, "");
  assert.deepEqual(result.etsyOrder, { receiptId: "", transactionId: "456" });
});

test("fillMissing treats false as saved and fills only blank/null/missing values", () => {
  const result = mergeOrderShippingPatch({ shippingDetails: { ...existing, street2: "  ", company: null } }, { shippingDetails: { residential: true, name: "Imported", street2: "Suite 9", company: "Imported business" } }, "fillMissing");
  assert.equal(result.shippingDetails?.residential, false);
  assert.equal(result.shippingDetails?.name, "Recipient");
  assert.equal(result.shippingDetails?.street2, "Suite 9");
  assert.equal(result.shippingDetails?.company, "Imported business");
});

test("shipping validation permits legacy full payload and normalizes country without changing other values", () => {
  const result = normalizeOrderShippingInput({ customerName: "Board name", shippingDetails: { ...existing, country: " ca " }, etsyOrder: { receiptId: "123", transactionId: "456" } });
  assert.equal(result.shippingDetails?.country, "CA");
  assert.equal(result.customerName, "Board name");
  assert.equal(result.shippingDetails?.company, "Saved business");
});

test("invalid shipping metadata fails validation rather than coercing or accepting injected keys", () => {
  for (const incoming of [
    { shippingDetails: "street" }, { shippingDetails: { country: "ZZZ" } },
    { shippingDetails: { name: null } }, { shippingDetails: { buyer_email: false } },
    { shippingDetails: { postalCode: 90210 } }, { shippingDetails: { residential: "false" } },
    { shippingDetails: { addressVerified: true } }, { shippingDetails: { unknown: "value" } },
    { etsyOrder: null }, { etsyOrder: { receiptId: 123 } }, { etsyOrder: { transactionId: "1e6" } },
    { etsyOrder: { transactionId: " 123 " } }, { etsyOrder: { unknown: "123" } }, { etsyOrder: { quantityIndex: 0 } },
    { etsyOrder: { quantityIndex: 1.5 } }, { etsyOrder: { quantityIndex: "1" } },
  ]) {
    assert.throws(() => normalizeOrderShippingInput(incoming), OrderShippingValidationError, JSON.stringify(incoming));
  }
});
