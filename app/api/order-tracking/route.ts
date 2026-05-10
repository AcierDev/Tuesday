import { NextResponse } from "next/server";
import clientPromise from "../db/connect";
import { OrderTrackingInfo, type Item } from "@/typings/types";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<OrderTrackingInfo>(
      `trackers-${process.env.NEXT_PUBLIC_MODE}`
    );

    const trackingInfo = await collection.find({}).toArray();
    return NextResponse.json(trackingInfo);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch order tracking information" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<OrderTrackingInfo>(
      `trackers-${process.env.NEXT_PUBLIC_MODE}`
    );

    const trackingInfo = await request.json();
    const result = await collection.updateOne(
      { orderId: trackingInfo.orderId },
      { $set: trackingInfo },
      { upsert: true }
    );

    // Also stamp the carrier + add-time on the order itself so the FedEx
    // pickup badge (and any other "when was a label added" check) can see
    // uploaded labels — not just labels purchased via the FedEx API.
    // EasyPost returns sub-typed carrier names like "FedExDefault" /
    // "FedExSmartPost" / "UPSDAP" / "DHLExpress"; normalize to the canonical
    // form the rest of the app uses ("FedEx", "UPS", etc.).
    const tracker = trackingInfo.trackers?.[0];
    const rawCarrier: string = tracker?.carrier ?? "";
    const lowerCarrier = rawCarrier.toLowerCase();
    const normalizedCarrier =
      lowerCarrier.includes("fedex")
        ? "FedEx"
        : lowerCarrier.includes("usps")
          ? "USPS"
          : lowerCarrier.includes("ups")
            ? "UPS"
            : lowerCarrier.includes("dhl")
              ? "DHL"
              : rawCarrier;
    if (normalizedCarrier && trackingInfo.orderId) {
      const itemsCollection = db.collection<Item>(
        `items-${process.env.NEXT_PUBLIC_MODE}`
      );
      await itemsCollection.updateOne(
        { id: trackingInfo.orderId },
        {
          $set: {
            "purchasedShipment.carrier": normalizedCarrier,
            "purchasedShipment.purchasedAt": Date.now(),
          },
        }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create order tracking information" },
      { status: 500 }
    );
  }
}
