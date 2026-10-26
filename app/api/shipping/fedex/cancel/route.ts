import { NextResponse } from "next/server";
import { FedExTimeoutError } from "@/lib/fedex-api";
import { createFedExVoidDeps } from "@/lib/shipping-labels/fedex-purchase-server";
import { voidFedExLabel } from "@/lib/shipping-labels/fedex-void";
import { publicPurchase } from "@/lib/shipping-labels/purchase-request";

export const runtime = "nodejs";

const HTTP_BAD_REQUEST = 400;
const HTTP_GATEWAY_TIMEOUT = 504;
const HTTP_INTERNAL_ERROR = 500;

// Voids (cancels) a purchased FedEx label that has not been handed to FedEx.
export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const orderId = payload?.orderId;
    const trackingNumber = payload?.trackingNumber;
    if (
      typeof orderId !== "string" ||
      !orderId ||
      typeof trackingNumber !== "string" ||
      !trackingNumber
    ) {
      return NextResponse.json(
        { error: "orderId and trackingNumber are required." },
        { status: HTTP_BAD_REQUEST }
      );
    }

    const outcome = await voidFedExLabel(
      { orderId, trackingNumber },
      await createFedExVoidDeps()
    );
    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }
    return NextResponse.json({
      voided: publicPurchase(outcome.voided),
      message: outcome.message,
      warnings: outcome.warnings,
    });
  } catch (error) {
    console.error("Failed to void FedEx label:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to void FedEx label" },
      {
        status:
          error instanceof FedExTimeoutError
            ? HTTP_GATEWAY_TIMEOUT
            : HTTP_INTERNAL_ERROR,
      }
    );
  }
}
