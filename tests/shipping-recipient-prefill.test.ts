import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveShippingRecipientDraft } from "../lib/shipping-recipient-prefill";
import type { Item, ShippingDetails } from "../typings/types";
import type { FedExShipmentDraft } from "../utils/fedex-shipment-draft-storage";

const BOX_DIMENSION = 10;
const BOX_WEIGHT = 2;
const FIRST_PACKAGE_INDEX = 0;

const baseDraft: FedExShipmentDraft = {
  shipFrom: {
    name: "Workshop", line1: "1 Workshop Way", city: "Portland",
    state: "OR", postalCode: "97035", country: "US",
  },
  shipTo: {
    name: "", line1: "", city: "", state: "", postalCode: "", country: "",
  },
  packages: [{
    id: "default-box", length: BOX_DIMENSION, width: BOX_DIMENSION,
    height: BOX_DIMENSION, weight: BOX_WEIGHT,
  }],
  purchaseDefaults: {
    pickupType: "USE_SCHEDULED_PICKUP", packagingType: "YOUR_PACKAGING",
    labelStockType: "PAPER_4X6", signatureOption: "SERVICE_DEFAULT",
  },
};

const cachedDraft: FedExShipmentDraft = {
  ...baseDraft,
  shipFrom: { ...baseDraft.shipFrom, name: "Cached workshop" },
  shipTo: {
    name: "Old recipient", company: "Old company", phone: "555-0101",
    email: "old@example.test", line1: "2 Old Road", line2: "Old apartment",
    city: "Seattle", state: "WA", postalCode: "98101", country: "US",
    residential: true,
  },
  packages: [{ ...baseDraft.packages[FIRST_PACKAGE_INDEX]!, id: "cached-box" }],
  purchaseDefaults: { ...baseDraft.purchaseDefaults, signatureOption: "DIRECT" },
};

const savedDetails: ShippingDetails = {
  name: "Saved recipient", company: "Saved company", phone: "555-0102",
  buyer_email: "saved@example.test", street1: "9 New Road", street2: "Suite A",
  street3: "Building B", city: "Toronto", state: "Ontario",
  postalCode: "M5V 1A1", country: "ca", residential: false,
  addressVerified: "verified",
};

type RecipientOrder = Pick<Item, "customerName" | "shippingDetails">;

test("saved recipient replaces the stale browser recipient without resetting shipment choices", () => {
  const order: RecipientOrder = { customerName: "Order customer", shippingDetails: savedDetails };
  const draft = resolveShippingRecipientDraft(order, baseDraft, cachedDraft);

  assert.deepEqual(draft.shipTo, {
    name: "Saved recipient", company: "Saved company", phone: "555-0102",
    email: "saved@example.test", line1: "9 New Road", line2: "Suite A, Building B",
    city: "Toronto", state: "Ontario", postalCode: "M5V 1A1", country: "CA",
    residential: false,
  });
  assert.strictEqual(draft.shipFrom, cachedDraft.shipFrom);
  assert.strictEqual(draft.packages, cachedDraft.packages);
  assert.strictEqual(draft.purchaseDefaults, cachedDraft.purchaseDefaults);
  assert.equal(cachedDraft.shipTo.line1, "2 Old Road");
});

test("a partial saved address never inherits conflicting browser address fields", () => {
  const order: RecipientOrder = {
    customerName: "Order customer",
    shippingDetails: {
      ...savedDetails, name: "", company: null, phone: null, buyer_email: "",
      street1: "9 New Road", street2: "", street3: null, city: "", state: "",
      postalCode: "", country: "", residential: false,
    },
  };
  assert.deepEqual(resolveShippingRecipientDraft(order, baseDraft, cachedDraft).shipTo, {
    name: "Order customer", company: "", phone: "", email: "",
    line1: "9 New Road", line2: "", city: "", state: "", postalCode: "",
    country: "", residential: false,
  });
});

test("legacy orders retain their browser recipient, including a country-only default", () => {
  const legacyOrders: RecipientOrder[] = [
    {},
    { shippingDetails: { country: "US" } as ShippingDetails },
  ];
  for (const order of legacyOrders) {
    assert.strictEqual(resolveShippingRecipientDraft(order, baseDraft, cachedDraft), cachedDraft);
  }
});

test("orders without a browser draft start from saved details or the customer name", () => {
  assert.equal(resolveShippingRecipientDraft({ shippingDetails: savedDetails }, baseDraft, null).shipTo.line1, "9 New Road");
  assert.deepEqual(resolveShippingRecipientDraft({ customerName: "Customer" }, baseDraft, null).shipTo, {
    name: "Customer", company: "", phone: "", email: "", line1: "", line2: "",
    city: "", state: "", postalCode: "", country: "", residential: true,
  });
});

test("full province and unrecognized country values are preserved without guessing codes", () => {
  const draft = resolveShippingRecipientDraft({
    shippingDetails: { ...savedDetails, state: "British Columbia", country: "Canada" },
  }, baseDraft, null);
  assert.equal(draft.shipTo.state, "British Columbia");
  assert.equal(draft.shipTo.country, "Canada");
});

test("a third address line is retained when the second line is empty", () => {
  const draft = resolveShippingRecipientDraft({
    shippingDetails: { ...savedDetails, street2: "", street3: "Building B" },
  }, baseDraft, null);
  assert.equal(draft.shipTo.line2, "Building B");
});

test("saved name and contact corrections survive reopening without replacing the local postal address", () => {
  const draft = resolveShippingRecipientDraft({
    shippingDetails: {
      name: "Corrected recipient", company: "Corrected company",
      phone: "555-0103", buyer_email: "corrected@example.test", country: "CA",
    } as ShippingDetails,
  }, baseDraft, cachedDraft);
  assert.deepEqual(draft.shipTo, {
    ...cachedDraft.shipTo, name: "Corrected recipient", company: "Corrected company",
    phone: "555-0103", email: "corrected@example.test",
  });
  assert.strictEqual(draft.shipFrom, cachedDraft.shipFrom);
  assert.strictEqual(draft.packages, cachedDraft.packages);
  assert.strictEqual(draft.purchaseDefaults, cachedDraft.purchaseDefaults);
  assert.equal(cachedDraft.shipTo.name, "Old recipient");
});

test("explicit saved contact clears apply while absent contact fields retain the local draft", () => {
  const draft = resolveShippingRecipientDraft({
    shippingDetails: { name: "", company: null, buyer_email: "" } as ShippingDetails,
  }, baseDraft, cachedDraft);
  assert.deepEqual(draft.shipTo, {
    ...cachedDraft.shipTo, name: "", company: "", email: "",
  });
});

test("a name-only save preserves the current label address before the dialog is reopened", () => {
  const draft = resolveShippingRecipientDraft({
    shippingDetails: { name: "Corrected recipient" } as ShippingDetails,
  }, cachedDraft, cachedDraft);
  assert.deepEqual(draft.shipTo, { ...cachedDraft.shipTo, name: "Corrected recipient" });
});

test("contact-only saved details populate an empty recipient without guessing a country", () => {
  const draft = resolveShippingRecipientDraft({
    customerName: "Order customer",
    shippingDetails: { name: "", phone: "555-0103", buyer_email: "contact@example.test", country: "US" } as ShippingDetails,
  }, baseDraft, null);
  assert.deepEqual(draft.shipTo, {
    name: "", company: "", phone: "555-0103", email: "contact@example.test",
    line1: "", line2: "", city: "", state: "", postalCode: "", country: "",
    residential: true,
  });
});
