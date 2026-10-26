import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { saveWarehouseIP, getWarehouseIP, heartbeatIP } from "../lib/warehouseStorage";

const HTTP_BAD_REQUEST = 400;
const HTTP_SERVER_ERROR = 500;

export async function POST() {
  const headersList = await headers();
  // This route is public, so only a literal IP address is stored.
  const ip = heartbeatIP(headersList.get("x-forwarded-for"));
  if (!ip) return NextResponse.json({ error: "Invalid request" }, { status: HTTP_BAD_REQUEST });

  try {
    // Save the IP server-side
    await saveWarehouseIP(ip);

    return NextResponse.json({
      success: true,
      ip,
      received: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to save warehouse heartbeat", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.json({ error: "Could not save heartbeat" }, { status: HTTP_SERVER_ERROR });
  }
}

export async function GET() {
  const warehouseData = await getWarehouseIP();

  if (!warehouseData) {
    return NextResponse.json({
      ip: "No recent heartbeat received",
      lastUpdate: null,
    });
  }

  return NextResponse.json(warehouseData);
}
