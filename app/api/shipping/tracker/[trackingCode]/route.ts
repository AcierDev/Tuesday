import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY;
const EASYPOST_BASE_URL = "https://api.easypost.com/v2";

export async function GET(
  request: NextRequest,
  { params }: { params: { trackingCode: string } }
) {
  const { trackingCode } = await params;
  let carrier = request.nextUrl.searchParams.get("carrier") || "UPS";
  if (carrier === "FedEx") {
    carrier = "FedExDefault";
  }

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
        const errorData = await listResponse.text();
        console.error("EasyPost API error:", errorData);
        return NextResponse.json(
          { error: `Failed to retrieve tracker: ${errorData}` },
          { status: listResponse.status }
        );
      }

      const listData = await listResponse.json();
      if (listData.trackers && listData.trackers.length > 0) {
        return NextResponse.json(listData.trackers[0]);
      }

      return NextResponse.json(
        { error: "No tracking information found" },
        { status: 404 }
      );
    }

    const trackerData = await createResponse.json();
    return NextResponse.json(trackerData);
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
