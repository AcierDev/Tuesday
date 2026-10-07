import { handleAskTuesday } from "@/lib/ask-tuesday/http";
import { authorizeAskTuesday } from "@/lib/ask-tuesday/access";
import { readTuesdaySnapshot } from "@/lib/ask-tuesday/server";
import { siteAccessSecret } from "@/lib/site-access-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = (request: Request) => handleAskTuesday(request, {
  authorize: request => authorizeAskTuesday(request, siteAccessSecret()),
  load: readTuesdaySnapshot,
  now: () => new Date().toISOString(),
});
