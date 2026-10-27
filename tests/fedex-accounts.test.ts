import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  cancelFedExShipment,
  extractShipmentCharge,
  fetchFedExRatesForAccounts,
  getFedExAccount,
  listFedExAccounts,
  purchaseFedExShipment,
  resetFedExAuthCache,
  validateFedExAddress,
} from "../lib/fedex-api";
import { extraBoxPresetsForSize } from "../config/shipping-defaults";
import { cheapestRate, groupRatesByService, rateKey } from "../lib/shipping-labels/rate-groups";
import { parseFedExShipmentRequest } from "../lib/shipping-labels/purchase-request";
import type { FedExRateQuote, ShippingAddressInput } from "../typings/types";

// FedEx's HTTP API is replaced by a fake that records every request.
const ENV_NAMES = [
  "FEDEX_API_KEY", "FEDEX_SECRET_KEY", "FEDEX_CLIENT_ID", "FEDEX_CLIENT_SECRET", "FEDEX_ACCOUNT_583",
  "FEDEX_ACCOUNT_125", "FEDEX_ACCOUNT_NUMBER", "FEDEX_BASE_URL", "FEDEX_USE_SANDBOX", "SHIP_FROM_PHONE",
];
const saved: Record<string, string | undefined> = {};
const originalFetch = globalThis.fetch;

type Call = { path: string; method: string; body: any };
let calls: Call[] = [];
let handler: (call: Call) => { status?: number; json: unknown };

const shipFrom: ShippingAddressInput = {
  name: "Akiva Weil", company: "Everwood", phone: "9172005099", line1: "1404 Blaine Ranch St",
  city: "Henderson", state: "NV", postalCode: "89012", country: "US",
};
const shipTo: ShippingAddressInput = {
  name: "Jane Buyer", line1: "10 Main St", line2: "Apt 4", city: "Austin", state: "TX",
  postalCode: "78701", country: "US", residential: true,
};
const packages = [{ id: "a", length: 56, width: 21, height: 4, weight: 21 }];
const purchaseDefaults = {
  pickupType: "DROPOFF_AT_FEDEX_LOCATION", packagingType: "YOUR_PACKAGING",
  labelStockType: "PAPER_4X6", signatureOption: "NO_SIGNATURE_REQUIRED",
};
const request = { shipFrom, shipTo, packages, purchaseDefaults };

const rateDetail = (serviceType: string, amount: number) => ({
  serviceType,
  ratedShipmentDetails: [{ shipmentRateDetail: { rateType: "ACCOUNT", totalNetCharge: amount, currency: "USD" } }],
});

beforeEach(() => {
  for (const name of ENV_NAMES) { saved[name] = process.env[name]; delete process.env[name]; }
  process.env.FEDEX_API_KEY = "key";
  process.env.FEDEX_SECRET_KEY = "secret";
  process.env.FEDEX_ACCOUNT_583 = "111111583";
  process.env.FEDEX_ACCOUNT_125 = "222222125";
  process.env.FEDEX_USE_SANDBOX = "true";
  resetFedExAuthCache();
  calls = [];
  handler = () => ({ json: {} });
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const body = init.body ? (url.pathname === "/oauth/token" ? Object.fromEntries(new URLSearchParams(String(init.body))) : JSON.parse(String(init.body))) : null;
    const call = { path: url.pathname, method: init.method ?? "GET", body, host: url.host } as Call & { host: string };
    calls.push(call);
    if (url.pathname === "/oauth/token") return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }));
    const { status = 200, json } = handler(call);
    return new Response(JSON.stringify(json), { status });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const name of ENV_NAMES) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
});

test("accounts come from the new variables, with the old single account as fallback", () => {
  assert.deepEqual(listFedExAccounts().map((account) => account.id), ["583", "125"]);
  assert.equal(getFedExAccount("125").accountNumber, "222222125");
  assert.throws(() => getFedExAccount("999"), /not set up/);

  delete process.env.FEDEX_ACCOUNT_583;
  delete process.env.FEDEX_ACCOUNT_125;
  assert.throws(() => getFedExAccount(), /FEDEX_ACCOUNT_583/);
  process.env.FEDEX_ACCOUNT_NUMBER = "333333333";
  assert.deepEqual(listFedExAccounts(), [{ id: "default", label: "FedEx account", accountNumber: "333333333" }]);
  assert.equal(getFedExAccount().accountNumber, "333333333");
});

