import { NextResponse } from "next/server";
import clientPromise from "../db/connect";
import { dayDiffKeys, laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import {
  recordTodayBacklogSnapshot,
  BACKLOG_DB_NAME,
  BACKLOG_SNAPSHOTS_COLLECTION,
  type BacklogSnapshot,
} from "./record-snapshot";
import { buildSnapshotSeries } from "../debt-snapshots/snapshot-helpers";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const DEFAULT_HISTORY_DAYS = 30;
const MAX_HISTORY_DAYS = 1825;
const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📥 POST — record today's snapshot if missing (cron overwrites)       ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export async function POST() {
  try {
    const snapshot = await recordTodayBacklogSnapshot();
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    console.error("Failed to record backlog snapshot", error);
    return NextResponse.json(
      { error: "Failed to record backlog snapshot" },
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
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const todayKey = laDayKey();

    let earliestKey: string;
    let latestKey: string;
    let days: number;
    if (startParam && endParam) {
      // Explicit calendar window. Clamp span to MAX_HISTORY_DAYS but
      // preserve absolute start/end.
      latestKey = endParam;
      const requestedDays = dayDiffKeys(startParam, endParam) + 1;
      days = Math.min(Math.max(requestedDays, 1), MAX_HISTORY_DAYS);
      earliestKey = shiftDayKey(latestKey, -(days - 1));
    } else {
      const requested = parseInt(
        searchParams.get("days") || `${DEFAULT_HISTORY_DAYS}`,
        10
      );
      days = Math.min(Math.max(requested, 1), MAX_HISTORY_DAYS);
      latestKey = todayKey;
      earliestKey = shiftDayKey(latestKey, -(days - 1));
    }

    const client = await clientPromise;
    const db = client.db(BACKLOG_DB_NAME);

    const rowsDesc = await db
      .collection<BacklogSnapshot>(BACKLOG_SNAPSHOTS_COLLECTION)
      .find(
        { date: { $lte: latestKey } },
        { projection: { _id: 0, date: 1, squares: 1 } }
      )
      .sort({ date: -1 })
      .limit(days + 1)
      .toArray();

    // Days before the first-ever snapshot come back as squares: null.
    const series: {
      date: string;
      squares: number | null;
      recorded: boolean;
    }[] = buildSnapshotSeries(
      rowsDesc,
      earliestKey,
      days,
      (row) => row.squares
    ).map(({ date, value, recorded }) => ({ date, squares: value, recorded }));

    return NextResponse.json(
      { series },
      { headers: { "Cache-Control": CACHE_CONTROL } }
    );
  } catch (error) {
    console.error("Failed to load backlog snapshots", error);
    return NextResponse.json(
      { error: "Failed to load backlog snapshots" },
      { status: 500 }
    );
  }
}
