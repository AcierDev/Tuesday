import { handleTuesdayScan } from "@/lib/ask-tuesday/scan";
import { authorizeAskTuesday } from "@/lib/ask-tuesday/access";
import { readTuesdaySnapshot } from "@/lib/ask-tuesday/server";
import { siteAccessSecret } from "@/lib/site-access-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = (request: Request) => handleTuesdayScan(request, {
  authorize: request => authorizeAskTuesday(request, siteAccessSecret()),
  load: readTuesdaySnapshot,
  now: () => new Date().toISOString(),
});
