import { ASK_TUESDAY } from "@/config/ask-tuesday";
import { handleTuesdayScan, sharedResult } from "@/lib/ask-tuesday/scan";
import { authorizeAskTuesday } from "@/lib/ask-tuesday/access";
import { readTuesdaySnapshot } from "@/lib/ask-tuesday/server";
import type { TuesdayScanResponse } from "@/lib/ask-tuesday/types";
import { readServerTuesdayMonitorHealth } from "@/lib/server/tuesday-monitor";
import { siteAccessSecret } from "@/lib/site-access-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sharedScan = sharedResult<TuesdayScanResponse>(ASK_TUESDAY.scanCacheTtlMs);

export const GET = (request: Request) => handleTuesdayScan(request, {
  authorize: request => authorizeAskTuesday(request, siteAccessSecret()),
  load: readTuesdaySnapshot,
  now: () => new Date().toISOString(),
  monitor: readServerTuesdayMonitorHealth,
  shared: sharedScan,
});
