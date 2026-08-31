import { GoogleGenerativeAI } from "@google/generative-ai";

import type { TrackingInfo } from "@/types/shipping";
import type { ShippingLabelCarrier } from "@/types/shipping-labels";

const GEMINI_LABEL_EXTRACTION_MODEL = "gemini-2.5-flash-lite";
const MAX_EXTRACTION_ATTEMPTS = 2;

const TRACKING_NUMBER_FORMATS: Record<ShippingLabelCarrier, RegExp> = {
  UPS: /^1Z[A-Z0-9]{16}$/,
  FedEx: /^(\d{12}|\d{14,15})$/,
  USPS: /^(\d{20}|\d{26}|\d{30}|9\d{15,21})$/,
  DHL: /^[0-9]{10,12}$/,
};

const SUPPORTED_CARRIERS = new Set<ShippingLabelCarrier>([
  "FedEx",
  "UPS",
  "USPS",
  "DHL",
]);

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeTrackingInfo(value: unknown): TrackingInfo | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const carrier = candidate.carrier;
  if (
    typeof carrier !== "string" ||
    !SUPPORTED_CARRIERS.has(carrier as ShippingLabelCarrier)
  ) {
    return null;
  }

  const normalizedCarrier = carrier as ShippingLabelCarrier;
  const rawTrackingNumber = candidate.trackingNumber;
  if (typeof rawTrackingNumber !== "string") return null;
  const trackingNumber = rawTrackingNumber.replace(/\s+/g, "").toUpperCase();
  if (!TRACKING_NUMBER_FORMATS[normalizedCarrier].test(trackingNumber)) {
    return null;
  }

  return {
    trackingNumber,
    carrier: normalizedCarrier,
    sender: nullableString(candidate.sender),
    receiver: nullableString(candidate.receiver),
  };
}

function parseModelJson(text: string): unknown {
  return JSON.parse(text.trim().replace(/```json\s*|\s*```/g, ""));
}

async function runExtractionAttempt(pdfBuffer: Buffer): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY.");

  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: GEMINI_LABEL_EXTRACTION_MODEL,
  });
  const prompt = `Extract the main carrier tracking number from this single-page shipping label.
Ignore reference numbers and final-delivery partner numbers.
Return ONLY a raw JSON object with this shape:
{
  "trackingNumber": "<number with no spaces>",
  "carrier": "<FedEx|UPS|USPS|DHL>",
  "sender": "<sender name or null>",
  "receiver": "<receiver name or null>"
}`;
  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: pdfBuffer.toString("base64"),
        mimeType: "application/pdf",
      },
    },
  ]);
  return parseModelJson(result.response.text());
}

export async function extractTrackingInfoCandidate(
  pdfBuffer: Buffer
): Promise<unknown> {
  let latestCandidate: unknown = null;
  let latestError: unknown = null;

  for (
    let attemptNumber = 1;
    attemptNumber <= MAX_EXTRACTION_ATTEMPTS;
    attemptNumber += 1
  ) {
    try {
      const candidate = await runExtractionAttempt(pdfBuffer);
      latestCandidate = candidate;
      if (normalizeTrackingInfo(candidate)) return candidate;
    } catch (error) {
      latestError = error;
    }
  }

  if (latestCandidate) return latestCandidate;
  throw latestError instanceof Error
    ? latestError
    : new Error("Failed to extract tracking information.");
}

export async function extractValidTrackingInfo(
  pdfBuffer: Buffer
): Promise<TrackingInfo> {
  const candidate = await extractTrackingInfoCandidate(pdfBuffer);
  const normalized = normalizeTrackingInfo(candidate);
  if (!normalized) {
    throw new Error("Tracking number could not be read from this label.");
  }
  return normalized;
}
