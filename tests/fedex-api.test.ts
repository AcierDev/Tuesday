import assert from "node:assert/strict";
import { afterEach, before, test } from "node:test";
import { PDFDocument } from "pdf-lib";

import type {
  ShippingAddressInput,
  ShippingBoxPreset,
  ShippingPurchaseDefaults,
} from "../typings/types";

// Never reach FedEx: fake credentials, a fake host, and a fetch mock that
// rejects anything it doesn't recognise.
const FAKE_BASE_URL = "https://fedex.invalid.test";
process.env.FEDEX_CLIENT_ID = "test-client";
process.env.FEDEX_CLIENT_SECRET = "test-secret";
process.env.FEDEX_ACCOUNT_NUMBER = "000000000";
process.env.FEDEX_BASE_URL = FAKE_BASE_URL;
delete process.env.FEDEX_CHILD_KEY;
delete process.env.FEDEX_CHILD_SECRET;

type FedExApi = typeof import("../lib/fedex-api");
let api: FedExApi;

type Call = { url: string; method: string; body: any; signal: unknown };
let calls: Call[] = [];
let handler: (call: Call) => Response | Promise<Response>;
const originalFetch = globalThis.fetch;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function tokenResponse(token = "token-1"): Response {
  return json({ access_token: token, expires_in: 3600 });
}

const shipFrom: ShippingAddressInput = {
  name: "Everwood",
  company: "Everwood",
  phone: "7025550100",
  line1: "1 Origin St",
  city: "Henderson",
  state: "NV",
  postalCode: "89074",
  country: "US",
  residential: false,
};

const shipTo: ShippingAddressInput & { line3?: string } = {
  name: "Buyer",
  line1: "10 Main St",
  line2: "Apt 2",
  line3: "Building C",
  city: "Austin",
  state: "TX",
  postalCode: "78701",
  country: "US",
};

const packages: ShippingBoxPreset[] = [
  { id: "a", length: 41, width: 25, height: 6, weight: 31 },
  { id: "b", length: 41, width: 25, height: 6, weight: 31 },
];

const signatureDefaults: ShippingPurchaseDefaults = {
  pickupType: "DROPOFF_AT_FEDEX_LOCATION",
  packagingType: "YOUR_PACKAGING",
  labelStockType: "PAPER_4X6",
  signatureOption: "DIRECT",
};

async function onePagePdfBase64(): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  return Buffer.from(await pdf.save()).toString("base64");
}

before(async () => {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const call: Call = {
      url,
      method: init?.method ?? "GET",
      body:
        typeof init?.body === "string" && init.body.startsWith("{")
          ? JSON.parse(init.body)
          : init?.body,
      signal: init?.signal,
    };
    if (!url.startsWith(FAKE_BASE_URL)) {
      throw new Error(`Unexpected network request: ${url}`);
    }
    calls.push(call);
    return handler(call);
  }) as typeof fetch;
  api = await import("../lib/fedex-api");
});

afterEach(() => {
  calls = [];
  api.resetFedExAuthCache();
  delete process.env.SHIP_FROM_PHONE;
});

test.after(() => {
  globalThis.fetch = originalFetch;
});

function shipmentPayload(labels: string[], charge?: number) {
  return {
    output: {
      transactionShipments: [
        {
          masterTrackingNumber: "794600000001",
          pieceResponses: labels.map((label, index) => ({
            trackingNumber: `79460000000${index + 1}`,
            packageDocuments: [{ encodedLabel: label }],
          })),
          shipmentRating:
            charge === undefined
              ? undefined
              : {
                  shipmentRateDetails: [
                    { rateType: "PAYOR_ACCOUNT_SHIPMENT", totalNetCharge: charge },
                  ],
                },
        },
      ],
    },
  };
}

