import { GoogleGenerativeAI } from "@google/generative-ai";

import type { TrackingInfo } from "@/types/shipping";
import type { ShippingLabelCarrier } from "@/types/shipping-labels";

const GEMINI_LABEL_EXTRACTION_MODEL = "gemini-2.5-flash-lite";
const MAX_EXTRACTION_ATTEMPTS = 2;
// One Gemini call per attempt; abort instead of hanging an upload request.
export const GEMINI_EXTRACTION_TIMEOUT_MS = 30_000;
// The reply is a four-field JSON object, so a small budget is plenty.
export const GEMINI_EXTRACTION_MAX_OUTPUT_TOKENS = 256;
// Shipping labels are 6 KB to ~1 MB; anything far larger is not a label.
export const MAX_EXTRACTION_UPLOAD_BYTES = 10 * 1024 * 1024;

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_PAYLOAD_TOO_LARGE = 413;
const HTTP_UNPROCESSABLE = 422;
const UNREADABLE_TRACKING_ERROR =
  "Tracking number could not be read from this label.";

export type ExtractionOptions = {
  /** Caller cancellation (e.g. the incoming request's signal). */
  signal?: AbortSignal;
  /** Per-attempt timeout; defaults to GEMINI_EXTRACTION_TIMEOUT_MS. */
  timeoutMs?: number;
};

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

function attemptSignal(options: ExtractionOptions): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(
    options.timeoutMs ?? GEMINI_EXTRACTION_TIMEOUT_MS
  );
  return options.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;
}

async function runExtractionAttempt(
  pdfBuffer: Buffer,
  options: ExtractionOptions
): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY.");
  const signal = attemptSignal(options);
  // The SDK only listens for future aborts, so honour an earlier one here.
  signal.throwIfAborted();

  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: GEMINI_LABEL_EXTRACTION_MODEL,
    generationConfig: { maxOutputTokens: GEMINI_EXTRACTION_MAX_OUTPUT_TOKENS },
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
  // Only a signal is passed (no SDK `timeout`): AbortSignal.timeout does not
  // keep the process alive, while the SDK's own timer is never cleared.
  const result = await model.generateContent(
    [
      prompt,
      {
        inlineData: {
          data: pdfBuffer.toString("base64"),
          mimeType: "application/pdf",
        },
      },
    ],
    { signal }
  );
  return parseModelJson(result.response.text());
}

export async function extractTrackingInfoCandidate(
  pdfBuffer: Buffer,
  options: ExtractionOptions = {}
): Promise<unknown> {
  let latestCandidate: unknown = null;
  let latestError: unknown = null;

  for (
    let attemptNumber = 1;
    attemptNumber <= MAX_EXTRACTION_ATTEMPTS;
    attemptNumber += 1
  ) {
    try {
      const candidate = await runExtractionAttempt(pdfBuffer, options);
      latestCandidate = candidate;
      if (normalizeTrackingInfo(candidate)) return candidate;
    } catch (error) {
      latestError = error;
      // A cancelled caller should not trigger another paid attempt.
      if (options.signal?.aborted) break;
    }
  }

  if (latestCandidate) return latestCandidate;
  throw latestError instanceof Error
    ? latestError
    : new Error("Failed to extract tracking information.");
}

export type ExtractionHttpResult = {
  status: number;
  body: TrackingInfo | { error: string };
};

/**
 * HTTP contract for /api/shipping/extract-tracking: only normalized tracking
 * info ever leaves the server (never raw model output).
 */
export async function extractTrackingForUpload(
  file: unknown,
  extract: (
    pdfBuffer: Buffer,
    options: ExtractionOptions
  ) => Promise<unknown> = extractTrackingInfoCandidate,
  options: ExtractionOptions = {}
): Promise<ExtractionHttpResult> {
  if (!(file instanceof File)) {
    return { status: HTTP_BAD_REQUEST, body: { error: "No PDF file provided" } };
  }
  if (file.size > MAX_EXTRACTION_UPLOAD_BYTES) {
    return {
      status: HTTP_PAYLOAD_TOO_LARGE,
      body: { error: "Label PDF is too large to scan." },
    };
  }

  const candidate = await extract(Buffer.from(await file.arrayBuffer()), options);
  const normalized = normalizeTrackingInfo(candidate);
  return normalized
    ? { status: HTTP_OK, body: normalized }
    : { status: HTTP_UNPROCESSABLE, body: { error: UNREADABLE_TRACKING_ERROR } };
}

export async function extractValidTrackingInfo(
  pdfBuffer: Buffer
): Promise<TrackingInfo> {
  const candidate = await extractTrackingInfoCandidate(pdfBuffer);
  const normalized = normalizeTrackingInfo(candidate);
  if (!normalized) {
    throw new Error(UNREADABLE_TRACKING_ERROR);
  }
  return normalized;
}
