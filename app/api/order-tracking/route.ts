import { NextResponse } from "next/server";
import clientPromise from "../db/connect";
import { OrderTrackingInfo } from "@/typings/types";

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

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create order tracking information" },
      { status: 500 }
    );
  }
}
