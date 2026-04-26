import { NextResponse } from "next/server";
import { recordTodayBacklogSnapshot } from "../record-snapshot";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🕛 CRON — daily backlog snapshot writer (called by Vercel cron)      ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const snapshot = await recordTodayBacklogSnapshot();
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    console.error("Cron failed to record backlog snapshot", error);
    return NextResponse.json(
      { error: "Failed to record backlog snapshot" },
      { status: 500 }
    );
  }
}
