import { NextResponse } from "next/server";
import { recordTodayHealthSnapshot } from "../record-snapshot";
import { isAuthorizedCronRequest } from "../../debt-snapshots/snapshot-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const HTTP_UNAUTHORIZED = 401;
const HTTP_SERVER_ERROR = 500;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🕛 CRON — daily health snapshot writer (called by Vercel cron)       ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Vercel always sends GETs to cron routes with `Authorization: Bearer
// <CRON_SECRET>`. Fails closed: requests are rejected when the secret is
// unset (this path bypasses site access in middleware). The cron is the only
// writer allowed to overwrite an already-recorded day.
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_UNAUTHORIZED });
  }

  try {
    const snapshot = await recordTodayHealthSnapshot();
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    console.error("Cron failed to record health snapshot", error);
    return NextResponse.json(
      { error: "Failed to record health snapshot" },
      { status: HTTP_SERVER_ERROR }
    );
  }
}
