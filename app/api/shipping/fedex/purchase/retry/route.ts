import { NextResponse } from "next/server";
import { completePurchaseFollowUps } from "@/lib/shipping-labels/fedex-purchase";
import { createFedExFollowUpDeps } from "@/lib/shipping-labels/fedex-purchase-server";
import {
  hasPendingFollowUps,
  type PurchasedShipmentRecord,
} from "@/lib/shipping-labels/purchase-records";
import { publicPurchase } from "@/lib/shipping-labels/purchase-request";

export const runtime = "nodejs";

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_ERROR = 500;

// Retries the label upload / tracker creation that failed after a purchase.
export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const orderId = payload?.orderId;
    const purchaseId = payload?.purchaseId;
    if (typeof orderId !== "string" || typeof purchaseId !== "string") {
      return NextResponse.json(
        { error: "orderId and purchaseId are required." },
        { status: HTTP_BAD_REQUEST }
      );
    }

    const deps = await createFedExFollowUpDeps();
    const order = await deps.getOrder(orderId);
    const purchase = order?.purchasedShipments?.find(
      (candidate) => candidate.id === purchaseId
    );
    if (!purchase) {
      return NextResponse.json(
        { error: "Purchase not found on this order." },
        { status: HTTP_NOT_FOUND }
      );
    }
    if (!hasPendingFollowUps(purchase)) {
      return NextResponse.json({ purchasedShipment: publicPurchase(purchase), warnings: [] });
    }

    const result = await completePurchaseFollowUps(
      orderId,
      purchase as PurchasedShipmentRecord,
      deps
    );
    return NextResponse.json({
      purchasedShipment: publicPurchase(result.purchasedShipment),
      warnings: result.warnings,
    });
  } catch (error) {
    console.error("Failed to retry FedEx purchase follow-ups:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Retry failed" },
      { status: HTTP_INTERNAL_ERROR }
    );
  }
}
