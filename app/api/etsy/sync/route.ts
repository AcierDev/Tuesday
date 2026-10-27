import { NextResponse } from "next/server";

import { getDb } from "@/app/api/db/connect";
import { syncEtsyOrders } from "@/lib/etsy/sync-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HTTP_CONFLICT = 409;

/** Settings → Etsy → Import now. */
export async function POST() {
  const summary = await syncEtsyOrders(await getDb());
  if (!summary) {
    return NextResponse.json(
      { error: "Import is off, Etsy is not connected, or an import is already running." },
      { status: HTTP_CONFLICT }
    );
  }
  return NextResponse.json(summary);
}