test("rates are requested on both accounts, tagged, and sorted cheapest first", async () => {
  handler = (call) => ({
    json: { output: { rateReplyDetails: [
      rateDetail("GROUND_HOME_DELIVERY", call.body.accountNumber.value === "111111583" ? 80.1 : 74.25),
      rateDetail("FEDEX_2_DAY", 120),
    ] } },
  });
  const result = await fetchFedExRatesForAccounts(request);
  const rateCalls = calls.filter((call) => call.path === "/rate/v1/rates/quotes");
  assert.deepEqual(rateCalls.map((call) => call.body.accountNumber.value).sort(), ["111111583", "222222125"]);
  assert.equal(calls.filter((call) => call.path === "/oauth/token").length, 1, "one token serves both accounts");
  assert.deepEqual(
    result.quotes.slice(0, 2).map((quote) => [quote.accountId, quote.totalNetCharge]),
    [["125", 74.25], ["583", 80.1]]
  );
  assert.equal(result.quotes[0]?.accountLabel, "ben@everwood.com-125");
  assert.deepEqual(result.accountErrors, []);
  assert.equal(rateCalls[0]?.body.requestedShipment.recipient.address.residential, true);
});

test("one failing account does not hide the other's quotes; all failing reports the errors", async () => {
  handler = (call) => call.body.accountNumber.value === "111111583"
    ? { json: { output: { rateReplyDetails: [rateDetail("FEDEX_GROUND", 50)] } } }
    : { status: 403, json: { errors: [{ code: "FORBIDDEN.ERROR", message: "Account not linked" }] } };
  const partial = await fetchFedExRatesForAccounts(request);
  assert.deepEqual(partial.quotes.map((quote) => quote.accountId), ["583"]);
  assert.equal(partial.accountErrors.length, 1);
  assert.equal(partial.accountErrors[0]?.accountId, "125");
  assert.match(partial.accountErrors[0]?.error ?? "", /Account not linked/);
  assert.equal(partial.accountErrors[0]?.unavailable, true, "a not-linked account is flagged so the dialog can skip it");

  // The real production reply for an account the key is not linked to.
  handler = (call) => call.body.accountNumber.value === "111111583"
    ? { json: { output: { rateReplyDetails: [rateDetail("FEDEX_GROUND", 50)] } } }
    : { status: 400, json: { errors: [{ code: "ACCOUNT.NUMBER.MISMATCH", message: "Account Number Mismatch" }] } };
  assert.equal((await fetchFedExRatesForAccounts(request)).accountErrors[0]?.unavailable, true);

  // Other failures stay visible.
  handler = (call) => call.body.accountNumber.value === "111111583"
    ? { json: { output: { rateReplyDetails: [rateDetail("FEDEX_GROUND", 50)] } } }
    : { status: 500, json: { errors: [{ code: "SYSTEM.UNAVAILABLE", message: "down" }] } };
  assert.equal((await fetchFedExRatesForAccounts(request)).accountErrors[0]?.unavailable, false);

  handler = () => ({ status: 500, json: { errors: [{ code: "SYSTEM", message: "down" }] } });
  await assert.rejects(fetchFedExRatesForAccounts(request), /My Account-583.*\|.*ben@everwood\.com-125/s);
});

