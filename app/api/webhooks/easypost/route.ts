import { NextResponse } from "next/server";
import clientPromise from "../../db/connect";
import {
  ItemStatus,
  OrderTrackingInfo,
  Tracker,
} from "@/typings/types";
import { evaluateFutureLabelCompletion } from "@/lib/shipping-labels/order-completion";
import { createFutureLabelCompletionDeps } from "@/lib/shipping-labels/order-completion-server";
import { updateShippingLabelByTrackerId } from "@/lib/shipping-labels/repository";
import { applyFutureLabelTrackerUpdate } from "@/lib/shipping-labels/webhook";
import { processTrackerCompletion } from "@/lib/shipping-labels/webhook-completion";
import {
  EASYPOST_SIGNATURE_HEADER,
  EASYPOST_WEBHOOK_SECRET_ENV,
  verifyEasyPostSignature,
} from "@/lib/shipping-labels/easypost-webhook-signature";
import { isEasyPostTrackerId } from "@/lib/shipping-labels/tracker-summary";

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;

// Live browser updates moved to the authenticated /api/tracking/changes stream.
export async function POST(request: Request) {
  try {
    // Verify the signature over the exact bytes EasyPost sent, before parsing.
    const rawBody = Buffer.from(await request.arrayBuffer());
    const signature = verifyEasyPostSignature(
      rawBody,
      request.headers.get(EASYPOST_SIGNATURE_HEADER),
      process.env[EASYPOST_WEBHOOK_SECRET_ENV]
    );
    // Transitional: until the secret is set on the host, keep accepting
    // unsigned events (as before) so tracking doesn't stop. Once it is set,
    // every unsigned or mis-signed event is rejected.
    if (!signature.ok && signature.reason === "missing-secret") {
      console.warn(
        `EasyPost webhook accepted unsigned: set ${EASYPOST_WEBHOOK_SECRET_ENV} to enforce signatures.`
      );
    } else if (!signature.ok) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: HTTP_UNAUTHORIZED }
      );
    }

    let event: { description?: unknown; result?: unknown };
    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: HTTP_BAD_REQUEST }
      );
    }

    // Handle tracker updates
    if (event?.description === "tracker.updated") {
      const tracker = event.result as Tracker | undefined;
      // Only a real EasyPost id may reach the Mongo filter (blocks operator objects).
      if (
        !tracker ||
        typeof tracker !== "object" ||
        !isEasyPostTrackerId(tracker.id)
      ) {
        return NextResponse.json(
          { error: "Invalid tracker payload" },
          { status: HTTP_BAD_REQUEST }
        );
      }

      const client = await clientPromise;
      // console.log("MongoDB client connected");

      const db = client.db("react-web-app");
      const collection = db.collection<OrderTrackingInfo>(
        `trackers-${process.env.NEXT_PUBLIC_MODE}`
      );
      // console.log(
      //   "Using collection:",
      //   `trackers-${process.env.NEXT_PUBLIC_MODE}`
      // );

      // Update tracking info in database
      await collection.updateOne(
        { "trackers.id": tracker.id },
        {
          $set: {
            "trackers.$": tracker,
          },
        }
      );

      const trackingDoc = await collection.findOne({
        "trackers.id": tracker.id,
      });
      const completionDeps = createFutureLabelCompletionDeps(db);
      const autoCompletedItemId = await processTrackerCompletion(
        tracker,
        trackingDoc?.orderId ?? null,
        {
          applyFutureLabelUpdate: (updatedTracker) =>
            applyFutureLabelTrackerUpdate(updatedTracker, {
              updateByTrackerId: (trackerId, nextTracker, updatedAt) =>
                updateShippingLabelByTrackerId(
                  db,
                  trackerId,
                  nextTracker,
                  updatedAt
                ),
              evaluateOrderCompletion: (orderId) =>
                evaluateFutureLabelCompletion(orderId, completionDeps),
              now: Date.now,
            }),
          evaluateFutureLabelCompletion: (orderId) =>
            evaluateFutureLabelCompletion(orderId, completionDeps),
          completeLegacyOrder: async (orderId) => {
            const item = await completionDeps.getOrder(orderId);
            if (
              !item ||
              item.status === ItemStatus.Done ||
              item.status === ItemStatus.Hidden
            ) {
              return false;
            }
            return completionDeps.completeOrder(item, completionDeps.now());
          },
        }
      );

      // Browsers receive this change through the trackers change stream.
      return NextResponse.json(
        { status: "success", autoCompletedItemId },
        { status: 200 }
      );
    }

    // Ignore other event types
    // console.log("Ignoring non-tracker event:", event.description);
    return NextResponse.json({ status: "ignored" }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    console.error("Full error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
