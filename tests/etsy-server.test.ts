import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { test } from "node:test";

// End-to-end Etsy flows against an in-memory Mongo stand-in and a fake Etsy API.
const require = createRequire(import.meta.url);
process.env.NEXT_PUBLIC_MODE = "test";

type Doc = Record<string, unknown>;

const getPath = (doc: Doc, path: string): unknown =>
  path.split(".").reduce<unknown>((value, key) => (value && typeof value === "object" ? (value as Doc)[key] : undefined), doc);

function setPath(doc: Doc, path: string, value: unknown) {
  const keys = path.split(".");
  let target = doc;
  for (const key of keys.slice(0, -1)) target = (target[key] ??= {}) as Doc;
  target[keys.at(-1)!] = value;
}

function unsetPath(doc: Doc, path: string) {
  const keys = path.split(".");
  const parent = keys.slice(0, -1).reduce<Doc | undefined>((value, key) => value?.[key] as Doc | undefined, doc);
  if (parent) delete parent[keys.at(-1)!];
}

function matches(doc: Doc, filter: Doc): boolean {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === "$or") return (condition as Doc[]).some((part) => matches(doc, part));
    if (key === "$and") return (condition as Doc[]).every((part) => matches(doc, part));
    const value = getPath(doc, key);
    if (condition && typeof condition === "object" && !Array.isArray(condition)) {
      return Object.entries(condition as Doc).every(([op, operand]) => {
        if (op === "$exists") return (value !== undefined) === operand;
        if (op === "$lte") return typeof value === "number" && value <= (operand as number);
        if (op === "$lt") return typeof value === "number" && value < (operand as number);
        throw new Error(`Unsupported operator ${op}`);
      });
    }
    return value === condition;
  });
}

function fakeCollection() {
  const docs: Doc[] = [];
  const apply = (doc: Doc, update: Doc) => {
    for (const [path, value] of Object.entries((update.$set ?? {}) as Doc)) setPath(doc, path, structuredClone(value));
    for (const path of Object.keys((update.$unset ?? {}) as Doc)) unsetPath(doc, path);
  };
  const upsertSeed = (filter: Doc) => Object.fromEntries(Object.entries(filter).filter(([key]) => !key.startsWith("$")));
  return {
    docs,
    findOne: async (filter: Doc) => structuredClone(docs.find((doc) => matches(doc, filter)) ?? null),
    find: (filter: Doc) => ({ toArray: async () => structuredClone(docs.filter((doc) => matches(doc, filter))) }),
    insertOne: async (doc: Doc) => {
      docs.push(structuredClone(doc));
      return { acknowledged: true };
    },
    createIndex: async () => "index",
    updateOne: async (filter: Doc, update: Doc, options: { upsert?: boolean } = {}) => {
      let doc = docs.find((candidate) => matches(candidate, filter));
      if (!doc && options.upsert) docs.push((doc = upsertSeed(filter)));
      if (doc) apply(doc, update);
      return { matchedCount: doc ? 1 : 0 };
    },
    findOneAndUpdate: async (filter: Doc, update: Doc) => {
      const doc = docs.find((candidate) => matches(candidate, filter));
      if (!doc) return null;
      apply(doc, update);
      return structuredClone(doc);
    },
  };
}

const collections = new Map<string, ReturnType<typeof fakeCollection>>();
const collection = (name: string) => {
  if (!collections.has(name)) collections.set(name, fakeCollection());
  return collections.get(name)!;
};
const db = { collection };

const connectionPath = require.resolve("../app/api/db/connect");
const connection = new Module(connectionPath);
connection.loaded = true;
connection.exports = { __esModule: true, default: Promise.resolve({ db: () => db }), getDb: async () => db };
require.cache[connectionPath] = connection;

const server = require("../lib/etsy/connection-server") as typeof import("../lib/etsy/connection-server");
const sync = require("../lib/etsy/sync-server") as typeof import("../lib/etsy/sync-server");

type Call = { url: URL; method: string; headers: Headers; body: string };
const calls: Call[] = [];
let tokenCounter = 0;
let receipts: Doc[] = [];

globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
  const url = new URL(String(input));
  const call = { url, method: init.method ?? "GET", headers: new Headers(init.headers), body: String(init.body ?? "") };
  calls.push(call);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  if (url.pathname === "/v3/public/oauth/token") {
    tokenCounter++;
    return json({ access_token: `77.access${tokenCounter}`, refresh_token: `77.refresh${tokenCounter}`, expires_in: 3600, token_type: "Bearer" });
  }
  if (call.headers.get("x-api-key") !== "key123:secret456") return json({ error: "bad key" }, 403);
  if (url.pathname === "/v3/application/users/me") return json({ user_id: 77, shop_id: 9 });
  if (url.pathname === "/v3/application/shops/9") return json({ shop_id: 9, shop_name: "EverwoodShop" });
  if (url.pathname === "/v3/application/shops/9/receipts") return json({ count: receipts.length, results: receipts });
  if (/^\/v3\/application\/shops\/9\/receipts\/\d+\/tracking$/.test(url.pathname)) return json({ receipt_id: 1 });
  return json({ error: "not found" }, 404);
}) as typeof fetch;

const connectionDocs = () => collection("etsy-connection-test").docs;
const items = () => collection("items-test");

