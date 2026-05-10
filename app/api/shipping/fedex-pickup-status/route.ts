import { NextResponse } from "next/server";
import { getDb } from "@/app/api/db/connect";
import type { Item } from "@/typings/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 6 days covers a Friday-after-1 PM purchase whose Monday 4 PM pickup window
// is still active, plus a safety margin for clock skew / odd weekends.
const LOOKBACK_HOURS = 6 * 24;

export async function GET() {
  try {
    const db = await getDb();
    const collection = db.collection<Item>(
      `items-${process.env.NEXT_PUBLIC_MODE}`
    );

    const since = Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000;
    const recent = await collection
      .find({
        "purchasedShipment.carrier": "FedEx",
        "purchasedShipment.purchasedAt": { $gte: since },
      })
      .project<{ purchasedShipment?: { purchasedAt?: number } }>({
        "purchasedShipment.purchasedAt": 1,
      })
      .toArray();

    const purchasedAts = recent
      .map((doc) => doc.purchasedShipment?.purchasedAt)
      .filter((ts): ts is number => typeof ts === "number");

    return NextResponse.json({ purchasedAts });
  } catch (error) {
    console.error("Failed to load FedEx pickup status", error);
    return NextResponse.json(
      { purchasedAts: [], error: "load-failed" },
      { status: 200 }
    );
  }
}
