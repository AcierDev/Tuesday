import { NextResponse } from "next/server";
import { isMidnightPacific } from "@/lib/delivery-briefing";
import { getDeliveryBriefing } from "@/lib/server/delivery-briefing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const HTTP_UNAUTHORIZED = 401;
const HTTP_SERVICE_UNAVAILABLE = 503;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_UNAUTHORIZED });
  }
  const now = new Date();
  // UTC schedules cover both Pacific offsets; only the midnight one runs.
  if (!isMidnightPacific(now)) return NextResponse.json({ ok: true, skipped: true });
  try {
    const result = await getDeliveryBriefing(now);
    return NextResponse.json({ ok: true, date: result.report?.date, pending: result.pending });
  } catch {
    console.error("Daily delivery briefing cron failed");
    return NextResponse.json({ error: "Failed to refresh delivery briefing" }, { status: HTTP_SERVICE_UNAVAILABLE });
  }
}
