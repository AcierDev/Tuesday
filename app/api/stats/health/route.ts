import { NextResponse } from "next/server";

import { getDb } from "@/app/api/db/connect";
import { computeHealthScore } from "@/lib/production-metrics";
import { Item } from "@/typings/types";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=120";
const HTTP_SERVER_ERROR = 500;

// Fields computeHealthScore reads (debt, late-now, on-time, velocity, lead
// time by design/size, forecast drift).
const HEALTH_ITEM_PROJECTION = {
  _id: 0,
  id: 1,
  dueDate: 1,
  status: 1,
  completedAt: 1,
  createdAt: 1,
  design: 1,
  size: 1,
  onHold: 1,
} as const;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📤 GET — health score for the nav badge                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Same population as the stats pages' useAllItems: visible, not deleted, and
// held items excluded everywhere.
export async function GET() {
  try {
    const db = await getDb();
    const items = (await db
      .collection<Item>(`items-${process.env.NEXT_PUBLIC_MODE}`)
      .find(
        { visible: true, deleted: false, onHold: { $ne: true } },
        { projection: HEALTH_ITEM_PROJECTION }
      )
      .toArray()) as unknown as Item[];
    const { total, breakdown } = computeHealthScore(items);
    return NextResponse.json(
      { total, breakdown },
      { headers: { "Cache-Control": CACHE_CONTROL } }
    );
  } catch (error) {
    console.error("Failed to compute health score", error);
    return NextResponse.json(
      { error: "Failed to compute health score" },
      { status: HTTP_SERVER_ERROR }
    );
  }
}
