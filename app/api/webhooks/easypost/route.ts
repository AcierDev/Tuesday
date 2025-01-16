import { NextResponse } from "next/server";
import clientPromise from "../../db/connect";
import { OrderTrackingInfo, Tracker } from "@/typings/types";
import crypto from "crypto";
import { AlertManager } from "@/backend/src/AlertManager";

// Webhook secret should be stored in environment variables
const WEBHOOK_SECRET = process.env.EASYPOST_WEBHOOK_SECRET;

// HMAC validation helper
function validateWebhook(payload: string, signature: string): boolean {
  console.log("Validating webhook signature");
  console.log("Payload:", payload);
  console.log("Received signature:", signature);

  if (!WEBHOOK_SECRET) {
    console.error("WEBHOOK_SECRET is not configured!");
    return false;
  }

  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  hmac.update(payload);
  const digest = hmac.digest("hex");

  console.log("Calculated signature:", digest);
  console.log(
    "Signatures match:",
    Buffer.from(signature).equals(Buffer.from(digest))
  );

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(request: Request) {
  console.log("Received webhook request");
  AlertManager.sendText("Ben", "New Message", "EasyPost webhook received");

  try {
    const payload = await request.text();
    console.log("Raw payload:", payload);

    const signature = request.headers.get("X-Hmac-Signature");
    console.log("Received signature header:", signature);

    // Log all headers for debugging
    console.log("All request headers:", Object.fromEntries(request.headers));

    // Validate webhook signature
    if (!signature || !validateWebhook(payload, signature)) {
      console.error("Webhook signature validation failed");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    console.log("Webhook signature validated successfully");
    const event = JSON.parse(payload);
    console.log("Parsed event:", event);

    // Handle tracker updates
    if (event.description === "tracker.updated") {
      console.log("Processing tracker.updated event");
      const tracker: Tracker = event.result;
      console.log("Tracker data:", tracker);

      AlertManager.sendText(
        "Ben",
        "New Message",
        `Tracker code: ${tracker.tracking_code} updated`
      );

      const client = await clientPromise;
      console.log("MongoDB client connected");

      const db = client.db("react-web-app");
      const collection = db.collection<OrderTrackingInfo>(
        `trackers-${process.env.NEXT_PUBLIC_MODE}`
      );
      console.log(
        "Using collection:",
        `trackers-${process.env.NEXT_PUBLIC_MODE}`
      );

      // Update tracking info in database
      const updateResult = await collection.updateOne(
        { "trackers.id": tracker.id },
        {
          $set: {
            "trackers.$.status": tracker.status,
            "trackers.$.tracking_details": tracker.tracking_details,
            "trackers.$.updated_at": new Date(),
          },
        }
      );

      console.log("Database update result:", updateResult);

      // Return success
      console.log("Successfully processed webhook");
      return NextResponse.json({ status: "success" }, { status: 200 });
    }

    // Ignore other event types
    console.log("Ignoring non-tracker event:", event.description);
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
