import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { saveWarehouseIP, getWarehouseIP } from "../lib/warehouseStorage";

export async function POST() {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "Unknown IP";

  try {
    // Save the IP server-side
    await saveWarehouseIP(ip);

    return NextResponse.json({
      success: true,
      ip,
      received: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
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
