import { NextResponse } from "next/server";

import {
  getStatsItems,
  getStatusActivities,
  getTrackerSummaries,
} from "@/lib/server/stats-dataset";
import {
  STATS_VIEWS,
  StatsViewParamError,
  type StatsViewSources,
} from "@/lib/server/stats-views";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVER_ERROR = 500;
// The per-process dataset cache is the shared cache; responses stay out of
// HTTP caches so a fresh read after an edit is never answered from one.
const CACHE_CONTROL = "private, no-store";
// ?fresh=1 skips the dataset cache (the browser sends it right after a write).
const FRESH_PARAM = "fresh";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📤 GET — one server-computed stats view                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export async function GET(
  request: Request,
  { params }: { params: Promise<{ view: string }> }
) {
  const { view } = await params;
  const handler = Object.hasOwn(STATS_VIEWS, view) ? STATS_VIEWS[view] : undefined;
  if (!handler) {
    return NextResponse.json(
      { error: "Unknown stats view" },
      { status: HTTP_NOT_FOUND }
    );
  }
  const { searchParams } = new URL(request.url);
  const fresh = searchParams.get(FRESH_PARAM) === "1";
  const sources: StatsViewSources = {
    items: () => getStatsItems({ fresh }),
    statusActivities: () => getStatusActivities({ fresh }),
    trackers: () => getTrackerSummaries({ fresh }),
  };
  try {
    const data = await handler(sources, searchParams);
    return NextResponse.json(data, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch (error) {
    if (error instanceof StatsViewParamError) {
      return NextResponse.json(
        { error: error.message },
        { status: HTTP_BAD_REQUEST }
      );
    }
    console.error(`Failed to compute stats view "${view}"`, error);
    return NextResponse.json(
      { error: "Failed to compute stats" },
      { status: HTTP_SERVER_ERROR }
    );
  }
}