test("Connect stores tokens and the shop, using PKCE and the saved keys", async () => {
  await collection("etsy-connection-test").updateOne(
    { _id: "etsy" }, { $set: { keystring: "key123", sharedSecret: "secret456" } }, { upsert: true }
  );
  const authorizeUrl = new URL(await server.beginEtsyAuthorization(db as never));
  const state = authorizeUrl.searchParams.get("state")!;
  await assert.rejects(server.completeEtsyAuthorization(db as never, "code1", "wrong-state"), /expired/);

  const { shopName } = await server.completeEtsyAuthorization(db as never, "code1", state);
  assert.equal(shopName, "EverwoodShop");
  // The sign-in link works once.
  await assert.rejects(server.completeEtsyAuthorization(db as never, "code1", state), /expired/);

  const tokenCall = calls.find((call) => call.url.pathname === "/v3/public/oauth/token")!;
  const form = new URLSearchParams(tokenCall.body);
  assert.equal(form.get("grant_type"), "authorization_code");
  assert.equal(form.get("client_id"), "key123");
  assert.equal(form.get("redirect_uri"), "https://everwoodpanel.com/api/etsy/oauth/callback");
  assert.ok((form.get("code_verifier") ?? "").length >= 43);

  const saved = connectionDocs()[0]!;
  assert.equal(saved.shopId, "9");
  assert.equal(saved.pendingAuth, undefined);
  const status = server.publicEtsyStatus(saved as never, {});
  assert.equal(status.connected, true);
  assert.equal(JSON.stringify(status).includes("secret456"), false);
  assert.equal(JSON.stringify(status).includes("access"), false);
});

test("import adds each new unit once and skips receipts linked by hand", async () => {
  const importSince = connectionDocs()[0]!.importSince as number;
  receipts = [
    {
      receipt_id: 1001, status: "paid", is_paid: true, is_shipped: false, name: "ann lee", first_line: "1 A St",
      city: "Reno", state: "NV", zip: "89501", country_iso: "US",
      transactions: [{ transaction_id: 11, quantity: 2, title: "Carbon | Geometric Wood Wall Art", variations: [] }],
    },
    {
      receipt_id: 1002, status: "paid", is_paid: true, is_shipped: false, name: "bo",
      transactions: [{ transaction_id: 21, quantity: 1, title: "Carbon | Geometric Wood Wall Art" }],
    },
  ];
  await items().insertOne({ id: "manual", etsyOrder: { receiptId: "1002" } });

  const first = await sync.syncEtsyOrders(db as never);
  assert.deepEqual({ imported: first?.imported, checked: first?.receiptsChecked, error: first?.error }, { imported: 2, checked: 2, error: null });
  const receiptsCall = calls.findLast((call) => call.url.pathname.endsWith("/receipts"))!;
  assert.equal(receiptsCall.url.searchParams.get("min_created"), String(Math.floor(importSince / 1000)));
  assert.equal(receiptsCall.url.searchParams.get("was_shipped"), "false");
  assert.equal(receiptsCall.headers.get("authorization"), "Bearer 77.access1");

  const second = await sync.syncEtsyOrders(db as never);
  assert.equal(second?.imported, 0);
  assert.deepEqual(items().docs.map((doc) => doc.customerName), [undefined, "Ann Lee (1/2)", "Ann Lee (2/2)"]);
  assert.equal(collection("activities-test").docs.length, 2);
  assert.equal(connectionDocs()[0]!.syncLease, undefined);
});

test("an expiring access token is refreshed and the new refresh token saved", async () => {
  await collection("etsy-connection-test").updateOne({ _id: "etsy" }, { $set: { "tokens.accessTokenExpiresAt": Date.now() } });
  await sync.syncEtsyOrders(db as never);
  const refresh = calls.findLast((call) => call.url.pathname === "/v3/public/oauth/token")!;
  assert.equal(new URLSearchParams(refresh.body).get("grant_type"), "refresh_token");
  assert.equal(new URLSearchParams(refresh.body).get("refresh_token"), "77.refresh1");
  assert.equal((connectionDocs()[0]!.tokens as Doc).refreshToken, "77.refresh2");
  assert.equal(calls.at(-1)?.headers.get("authorization"), "Bearer 77.access2");
});

test("tracking goes to the linked receipt; other orders and switched-off pushes are skipped", async () => {
  const orderId = items().docs[1]!.id as string;
  assert.equal(await sync.pushEtsyTrackingForOrder(db as never, orderId, { trackingNumber: "794600000001" }), "done");
  const push = calls.at(-1)!;
  assert.equal(push.method, "POST");
  assert.equal(push.url.pathname, "/v3/application/shops/9/receipts/1001/tracking");
  assert.deepEqual(JSON.parse(push.body), { tracking_code: "794600000001", carrier_name: "fedex", send_bcc: false });

  await items().insertOne({ id: "shopify-order" });
  assert.equal(await sync.pushEtsyTrackingForOrder(db as never, "shopify-order", { trackingNumber: "1" }), "skipped");

  await collection("etsy-connection-test").updateOne({ _id: "etsy" }, { $set: { trackingPushEnabled: false } });
  const before = calls.length;
  assert.equal(await sync.pushEtsyTrackingForOrder(db as never, orderId, { trackingNumber: "2" }), "skipped");
  assert.equal(calls.length, before);
});
