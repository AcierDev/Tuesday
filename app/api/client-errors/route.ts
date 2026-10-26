import { createClientErrorHandlers } from "@/lib/server/client-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST: browser error reports (rate-limited, size-capped, deduped).
// GET ?limit=: most recent reports and a recent count. Both need site access.
const handlers = createClientErrorHandlers();
export const POST = handlers.POST;
export const GET = handlers.GET;
