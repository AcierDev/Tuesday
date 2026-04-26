import { NextResponse } from "next/server";
import clientPromise from "../db/connect";
import { laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import {
  recordTodayHealthSnapshot,
  HEALTH_DB_NAME,
  HEALTH_SNAPSHOTS_COLLECTION,
  type HealthSnapshot,
} from "./record-snapshot";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const DEFAULT_HISTORY_DAYS = 30;
const MAX_HISTORY_DAYS = 1825;
const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📥 POST — record today's snapshot (idempotent)                       ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export async function POST() {
  try {
    const snapshot = await recordTodayHealthSnapshot();
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    console.error("Failed to record health snapshot", error);
    return NextResponse.json(
      { error: "Failed to record health snapshot" },
      { status: 500 }
    );
  }
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📤 GET — return last N days, carrying forward across gaps            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requested = parseInt(
      searchParams.get("days") || `${DEFAULT_HISTORY_DAYS}`,
      10
    );
    const days = Math.min(Math.max(requested, 1), MAX_HISTORY_DAYS);

    const client = await clientPromise;
    const db = client.db(HEALTH_DB_NAME);

    const todayKey = laDayKey();
    const earliestKey = shiftDayKey(todayKey, -(days - 1));

    const rowsDesc = await db
      .collection<HealthSnapshot>(HEALTH_SNAPSHOTS_COLLECTION)
      .find({ date: { $lte: todayKey } })
      .sort({ date: -1 })
      .limit(days + 1)
      .toArray();

    const byDate = new Map<string, number>();
    let lastKnown: number | null = null;
    for (const row of rowsDesc) {
      if (row.date >= earliestKey) {
        byDate.set(row.date, row.score);
      } else {
        lastKnown = row.score;
        break;
      }
    }

    const series: { date: string; score: number; recorded: boolean }[] = [];
    for (let i = 0; i < days; i++) {
      const key = shiftDayKey(earliestKey, i);
      const recorded = byDate.has(key);
      if (recorded) lastKnown = byDate.get(key)!;
      series.push({ date: key, score: lastKnown ?? 0, recorded });
    }

    return NextResponse.json(
      { series },
      { headers: { "Cache-Control": CACHE_CONTROL } }
    );
  } catch (error) {
    console.error("Failed to load health snapshots", error);
    return NextResponse.json(
      { error: "Failed to load health snapshots" },
      { status: 500 }
    );
  }
}
