import { NextResponse } from "next/server";
import clientPromise from "../../db/connect";
import { OrderTrackingInfo, Tracker } from "@/typings/types";
import { AlertManager } from "@/backend/src/AlertManager";

// Change the controller type to use string
type ReadableStreamController = ReadableStreamDefaultController<string>;

// Add a Set to store SSE clients
const clients = new Set<ReadableStreamController>();

// Add an endpoint for SSE connections
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);

      // Remove client when connection closes
      return () => clients.delete(controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: Request) {
  console.log("Received webhook request");

  try {
    const payload = await request.text();
    console.log("Raw payload:", payload);

    // Log all headers for debugging
    console.log("All request headers:", Object.fromEntries(request.headers));

    const event = JSON.parse(payload);
    console.log("Parsed event:", event);

    // Handle tracker updates
    if (event.description === "tracker.updated") {
      console.log("Processing tracker.updated event");
      const tracker: Tracker = event.result;
      console.log("Tracker data:", tracker);

      // AlertManager.sendText(
      //   "Ben",
      //   "New Message",
      //   `Tracker code: ${tracker.tracking_code} updated`
      // );

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
            "trackers.$": tracker,
          },
        }
      );

      console.log("Database update result:", updateResult);

      // Notify all connected clients
      const message = JSON.stringify({
        type: "tracker.updated",
        data: tracker,
      });

      clients.forEach((client) => {
        client.enqueue(`data: ${message}\n\n`);
      });

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
