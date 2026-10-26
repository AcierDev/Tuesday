import { NextResponse } from "next/server";

import { computeHealthScore } from "@/lib/production-metrics";
import { getStatsItems } from "@/lib/server/stats-dataset";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=120";
const HTTP_SERVER_ERROR = 500;
// ?fresh=1 skips the per-process dataset cache (sent right after a write).
const FRESH_PARAM = "fresh";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📤 GET — health score for the nav badge                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Same population as every stats view: visible, not deleted, held items
// excluded. Reads the shared per-process stats dataset.
export async function GET(request: Request) {
  try {
    const fresh = new URL(request.url).searchParams.get(FRESH_PARAM) === "1";
    const items = await getStatsItems({ fresh });
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
