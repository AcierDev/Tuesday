import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { test } from "node:test";
import { ItemStatus, type Item } from "../typings/types";

const require = createRequire(import.meta.url);
const RESPONSE_OK = 200;
const RESPONSE_BAD_REQUEST = 400;
const RESPONSE_CONFLICT = 409;
const NO_WRITES = 0;
const ORDER_ID = "manual-order";
let writes = NO_WRITES;
let saved: Item;
let inserted: Item[] = [];
let uniqueIndex = false;
let indexFailure = false;
let present = true;
function matches(item: Item, filter: Record<string, any>): boolean {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === "$or") return condition.some((entry: Record<string, any>) => matches(item, entry));
    if (key === "$and") return condition.every((entry: Record<string, any>) => matches(item, entry));
    const value = key.split(".").reduce((record, field) => record?.[field], item as any);
    if (condition && typeof condition === "object") {
      if ("$exists" in condition) return (value !== undefined) === condition.$exists;
      if ("$nin" in condition) return !condition.$nin.includes(value);
      if ("$in" in condition) return condition.$in.includes(value);
    }
    return value === condition;
  });
}
const collection = {
  async findOne(filter: Record<string, unknown>) {
    return (inserted.length ? inserted : present ? [saved] : []).find(item => matches(item, filter)) ?? null;
  },
  find(filter: Record<string, unknown>) {
    return { sort() { return this; }, async toArray() { return (inserted.length ? inserted : present ? [saved] : []).filter(item => matches(item, filter)).map(item => structuredClone(item)); } };
  },
  async createIndex() {
    if (indexFailure) throw Object.assign(new Error("legacy duplicates"), { code: 11000 });
    uniqueIndex = true; return "etsy_order_receipt_transaction_quantity_unique";
  },
  async updateOne(_filter: unknown, update: { $set: Partial<Item> }) {
    saved = { ...saved, ...structuredClone(update.$set) };
    writes++;
    return { matchedCount: 1, modifiedCount: 1 };
  },
  async insertOne(item: Item) {
    if (uniqueIndex && item.etsyOrder?.receiptId && item.etsyOrder?.transactionId && inserted.some(existing => existing.etsyOrder?.receiptId === item.etsyOrder?.receiptId && existing.etsyOrder?.transactionId === item.etsyOrder?.transactionId && existing.etsyOrder?.quantityIndex === item.etsyOrder?.quantityIndex)) {
      throw Object.assign(new Error("duplicate key"), { code: 11000 });
    }
    saved = structuredClone(item); present = true; inserted.push(saved); writes++; return { acknowledged: true };
  },
};
const client = {
  db: () => ({ collection: (name: string) => name.startsWith("items-") ? collection : {
    async insertOne() { return { acknowledged: true }; },
  } }),
  startSession: () => ({ async withTransaction(callback: () => Promise<unknown>) { return callback(); }, async endSession() {} }),
};
// MongoDB is the only external dependency; the route and its normalizers run unchanged.
const connectionPath = require.resolve("../app/api/db/connect");
const connection = new Module(connectionPath);
connection.loaded = true;
connection.exports = { __esModule: true, default: Promise.resolve(client) };
require.cache[connectionPath] = connection;
const { PATCH, POST, GET } = require("../app/api/items/route") as {
  GET: (request: Request) => Promise<Response>;
  PATCH: (request: Request) => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
};

function reset() {
  writes = NO_WRITES;
  inserted = [];
  uniqueIndex = false;
  indexFailure = false;
  present = true;
  saved = {
    _id: "document-id", id: ORDER_ID, status: ItemStatus.New, customerName: "Board customer",
    createdAt: 1, index: 1, visible: true, deleted: false,
    shippingDetails: {
      name: "Recipient", company: null, street1: "123 Saved St", street2: "Suite 5", street3: null,
      city: "Saved City", state: "CA", postalCode: "90210", country: "US", phone: "5551234567",
      residential: true, addressVerified: "Address validated successfully", buyer_email: "saved@example.test",
    },
    etsyOrder: { receiptId: "123", transactionId: "456", quantityIndex: 1 },
  } as Item;
}
function request(method: string, body: unknown) {
  return new Request("https://example.test/api/items", {
    method, headers: { "Content-Type": "application/json", origin: "https://www.etsy.com" }, body: JSON.stringify(body),
  });
}