test("rate quotes and purchases send identical special services", async () => {
  handler = async (call) => {
    if (call.url.endsWith("/oauth/token")) return tokenResponse();
    if (call.url.endsWith("/rate/v1/rates/quotes")) {
      return json({ output: { rateReplyDetails: [] } });
    }
    return json(shipmentPayload([await onePagePdfBase64()], 20));
  };

  await api.fetchFedExRates({ shipFrom, shipTo, packages, purchaseDefaults: signatureDefaults });
  await api.purchaseFedExShipment({
    shipFrom,
    shipTo: { ...shipTo, phone: "5125550100" },
    packages,
    purchaseDefaults: signatureDefaults,
    serviceType: "FEDEX_GROUND",
  });

  const rateBody = calls.find((call) => call.url.endsWith("/rates/quotes"))?.body;
  const shipBody = calls.find((call) => call.url.endsWith("/ship/v1/shipments"))?.body;
  const ratePackages = rateBody.requestedShipment.requestedPackageLineItems;
  const shipPackages = shipBody.requestedShipment.requestedPackageLineItems;
  assert.deepEqual(ratePackages, shipPackages);
  assert.deepEqual(ratePackages[0].packageSpecialServices, {
    specialServiceTypes: ["SIGNATURE_OPTION"],
    signatureOptionType: "DIRECT",
  });
  assert.equal("specialServicesRequested" in shipBody.requestedShipment, false);
});

test("no signature option sends no special services", () => {
  assert.deepEqual(
    api.buildPackageSpecialServices({ ...signatureDefaults, signatureOption: "NO_SIGNATURE_REQUIRED" }),
    {}
  );
});

test("a quote without a parseable charge is reported, never priced at $0", async () => {
  handler = (call) =>
    call.url.endsWith("/oauth/token")
      ? tokenResponse()
      : json({
          output: {
            rateReplyDetails: [
              { serviceType: "FEDEX_GROUND", ratedShipmentDetails: [{ totalNetCharge: 31.5 }] },
              { serviceType: "GROUND_HOME_DELIVERY", ratedShipmentDetails: [{}] },
              { serviceType: "FEDEX_2_DAY", ratedShipmentDetails: [{ totalNetCharge: 88 }] },
            ],
          },
        });

  const result = await api.fetchFedExRates({ shipFrom, shipTo, packages, purchaseDefaults: signatureDefaults });
  assert.deepEqual(
    result.quotes.map((quote) => [quote.serviceType, quote.totalNetCharge]),
    [
      ["FEDEX_GROUND", 31.5],
      ["FEDEX_2_DAY", 88],
    ]
  );
  assert.deepEqual(result.unpricedServiceTypes, ["GROUND_HOME_DELIVERY"]);
});

test("a 401 drops the cached token and retries once with a fresh one", async () => {
  let tokenCount = 0;
  let rateAttempts = 0;
  handler = (call) => {
    if (call.url.endsWith("/oauth/token")) return tokenResponse(`token-${++tokenCount}`);
    rateAttempts += 1;
    return rateAttempts === 1
      ? json({ errors: [{ code: "NOT.AUTHORIZED.ERROR" }] }, 401)
      : json({ output: { rateReplyDetails: [] } });
  };

  await api.fetchFedExRates({ shipFrom, shipTo, packages, purchaseDefaults: signatureDefaults });
  assert.equal(tokenCount, 2);
  assert.equal(rateAttempts, 2);
});

test("every FedEx request carries a timeout signal and times out with a clear error", async () => {
  handler = (call) => {
    assert.ok(call.signal instanceof AbortSignal, `${call.url} has no timeout signal`);
    if (call.url.endsWith("/oauth/token")) return tokenResponse();
    throw new DOMException("The operation timed out.", "TimeoutError");
  };

  await assert.rejects(
    api.purchaseFedExShipment({
      shipFrom,
      shipTo: { ...shipTo, phone: "5125550100" },
      packages,
      purchaseDefaults: signatureDefaults,
      serviceType: "FEDEX_GROUND",
    }),
    (error: Error) =>
      error instanceof api.FedExTimeoutError && /shipment history/.test(error.message)
  );
});

