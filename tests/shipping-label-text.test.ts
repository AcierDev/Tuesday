import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { PDFDocument, StandardFonts } from "pdf-lib";

import {
  AI_UNAVAILABLE_ERROR,
  extractTrackingInfoCandidate,
} from "../lib/shipping-label-extraction";
import {
  extractTrackingFromPdfText,
  textFromContentStream,
  trackingFromLabelText,
} from "../lib/shipping-label-text";

const FEDEX_TRACKING = "873638168463";
const OTHER_FEDEX_TRACKING = "873638168474";
const UPS_TRACKING = "1ZKC90500308571540";
const FEDEX_BARCODE_TEXT = (tracking: string) =>
  `9632 0019 6 (000 000 0000) 0 00 ${tracking.replace(/(\d{4})(?=\d)/g, "$1 ")}`;
const HTTP_PAYMENT_REQUIRED = 402;

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.GEMINI_API_KEY;
let geminiCalls = 0;

beforeEach(() => {
  geminiCalls = 0;
  process.env.GEMINI_API_KEY = "test-key-not-real";
  globalThis.fetch = async () => {
    geminiCalls += 1;
    return new Response(
      JSON.stringify({ error: { code: HTTP_PAYMENT_REQUIRED, message: "Your prepayment credits are depleted." } }),
      { status: HTTP_PAYMENT_REQUIRED, headers: { "Content-Type": "application/json" } }
    );
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalApiKey;
});

async function labelPdf(lines: string[]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([288, 432]);
  lines.forEach((line, index) => page.drawText(line, { x: 10, y: 410 - index * 14, size: 8, font }));
  return Buffer.from(await pdf.save());
}

test("text is read from literal and two-byte hex strings", () => {
  const literal = "BT (TRK#) Tj [(8736 ) -20 (3816 8463)] TJ ET (\\(000 000 0000\\) 0 00) Tj";
  assert.equal(textFromContentStream(literal), "TRK# 8736 3816 8463 (000 000 0000) 0 00");

  const hex = "<0031005A004B0043> Tj <0039> Tj";
  assert.equal(textFromContentStream(hex), "1ZKC 9");
});

test("a FedEx barcode line gives the FedEx tracking number", () => {
  const text = `FROM: Akiva Weil ${FEDEX_BARCODE_TEXT(FEDEX_TRACKING)} SHIP DATE: 26JUN26`;
  assert.deepEqual(trackingFromLabelText(text), {
    trackingNumber: FEDEX_TRACKING, carrier: "FedEx", sender: null, receiver: null,
  });
});

test("a FedEx Express label (no barcode text line) is read from the line after its routing code", () => {
  const text = "TRK# SHIP DATE: 10NOV26 TO MARILYN ANDERSON BILL SENDER 58KJ7/80FA/484B 8799 4286 4102 WED - 11 NOV 8:00P STANDARD OVERNIGHT";
  assert.equal(trackingFromLabelText(text)?.trackingNumber, "879942864102");
});

test("a UPS 1Z number gives the UPS tracking number, with its spaces removed", () => {
  const text = "UPS GROUND TRACKING #: 1Z KC9 050 03 0857 1540 BILLING: 3RD PARTY";
  assert.deepEqual(trackingFromLabelText(text), {
    trackingNumber: UPS_TRACKING, carrier: "UPS", sender: null, receiver: null,
  });
});

test("no number, two different numbers, or both carriers return null", () => {
  assert.equal(trackingFromLabelText("Climate Impact Plan"), null);
  assert.equal(trackingFromLabelText(`${FEDEX_BARCODE_TEXT(FEDEX_TRACKING)} ${FEDEX_BARCODE_TEXT(OTHER_FEDEX_TRACKING)}`), null);
  assert.equal(trackingFromLabelText(`${FEDEX_BARCODE_TEXT(FEDEX_TRACKING)} 1Z KC9 050 03 0857 1540`), null);
});

test("a real label PDF is read without calling Gemini", async () => {
  const pdf = await labelPdf(["FROM: Akiva Weil", FEDEX_BARCODE_TEXT(FEDEX_TRACKING)]);

  assert.equal((await extractTrackingFromPdfText(pdf))?.trackingNumber, FEDEX_TRACKING);
  assert.deepEqual(await extractTrackingInfoCandidate(pdf), {
    trackingNumber: FEDEX_TRACKING, carrier: "FedEx", sender: null, receiver: null,
  });
  assert.equal(geminiCalls, 0);
});

test("a PDF without a readable number goes on to Gemini", async () => {
  const pdf = await labelPdf(["Ship To: Someone", "No tracking number here"]);

  assert.equal(await extractTrackingFromPdfText(pdf), null);
  assert.equal(await extractTrackingFromPdfText(Buffer.from("not a pdf")), null);
  await assert.rejects(extractTrackingInfoCandidate(pdf));
  assert.ok(geminiCalls > 0);
});

test("when Gemini is out of credits the error says so plainly", async () => {
  const pdf = await labelPdf(["Ship To: Someone"]);

  await assert.rejects(extractTrackingInfoCandidate(pdf), { message: AI_UNAVAILABLE_ERROR });
});
