import { NextRequest, NextResponse } from "next/server";
import type { Document } from "mongodb";
import clientPromise from "../db/connect";
import { OrderTrackingInfo, type Tracker } from "@/typings/types";
import {
  isEasyPostTrackerId,
  trackerSummaryProjectionStage,
} from "@/lib/shipping-labels/tracker-summary";
import { upsertTrackerProjection } from "@/lib/shipping-labels/tracker-projection";
import {
  PURCHASE_SOURCE_UPLOADED,
  type UploadedLabelMarker,
} from "@/lib/shipping-labels/purchase-records";

const HTTP_BAD_REQUEST = 400;
const MAX_TRACKERS_PER_POST = 50;

function trackersCollection(client: Awaited<typeof clientPromise>) {
  return client
    .db("react-web-app")
    .collection<OrderTrackingInfo>(`trackers-${process.env.NEXT_PUBLIC_MODE}`);
}

// GET            → every order's trackers, lean (status fields + delivered scan).
// GET ?orderId=X → that order's full trackers, including scan history.
export async function GET(request: NextRequest) {
  try {
    const collection = trackersCollection(await clientPromise);
    const orderId = request.nextUrl.searchParams.get("orderId");

    if (orderId !== null) {
      const info = await collection.findOne(
        { orderId: String(orderId) },
        { projection: { _id: 0 } }
      );
      return NextResponse.json(info ?? null);
    }

    const trackingInfo = await collection
      .aggregate([trackerSummaryProjectionStage()])
      .toArray();
    return NextResponse.json(trackingInfo);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch order tracking information" },
      { status: 500 }
    );
  }
}

function parseTrackingPost(
  payload: unknown
): { orderId: string; trackers: Tracker[] } | null {
  if (!payload || typeof payload !== "object") return null;
  const { orderId, trackers } = payload as Record<string, unknown>;
  if (typeof orderId !== "string" || !orderId) return null;
  if (
    !Array.isArray(trackers) ||
    trackers.length === 0 ||
    trackers.length > MAX_TRACKERS_PER_POST
  ) {
    return null;
  }
  const valid = trackers.every(
    (tracker) =>
      tracker &&
      typeof tracker === "object" &&
      isEasyPostTrackerId((tracker as Tracker).id) &&
      typeof (tracker as Tracker).tracking_code === "string"
  );
  return valid ? { orderId, trackers: trackers as Tracker[] } : null;
}

function normalizeCarrier(rawCarrier: string): string {
  // EasyPost returns sub-typed carrier names like "FedExDefault" /
  // "FedExSmartPost" / "UPSDAP" / "DHLExpress"; normalize to the canonical
  // form the rest of the app uses ("FedEx", "UPS", etc.).
  const lowerCarrier = rawCarrier.toLowerCase();
  return lowerCarrier.includes("fedex")
    ? "FedEx"
    : lowerCarrier.includes("usps")
      ? "USPS"
      : lowerCarrier.includes("ups")
        ? "UPS"
        : lowerCarrier.includes("dhl")
          ? "DHL"
          : rawCarrier;
}

export async function POST(request: Request) {
  try {
    const parsed = parseTrackingPost(await request.json().catch(() => null));
    if (!parsed) {
      return NextResponse.json(
        { error: "orderId and EasyPost trackers (trk_…) are required." },
        { status: HTTP_BAD_REQUEST }
      );
    }

    const client = await clientPromise;
    const db = client.db("react-web-app");

    // Merge each tracker into the order's list instead of replacing the list.
    for (const tracker of parsed.trackers) {
      await upsertTrackerProjection(db, parsed.orderId, tracker);
    }

    // Also stamp the carrier + add-time on the order itself so the FedEx
    // pickup badge (and any other "when was a label added" check) can see
    // uploaded labels. The marker is cost-less and tagged "uploaded" so
    // shipping-spend stats can exclude it, and it never overwrites a real
    // purchased label.
    const normalizedCarrier = normalizeCarrier(parsed.trackers[0]?.carrier ?? "");
    if (normalizedCarrier) {
      const marker: UploadedLabelMarker = {
        orderId: parsed.orderId,
        carrier: normalizedCarrier,
        source: PURCHASE_SOURCE_UPLOADED,
        totalNetCharge: null,
        purchasedAt: Date.now(),
      };
      await db.collection<Document>(`items-${process.env.NEXT_PUBLIC_MODE}`).updateOne(
        {
          id: parsed.orderId,
          $or: [
            { purchasedShipment: { $exists: false } },
            { purchasedShipment: null },
            { "purchasedShipment.source": PURCHASE_SOURCE_UPLOADED },
            // Pre-marker uploads stored only carrier + purchasedAt.
            { "purchasedShipment.trackingNumber": { $exists: false } },
          ],
        },
        { $set: { purchasedShipment: marker } }
      );
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create order tracking information" },
      { status: 500 }
    );
  }
}
