import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { getDb } from "@/app/api/db/connect";
import { laDayKey } from "@/lib/debt-metrics";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shares the planner's meta collection (see excluded-items).
const COLLECTION_NAME = "production-planning-meta";
const LEASE_ID_PREFIX = "nightly-auto-plan:";
const MONGO_DUPLICATE_KEY = 11000;
const HTTP_SERVER_ERROR = 500;
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

type LeaseDoc = {
  _id: string;
  dayKey: string;
  token: string;
  claimedAt: number;
};

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📥 POST — claim tonight's nightly auto-plan run                      ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Every open planner tab fires its 8pm timer; only the first to claim the LA
// day's lease runs auto-plan. The lease doc's _id is the day, so the insert
// is atomic (a concurrent second insert hits the unique _id) and the claim is
// idempotent for the rest of the day.
export async function POST() {
  const dayKey = laDayKey();
  const token = randomUUID();
  try {
    const db = await getDb();
    const collection = db.collection<LeaseDoc>(
      `${COLLECTION_NAME}-${process.env.NEXT_PUBLIC_MODE}`
    );
    const result = await collection.updateOne(
      { _id: `${LEASE_ID_PREFIX}${dayKey}` },
      { $setOnInsert: { dayKey, token, claimedAt: Date.now() } },
      { upsert: true }
    );
    return NextResponse.json(
      { claimed: result.upsertedCount === 1, dayKey },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    if ((error as { code?: number })?.code === MONGO_DUPLICATE_KEY) {
      return NextResponse.json(
        { claimed: false, dayKey },
        { headers: NO_STORE_HEADERS }
      );
    }
    console.error("Failed to claim nightly auto-plan lease", error);
    return NextResponse.json(
      { error: "Failed to claim nightly auto-plan" },
      { status: HTTP_SERVER_ERROR, headers: NO_STORE_HEADERS }
    );
  }
}