test("PATCH persists partial shipping fields without losing saved metadata and returns the merged result", async () => {
  reset();
  const response = await PATCH(request("PATCH", {
    id: ORDER_ID, updates: { shippingDetails: { street2: "", country: "us" }, etsyOrder: { receiptId: "789" } },
  }));
  assert.equal(response.status, RESPONSE_OK);
  const body = await response.json();
  assert.equal(saved.shippingDetails?.street1, "123 Saved St");
  assert.equal(saved.shippingDetails?.buyer_email, "saved@example.test");
  assert.equal(saved.shippingDetails?.street2, "");
  assert.equal(saved.shippingDetails?.country, "US");
  assert.equal(saved.shippingDetails?.addressVerified, "");
  assert.equal(saved.customerName, "Board customer");
  assert.deepEqual(body.etsyOrder, { receiptId: "789", transactionId: "456", quantityIndex: 1 });
  assert.deepEqual(body.shippingDetails, saved.shippingDetails);
  assert.equal(body.matchedCount, 1);
  const reloaded = await GET(new Request("https://example.test/api/items?ids=" + ORDER_ID));
  assert.equal(reloaded.status, RESPONSE_OK);
  const reloadedItem = (await reloaded.json())[0];
  assert.deepEqual(reloadedItem.shippingDetails, body.shippingDetails);
  assert.deepEqual(reloadedItem.etsyOrder, body.etsyOrder);
});

test("PATCH rejects invalid shipping metadata before writing", async () => {
  for (const updates of [
    { shippingDetails: null }, { shippingDetails: [] }, { shippingDetails: { name: 123 } },
    { shippingDetails: { country: "USA" } }, { shippingDetails: { residential: "true" } },
    { etsyOrder: { receiptId: 123 } }, { etsyOrder: { transactionId: "wrong" } },
    { shippingDetails: { "street1.bad": "injected" } },
    { "shippingDetails.postalCode": 90210 }, { "etsyOrder.receiptId": 123 },
  ]) {
    reset();
    const response = await PATCH(request("PATCH", { id: ORDER_ID, updates }));
    assert.equal(response.status, RESPONSE_BAD_REQUEST, JSON.stringify(updates));
    assert.equal(writes, NO_WRITES);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://www.etsy.com");
  }
});

test("POST rejects invalid shipping metadata before inserting", async () => {
  for (const metadata of [
    { shippingDetails: { postalCode: 90210 } }, { etsyOrder: { transactionId: "9e9" } },
  ]) {
    reset();
    const response = await POST(request("POST", { ...saved, ...metadata }));
    assert.equal(response.status, RESPONSE_BAD_REQUEST);
    assert.equal(writes, NO_WRITES);
  }
});


test("fillMissing imports preserve concurrent manual shipping values and saved Etsy IDs", async () => {
  reset();
  saved.shippingDetails!.street2 = "";
  const response = await PATCH(request("PATCH", {
    id: ORDER_ID, shippingUpdateMode: "fillMissing", updates: {
      shippingDetails: { name: "Imported name", street1: "Imported street", street2: "Imported suite", residential: false },
      etsyOrder: { receiptId: "999" },
    },
  }));
  assert.equal(response.status, RESPONSE_OK);
  assert.equal(saved.shippingDetails?.name, "Recipient");
  assert.equal(saved.shippingDetails?.street1, "123 Saved St");
  assert.equal(saved.shippingDetails?.street2, "Imported suite");
  assert.equal(saved.shippingDetails?.residential, true);
  assert.deepEqual(saved.etsyOrder, { receiptId: "123", transactionId: "456", quantityIndex: 1 });
});

test("POST atomically rejects the same Etsy transaction while allowing another item from the same receipt", async () => {
  reset();
  const first = { ...saved, id: "first-item" };
  present = false;
  const repeated = { ...first, id: "retry-item" };
  const other = { ...first, id: "second-item", etsyOrder: { receiptId: "123", transactionId: "789" } };
  assert.equal((await POST(request("POST", first))).status, RESPONSE_OK);
  const conflict = await POST(request("POST", repeated));
  assert.equal(conflict.status, RESPONSE_CONFLICT);
  assert.equal((await conflict.json()).id, "first-item");
  assert.equal((await POST(request("POST", other))).status, RESPONSE_OK);
  assert.equal(inserted.length, 2);
});


