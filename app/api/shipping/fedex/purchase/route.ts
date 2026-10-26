import { NextResponse } from "next/server";
import { normalizeShippingSettings } from "@/config/shipping-defaults";
import { FedExTimeoutError } from "@/lib/fedex-api";
import { purchaseFedExLabel } from "@/lib/shipping-labels/fedex-purchase";
import { createFedExPurchaseDeps } from "@/lib/shipping-labels/fedex-purchase-server";
import {
  parseFedExShipmentRequest,
  publicPurchase,
} from "@/lib/shipping-labels/purchase-request";

import type { ShippingPurchaseDefaults } from "@/typings/types";

export const runtime = "nodejs";

const HTTP_BAD_REQUEST = 400;
const HTTP_GATEWAY_TIMEOUT = 504;
const HTTP_INTERNAL_ERROR = 500;

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const parsed = parseFedExShipmentRequest(payload);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: HTTP_BAD_REQUEST });
    }

    const outcome = await purchaseFedExLabel(
      {
        ...parsed.value,
        purchaseDefaults: normalizeShippingSettings({
          purchaseDefaults: parsed.value
            .purchaseDefaults as ShippingPurchaseDefaults,
        }).purchaseDefaults,
      },
      await createFedExPurchaseDeps()
    );

    if ("error" in outcome) {
      return NextResponse.json(
        {
          error: outcome.error,
          ...(outcome.existingPurchase
            ? { existingPurchase: publicPurchase(outcome.existingPurchase) }
            : {}),
          ...(outcome.trackingNumbers ? { trackingNumbers: outcome.trackingNumbers } : {}),
        },
        { status: outcome.status }
      );
    }

    return NextResponse.json({
      purchasedShipment: publicPurchase(outcome.purchasedShipment),
      warnings: outcome.warnings,
    });
  } catch (error) {
    console.error("Failed to purchase FedEx shipment:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to purchase FedEx shipment",
      },
      {
        status:
          error instanceof FedExTimeoutError
            ? HTTP_GATEWAY_TIMEOUT
            : HTTP_INTERNAL_ERROR,
      }
    );
  }
}