test("buying uses the chosen account and reports it; cancelling uses the same account", async () => {
  const labelBase64 = Buffer.from("%PDF-label").toString("base64");
  handler = () => ({
    json: { output: { transactionShipments: [{
      masterTrackingNumber: "794600000001",
      pieceResponses: [{ trackingNumber: "794600000001", packageDocuments: [{ encodedLabel: labelBase64 }] }],
      shipmentRating: { shipmentRateDetails: [{ rateType: "ACCOUNT", totalNetCharge: 74.25, currency: "USD" }] },
    }] } },
  });
  const result = await purchaseFedExShipment({ ...request, serviceType: "GROUND_HOME_DELIVERY", accountId: "125" });
  const ship = calls.find((call) => call.path === "/ship/v1/shipments")!;
  assert.equal(ship.body.accountNumber.value, "222222125");
  assert.equal(result.accountId, "125");
  assert.equal(result.accountLabel, "ben@everwood.com-125");
  assert.equal(result.trackingNumber, "794600000001");
  assert.equal(result.totalNetCharge, 74.25);
  assert.deepEqual(
    { imageType: ship.body.requestedShipment.labelSpecification.imageType, stock: ship.body.requestedShipment.labelSpecification.labelStockType },
    { imageType: "PDF", stock: "PAPER_4X6" }
  );
  assert.equal(ship.body.requestedShipment.shipper.address.streetLines[0], "1404 Blaine Ranch St");
  assert.equal("emailNotificationDetail" in ship.body.requestedShipment, false, "no FedEx email notifications");

  handler = () => ({ json: { output: { cancelledShipment: true, message: "ok" } } });
  await cancelFedExShipment("794600000001", "US", "125");
  const cancel = calls.find((call) => call.path === "/ship/v1/shipments/cancel")!;
  assert.equal(cancel.body.accountNumber.value, "222222125");
});

test("the charge is read from the real reply shape (completedShipmentDetail.shipmentRating)", () => {
  // Structure captured from the FedEx sandbox ship reply.
  const reply = { output: { transactionShipments: [{ completedShipmentDetail: { shipmentRating: {
    actualRateType: "PAYOR_ACCOUNT_PACKAGE",
    shipmentRateDetails: [{ rateType: "PAYOR_ACCOUNT_PACKAGE", totalNetFedExCharge: 115.71, totalNetCharge: 115.71 }],
  } } }] } };
  assert.deepEqual(extractShipmentCharge(reply), { totalNetCharge: 115.71, currency: "USD" });
  assert.deepEqual(extractShipmentCharge({ output: { transactionShipments: [{}] } }), { totalNetCharge: null, currency: "USD" });
});

test("an unknown account is refused before FedEx is called", async () => {
  await assert.rejects(purchaseFedExShipment({ ...request, serviceType: "FEDEX_GROUND", accountId: "999" }), /not set up/);
  assert.equal(calls.some((call) => call.path === "/ship/v1/shipments"), false);
});

test("recipients without a phone get the default contact number; the shipper keeps its own", async () => {
  process.env.SHIP_FROM_PHONE = "7025550100";
  handler = () => ({ json: { output: { rateReplyDetails: [rateDetail("FEDEX_GROUND", 50)] } } });
  await fetchFedExRatesForAccounts({ ...request, shipFrom: { ...shipFrom, phone: "" } });
  const rate = calls.find((call) => call.path === "/rate/v1/rates/quotes")!;
  assert.equal(rate.body.requestedShipment.recipient.contact.phoneNumber, "9293277420");
  assert.equal(rate.body.requestedShipment.shipper.contact.phoneNumber, "7025550100");

  calls = [];
  await fetchFedExRatesForAccounts({ ...request, shipTo: { ...shipTo, phone: "5125550123" } });
  assert.equal(
    calls.find((call) => call.path === "/rate/v1/rates/quotes")!.body.requestedShipment.recipient.contact.phoneNumber,
    "5125550123"
  );
});

