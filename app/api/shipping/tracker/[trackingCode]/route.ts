import { NextRequest, NextResponse } from "next/server";
import { createAndStoreTracker, fetchTracker } from "@/lib/easypost-tracking";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingCode: string }> }
) {
  const { trackingCode } = await params;
  const carrier = request.nextUrl.searchParams.get("carrier") || "UPS";
  const orderId = request.nextUrl.searchParams.get("orderId");

  try {
    if (orderId) {
      const trackingInfo = await createAndStoreTracker(
        orderId,
        trackingCode,
        carrier
      );
      return NextResponse.json(trackingInfo.trackers[0]);
    }

    const tracker = await fetchTracker(trackingCode, carrier);
    return NextResponse.json(tracker);
  } catch (error) {
    console.error("Error with tracker:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tracking information",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
