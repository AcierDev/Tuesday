import { NextResponse } from "next/server";
import { recordTodayHealthSnapshot } from "../record-snapshot";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🕛 CRON — daily health snapshot writer (called by Vercel cron)       ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Vercel always sends GETs to cron routes. If CRON_SECRET is set, Vercel
// includes `Authorization: Bearer <CRON_SECRET>`; we reject anything else.
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const snapshot = await recordTodayHealthSnapshot();
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    console.error("Cron failed to record health snapshot", error);
    return NextResponse.json(
      { error: "Failed to record health snapshot" },
      { status: 500 }
    );
  }
}