test("address validation reports home or business, and never guesses on mixed or unknown", async () => {
  const reply = (classification: string, extra: Record<string, unknown> = {}) => ({
    json: { output: { resolvedAddresses: [{
      classification, streetLinesToken: ["10 MAIN ST", "APT 4"], city: "AUSTIN", stateOrProvinceCode: "TX",
      postalCode: "78701-1234", countryCode: "US", attributes: { Resolved: "true" }, ...extra,
    }] } },
  });

  handler = () => reply("RESIDENTIAL");
  const home = await validateFedExAddress(shipTo);
  assert.deepEqual([home.classification, home.residential], ["RESIDENTIAL", true]);
  assert.deepEqual(home.resolved, { line1: "10 MAIN ST", line2: "APT 4", city: "AUSTIN", state: "TX", postalCode: "78701-1234" });
  const sent = calls.find((call) => call.path === "/address/v1/addresses/resolve")!;
  assert.deepEqual(sent.body.addressesToValidate[0].address.streetLines, ["10 Main St", "Apt 4"]);

  // The real reply gives the standardized city and ZIP+4 as tokens.
  handler = () => reply("RESIDENTIAL", {
    city: undefined, postalCode: undefined,
    cityToken: [{ changed: false, value: "IRVING" }], postalCodeToken: { changed: true, value: "75063-8365" },
  });
  const tokens = await validateFedExAddress(shipTo);
  assert.equal(tokens.resolved?.city, "IRVING");
  assert.equal(tokens.resolved?.postalCode, "75063-8365");

  handler = () => reply("BUSINESS");
  assert.equal((await validateFedExAddress(shipTo)).residential, false);
  handler = () => reply("MIXED");
  assert.equal((await validateFedExAddress(shipTo)).residential, null);
  handler = () => reply("SOMETHING_NEW", { attributes: { Resolved: "false", SuiteRequiredButMissing: "true" }, customerMessages: [{ message: "Check the unit" }] });
  const odd = await validateFedExAddress(shipTo);
  assert.deepEqual([odd.classification, odd.residential], ["UNKNOWN", null]);
  assert.deepEqual(odd.warnings, ["Check the unit", "FedEx could not confirm this address.", "FedEx says a suite or apartment number is missing."]);
  handler = () => ({ json: { output: { resolvedAddresses: [] } } });
  assert.deepEqual(await validateFedExAddress(shipTo), { classification: "UNKNOWN", residential: null, resolved: null, warnings: [] });
});

test("the purchase request carries a valid account id and rejects odd ones", () => {
  const body = { ...request, orderId: "order-1", serviceType: "FEDEX_GROUND", quotedNetCharge: 50 };
  const ok = parseFedExShipmentRequest({ ...body, accountId: "583" });
  assert.ok(ok.ok && ok.value.accountId === "583");
  assert.ok(parseFedExShipmentRequest(body).ok);
  assert.equal(parseFedExShipmentRequest({ ...body, accountId: "../x" }).ok, false);
  assert.equal(parseFedExShipmentRequest({ ...body, accountId: 5 }).ok, false);
});

test("the same service on two accounts is shown once, with the cheaper price first", () => {
  const quote = (accountId: string, serviceType: string, totalNetCharge: number): FedExRateQuote =>
    ({ accountId, accountLabel: accountId, serviceType, serviceName: serviceType, totalNetCharge, currency: "USD" });
  const rates = [quote("583", "GROUND", 80), quote("125", "GROUND", 74), quote("583", "2DAY", 120), quote("125", "2DAY", 130)];
  const groups = groupRatesByService(rates);
  assert.deepEqual(groups.map((group) => group.serviceType), ["GROUND", "2DAY"]);
  assert.deepEqual(groups[0]?.quotes.map((entry) => entry.accountId), ["125", "583"]);
  assert.equal(cheapestRate(rates)?.accountId, "125");
  assert.equal(rateKey(rates[0]!), "583:GROUND");
  assert.equal(rateKey({ serviceType: "GROUND" }), "GROUND");
});

test("the SOP's 32 x 12 box (2 x 41x27x6 at 42 lb) is found for size text variants", () => {
  for (const size of ["32 x 12", "32×12", "32x12", '32" x 12"']) {
    const presets = extraBoxPresetsForSize(size);
    assert.deepEqual(presets?.map((box) => [box.length, box.width, box.height, box.weight]), [[41, 27, 6, 42], [41, 27, 6, 42]], size);
  }
  assert.equal(extraBoxPresetsForSize("Contact Akiva"), null);
  assert.equal(extraBoxPresetsForSize(undefined), null);
});
