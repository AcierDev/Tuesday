import { NextResponse } from "next/server";
import clientPromise from "../db/connect";
import { laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import {
  recordTodayDebtSnapshot,
  DEBT_DB_NAME,
  DEBT_SNAPSHOTS_COLLECTION,
  type DebtSnapshot,
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
    const snapshot = await recordTodayDebtSnapshot();
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    console.error("Failed to record debt snapshot", error);
    return NextResponse.json(
      { error: "Failed to record debt snapshot" },
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
    const db = client.db(DEBT_DB_NAME);

    const todayKey = laDayKey();
    const earliestKey = shiftDayKey(todayKey, -(days - 1));

    // Single query: pull window rows plus one prior carry-forward seed.
    // `days + 1` covers the dense case (one snapshot per day in the window
    // + one prior); the sparse case fits comfortably within the same budget
    // since upserts dedupe to one row per date.
    const rowsDesc = await db
      .collection<DebtSnapshot>(DEBT_SNAPSHOTS_COLLECTION)
      .find({ date: { $lte: todayKey } })
      .sort({ date: -1 })
      .limit(days + 1)
      .toArray();

    const byDate = new Map<string, number>();
    let lastKnown = 0;
    for (const row of rowsDesc) {
      if (row.date >= earliestKey) {
        byDate.set(row.date, row.totalDebt);
      } else {
        // First row strictly before the window is our carry-forward seed —
        // rows are sorted desc, so the first hit is the most recent.
        lastKnown = row.totalDebt;
        break;
      }
    }

    const series: {
      date: string;
      totalDebt: number;
      recorded: boolean;
    }[] = [];
    for (let i = 0; i < days; i++) {
      const key = shiftDayKey(earliestKey, i);
      const recorded = byDate.has(key);
      if (recorded) lastKnown = byDate.get(key)!;
      series.push({ date: key, totalDebt: lastKnown, recorded });
    }

    return NextResponse.json(
      { series },
      { headers: { "Cache-Control": CACHE_CONTROL } }
    );
  } catch (error) {
    console.error("Failed to load debt snapshots", error);
    return NextResponse.json(
      { error: "Failed to load debt snapshots" },
      { status: 500 }
    );
  }
}
