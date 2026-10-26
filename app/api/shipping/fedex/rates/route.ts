import { NextResponse } from "next/server";
import { fetchFedExRates, FedExTimeoutError } from "@/lib/fedex-api";
import { normalizeShippingSettings } from "@/config/shipping-defaults";
import { parseFedExRateRequest } from "@/lib/shipping-labels/purchase-request";

import type { ShippingPurchaseDefaults } from "@/typings/types";

export const runtime = "nodejs";

const HTTP_BAD_REQUEST = 400;
const HTTP_GATEWAY_TIMEOUT = 504;
const HTTP_INTERNAL_ERROR = 500;

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const parsed = parseFedExRateRequest(payload);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: HTTP_BAD_REQUEST });
    }

    const { quotes, unpricedServiceTypes } = await fetchFedExRates({
      ...parsed.value,
      purchaseDefaults: normalizeShippingSettings({
        purchaseDefaults: parsed.value
          .purchaseDefaults as ShippingPurchaseDefaults,
      }).purchaseDefaults,
    });

    return NextResponse.json({ rates: quotes, unpricedServiceTypes });
  } catch (error) {
    console.error("Failed to fetch FedEx rates:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch FedEx rates",
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