test("separate quantity units use separate duplicate identities and exact lookups", async () => {
  reset();
  const first = { ...saved, id: "quantity-one" };
  present = false;
  assert.equal((await POST(request("POST", first))).status, RESPONSE_OK);
  const second = { ...first, id: "quantity-two", etsyOrder: { ...first.etsyOrder, quantityIndex: 2 } };
  assert.equal((await POST(request("POST", second))).status, RESPONSE_OK);
  const lookup = await GET(new Request("https://example.test/api/items?etsyReceiptId=123&etsyTransactionId=456&etsyQuantityIndex=2&includeDone=true&includeHidden=true"));
  assert.equal(lookup.status, RESPONSE_OK);
  assert.deepEqual((await lookup.json()).map((item: Item) => item.id), ["quantity-two"]);
  const defaultLookup = await GET(new Request("https://example.test/api/items?etsyReceiptId=123&etsyTransactionId=456"));
  assert.deepEqual((await defaultLookup.json()).map((item: Item) => item.id), ["quantity-one"]);
});

test("legacy missing quantity means unit one and blocks duplicate POST without blocking unit two", async () => {
  reset();
  saved.etsyOrder = { receiptId: "123", transactionId: "456" };
  saved.id = "legacy-item";
  inserted = [saved];
  const lookup = await GET(new Request("https://example.test/api/items?etsyReceiptId=123&etsyTransactionId=456"));
  assert.deepEqual((await lookup.json()).map((item: Item) => item.id), ["legacy-item"]);
  const repeated = { ...saved, id: "retry-item" };
  const conflict = await POST(request("POST", repeated));
  assert.equal(conflict.status, RESPONSE_CONFLICT);
  assert.equal((await conflict.json()).id, "legacy-item");
  assert.equal(writes, NO_WRITES);
  assert.equal((await POST(request("POST", { ...repeated, etsyOrder: { ...saved.etsyOrder, quantityIndex: 2 } }))).status, RESPONSE_OK);
});

test("Etsy exact lookup validates IDs and quantity without accepting partial identity", async () => {
  for (const query of ["etsyReceiptId=123", "etsyReceiptId=wrong&etsyTransactionId=456", "etsyReceiptId=123&etsyTransactionId=456&etsyQuantityIndex=0", "etsyReceiptId=123&etsyTransactionId=456&etsyQuantityIndex=1.5"]) {
    reset();
    assert.equal((await GET(new Request("https://example.test/api/items?" + query))).status, RESPONSE_BAD_REQUEST);
    assert.equal(writes, NO_WRITES);
  }
});

test("POST reports legacy duplicate index conflicts without inserting", async () => {
  reset();
  saved.etsyOrder = { receiptId: "987", transactionId: "654", quantityIndex: 1 };
  indexFailure = true;
  const response = await POST(request("POST", { ...saved, id: "new-record", etsyOrder: { receiptId: "123", transactionId: "456", quantityIndex: 1 } }));
  assert.equal(response.status, RESPONSE_CONFLICT);
  assert.match((await response.json()).error, /duplicate protection/);
  assert.equal(writes, NO_WRITES);
});


test("concurrent POST retries create a single quantity record", async () => {
  reset();
  const item = { ...saved, etsyOrder: { receiptId: "123", transactionId: "456" } };
  present = false;
  const responses = await Promise.all([
    POST(request("POST", { ...item, id: "race-one" })),
    POST(request("POST", { ...item, id: "race-two" })),
  ]);
  assert.deepEqual(responses.map(response => response.status).sort(), [RESPONSE_OK, RESPONSE_CONFLICT]);
  assert.equal(inserted.length, 1);
  const persisted = inserted[0]!;
  assert.equal(persisted.etsyOrder?.quantityIndex, 1);
  const conflict = responses.find(response => response.status === RESPONSE_CONFLICT)!;
  assert.equal((await conflict.json()).id, persisted.id);
});