test("multi-box purchases merge every box label and keep every tracking number", async () => {
  const labels = [await onePagePdfBase64(), await onePagePdfBase64()];
  handler = (call) =>
    call.url.endsWith("/oauth/token") ? tokenResponse() : json(shipmentPayload(labels, 62.4));

  const result = await api.purchaseFedExShipment({
    shipFrom,
    shipTo: { ...shipTo, phone: "5125550100" },
    packages,
    purchaseDefaults: signatureDefaults,
    serviceType: "FEDEX_GROUND",
  });

  assert.deepEqual(result.trackingNumbers, ["794600000001", "794600000002"]);
  assert.equal(result.trackingNumber, "794600000001");
  assert.equal(result.totalNetCharge, 62.4);
  assert.ok(result.labelBuffer);
  const merged = await PDFDocument.load(result.labelBuffer);
  assert.equal(merged.getPageCount(), 2);
});

test("a created shipment without a readable label or charge still returns its tracking", async () => {
  handler = (call) =>
    call.url.endsWith("/oauth/token") ? tokenResponse() : json(shipmentPayload([]));

  const result = await api.purchaseFedExShipment({
    shipFrom,
    shipTo: { ...shipTo, phone: "5125550100" },
    packages: [packages[0]!],
    purchaseDefaults: signatureDefaults,
    serviceType: "FEDEX_GROUND",
  });
  assert.equal(result.trackingNumber, "794600000001");
  assert.equal(result.labelBuffer, null);
  assert.match(result.labelError ?? "", /did not contain a label/);
  assert.equal(result.totalNetCharge, null);
});

test("recipients default to residential, keep street line 3, and use the default contact phone", async () => {
  process.env.SHIP_FROM_PHONE = "7025550199";
  handler = async (call) =>
    call.url.endsWith("/oauth/token")
      ? tokenResponse()
      : json(shipmentPayload([await onePagePdfBase64()], 10));

  await api.purchaseFedExShipment({
    shipFrom,
    shipTo,
    packages: [packages[0]!],
    purchaseDefaults: signatureDefaults,
    serviceType: "FEDEX_GROUND",
  });
  const recipient = calls.find((call) => call.url.endsWith("/ship/v1/shipments"))?.body
    .requestedShipment.recipients[0];
  assert.equal(recipient.address.residential, true);
  assert.deepEqual(recipient.address.streetLines, ["10 Main St", "Apt 2", "Building C"]);
  // Etsy gives no buyer phone, so a blank recipient phone uses the shop's fixed contact number.
  assert.equal(recipient.contact.phoneNumber, "9293277420");
});

test("a purchase without any shipper phone fails clearly instead of sending zeros", async () => {
  handler = (call) =>
    call.url.endsWith("/oauth/token") ? tokenResponse() : json(shipmentPayload([]));

  await assert.rejects(
    api.purchaseFedExShipment({
      shipFrom: { ...shipFrom, phone: "" },
      shipTo,
      packages: [packages[0]!],
      purchaseDefaults: signatureDefaults,
      serviceType: "FEDEX_GROUND",
    }),
    /SHIP_FROM_PHONE/
  );
  assert.equal(
    calls.some((call) => call.url.endsWith("/ship/v1/shipments")),
    false
  );
});

test("voiding calls FedEx Cancel Shipment for the tracking number", async () => {
  handler = (call) =>
    call.url.endsWith("/oauth/token")
      ? tokenResponse()
      : json({
          output: {
            cancelledShipment: true,
            cancelledHistory: true,
            message: "Shipment is successfully cancelled",
          },
        });

  const result = await api.cancelFedExShipment("794600000001", "US");
  const call = calls.find((candidate) => candidate.url.endsWith("/ship/v1/shipments/cancel"));
  assert.equal(call?.method, "PUT");
  assert.deepEqual(call?.body, {
    accountNumber: { value: "000000000" },
    emailShipment: false,
    senderCountryCode: "US",
    deletionControl: "DELETE_ALL_PACKAGES",
    trackingNumber: "794600000001",
  });
  assert.deepEqual(result, {
    cancelled: true,
    message: "Shipment is successfully cancelled",
  });
});
