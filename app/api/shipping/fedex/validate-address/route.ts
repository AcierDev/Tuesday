import { NextResponse } from "next/server";
import { FedExTimeoutError, validateFedExAddress } from "@/lib/fedex-api";
import {
  INTERNATIONAL_NOT_SUPPORTED_MESSAGE,
  isDomesticDestination,
  parseFedExRecipientAddress,
} from "@/lib/shipping-labels/purchase-request";

export const runtime = "nodejs";

const HTTP_BAD_REQUEST = 400;
const HTTP_GATEWAY_TIMEOUT = 504;
const HTTP_INTERNAL_ERROR = 500;

/** Home or business? Used to set the Residential switch before quoting. */
export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const parsed = parseFedExRecipientAddress(payload?.shipTo);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: HTTP_BAD_REQUEST });
    }
    if (!isDomesticDestination(parsed.value)) {
      return NextResponse.json({ error: INTERNATIONAL_NOT_SUPPORTED_MESSAGE }, { status: HTTP_BAD_REQUEST });
    }
    return NextResponse.json(await validateFedExAddress(parsed.value));
  } catch (error) {
    console.error("Failed to validate FedEx address:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to validate address" },
      { status: error instanceof FedExTimeoutError ? HTTP_GATEWAY_TIMEOUT : HTTP_INTERNAL_ERROR }
    );
  }
}
