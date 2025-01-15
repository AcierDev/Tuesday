import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY;
const EASYPOST_BASE_URL = "https://api.easypost.com/v2";

export async function GET(
  request: NextRequest,
  { params }: { params: { trackingCode: string } }
) {
  const { trackingCode } = await params;
  const carrier = request.nextUrl.searchParams.get("carrier") || "UPS";

  try {
    // First try to create a new tracker
    const createResponse = await fetch(`${EASYPOST_BASE_URL}/trackers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${EASYPOST_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tracker: {
          tracking_code: trackingCode,
          carrier: carrier,
        },
      }),
    });

    if (!createResponse.ok) {
      // If creation fails, try to retrieve existing trackers
      const listResponse = await fetch(
        `${EASYPOST_BASE_URL}/trackers?tracking_codes[]=${trackingCode}`,
        {
          headers: {
            Authorization: `Bearer ${EASYPOST_API_KEY}`,
          },
        }
      );
      if (!listResponse.ok) {
        throw new Error("Failed to retrieve tracker");
      }

      const listData = await listResponse.json();
      if (listData.trackers && listData.trackers.length > 0) {
        return NextResponse.json(listData.trackers[0]);
      }

      throw new Error("No tracking information found");
    }

    const trackerData = await createResponse.json();
    return NextResponse.json(trackerData);
  } catch (error) {
    console.error("Error with tracker:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking information" },
      { status: 500 }
    );
  }
}
