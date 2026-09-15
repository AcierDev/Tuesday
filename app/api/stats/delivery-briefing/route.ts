import { NextResponse } from "next/server";
import { getDeliveryBriefing } from "@/lib/server/delivery-briefing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const HTTP_SERVICE_UNAVAILABLE = 503;
const RESPONSE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    return NextResponse.json(await getDeliveryBriefing(), { headers: RESPONSE_HEADERS });
  } catch {
    console.error("Failed to load daily delivery briefing");
    return NextResponse.json(
      { error: "The daily delivery briefing is temporarily unavailable." },
      { status: HTTP_SERVICE_UNAVAILABLE, headers: RESPONSE_HEADERS },
    );
  }
}
