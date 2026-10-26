import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNKNOWN = "unknown";
const MS_PER_SECOND = 1000;
// Process start, so a PM2 restart onto a new build is visible too.
const startedAt = new Date(Date.now() - process.uptime() * MS_PER_SECOND).toISOString();

// Public (see middleware.ts): which build is live. The values are baked in by
// next.config.mjs at build time and contain no secrets.
export function GET() {
  return NextResponse.json(
    {
      commit: process.env.BUILD_COMMIT_SHA || UNKNOWN,
      builtAt: process.env.BUILD_TIME || UNKNOWN,
      startedAt,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
