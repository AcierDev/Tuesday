import assert from "node:assert/strict";
import { test } from "node:test";

import { buildAuthorizeUrl, parseTokenResponse, pkceChallenge, userIdFromAccessToken } from "../lib/etsy/oauth";
import {
  capitalizeCustomerName,
  etsyTrackingBody,
  isImportableReceipt,
  parseEtsyDesign,
  parseEtsySize,
  receiptToOrders,
  shipByDate,
  type EtsyReceipt,
} from "../lib/etsy/receipt-mapping";
import { hasPendingFollowUps } from "../lib/shipping-labels/purchase-records";

test("PKCE challenge matches the RFC 7636 example", () => {
  assert.equal(pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
});

test("authorize URL carries the PKCE challenge, state and scopes", () => {
  const url = new URL(buildAuthorizeUrl({ keystring: "key123", redirectUri: "https://x.test/cb", state: "s1", codeChallenge: "c1" }));
  assert.equal(url.origin + url.pathname, "https://www.etsy.com/oauth/connect");
  assert.equal(url.searchParams.get("client_id"), "key123");
  assert.equal(url.searchParams.get("redirect_uri"), "https://x.test/cb");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("scope"), "shops_r transactions_r transactions_w");
});

test("token responses become absolute expiry times", () => {
  const tokens = parseTokenResponse({ access_token: "123.abc", refresh_token: "123.def", expires_in: 3600 }, 1000);
  assert.equal(tokens.accessTokenExpiresAt, 1000 + 3_600_000);
  assert.equal(userIdFromAccessToken(tokens.accessToken), "123");
  assert.throws(() => parseTokenResponse({ access_token: "x" }, 0));
});

test("designs parse from both Etsy title styles", () => {
  assert.equal(parseEtsyDesign("Carbon | Geometric Striped Wood Wall Art | 3D Modern Decor"), "Striped Carbon");
  assert.equal(parseEtsyDesign("Geometric Wood Wall Art - Sapphire Horizon"), "Sapphire");
  assert.equal(parseEtsyDesign("Coastal Gradient | Geometric Wood Art"), "Coastal Gradient");
  assert.equal(parseEtsyDesign("Gift card"), "");
});

test("sizes map Etsy options to board sizes", () => {
  assert.equal(parseEtsySize('30" x 6 feet'), "24 x 10");
  assert.equal(parseEtsySize("36&quot; x 5 feet"), "20 x 12");
  assert.equal(parseEtsySize('18" x 3 feet'), "14 x 7");
  assert.equal(parseEtsySize('24" x 36"'), '24" x 36"');
  assert.equal(parseEtsySize("Large"), "Contact Akiva");
});

test("names, ship-by dates and tracking payloads", () => {
  assert.equal(capitalizeCustomerName("jane doe (gift)"), "Jane Doe (gift)");
  // 2026-10-30 06:00 UTC is still Oct 29 in Los Angeles.
  assert.equal(shipByDate(Date.UTC(2026, 9, 30, 6) / 1000), "2026-10-29");
  assert.equal(shipByDate(null), "");
  assert.deepEqual(etsyTrackingBody("7946"), { tracking_code: "7946", carrier_name: "fedex", send_bcc: false });
});

const receipt: EtsyReceipt = {
  receipt_id: 3001,
  status: "paid",
  is_paid: true,
  is_shipped: false,
  name: "jane doe",
  first_line: "10 Main St",
  second_line: "",
  city: "Austin",
  state: "TX",
  zip: "78701",
  country_iso: "us",
  message_from_buyer: "Please hang &amp; love",
  transactions: [
    {
      transaction_id: 501, quantity: 2, title: "Coastal Gradient | Geometric Wood Wall Art",
      expected_ship_date: Date.UTC(2026, 10, 5, 12) / 1000,
      variations: [{ formatted_name: "Size", formatted_value: '30" x 4 feet' }, { formatted_name: "Orientation", formatted_value: "Vertical" }],
    },
    { transaction_id: 502, quantity: 1, title: "Carbon | Geometric Wood Wall Art", variations: [] },
    { transaction_id: 503, quantity: 1, title: "Digital guide", is_digital: true },
  ],
};

test("a receipt becomes one linked order per physical unit", () => {
  let next = 0;
  const orders = receiptToOrders(receipt, 42, () => `id-${++next}`);
  assert.equal(orders.length, 3);
  assert.deepEqual(orders.map((order) => order.customerName), ["[SH] Jane Doe (1/3)", "[SH] Jane Doe (2/3)", "Jane Doe (3/3)"]);
  assert.deepEqual(orders.map((order) => order.etsyOrder), [
    { receiptId: "3001", transactionId: "501", quantityIndex: 1 },
    { receiptId: "3001", transactionId: "501", quantityIndex: 2 },
    { receiptId: "3001", transactionId: "502", quantityIndex: 1 },
  ]);
  const [first, , last] = orders;
  assert.equal(first?.size, "16 x 10");
  assert.equal(first?.design, "Coastal Gradient");
  assert.equal(first?.dueDate, "2026-11-05");
  assert.equal(first?.tags?.isVertical, true);
  assert.equal(first?.tags?.hasCustomerMessage, true);
  assert.equal(first?.notes, "Etsy note: Please hang & love");
  assert.deepEqual(first?.shippingDetails, {
    name: "jane doe", street1: "10 Main St", city: "Austin", state: "TX", postalCode: "78701", country: "US",
  });
  assert.equal(last?.size, "");
  assert.equal(last?.tags?.isVertical, false);
  assert.equal(first?.createdAt, 42);
});

test("only paid, unshipped, live receipts import", () => {
  assert.equal(isImportableReceipt(receipt), true);
  assert.equal(isImportableReceipt({ ...receipt, is_shipped: true }), false);
  assert.equal(isImportableReceipt({ ...receipt, status: "canceled" }), false);
  assert.equal(isImportableReceipt({ ...receipt, status: "fully refunded" }), false);
});

test("a failed Etsy tracking upload offers Retry", () => {
  assert.equal(hasPendingFollowUps({ labelStatus: "done", trackerStatus: "done", etsyStatus: "failed" }), true);
  assert.equal(hasPendingFollowUps({ labelStatus: "done", trackerStatus: "done", etsyStatus: "skipped" }), false);
});

test("the Etsy import loop follows the production gating and its own opt-out", async () => {
  const { shouldStartEtsySync } = await import("../lib/etsy/sync-gate");
  const production = { NODE_ENV: "production", NEXT_RUNTIME: "nodejs" };
  assert.equal(shouldStartEtsySync(production), true);
  assert.equal(shouldStartEtsySync({ ...production, ETSY_SYNC_ENABLED: "false" }), false);
  assert.equal(shouldStartEtsySync({ ...production, NODE_ENV: "development" }), false);
});
