import { NextResponse } from "next/server";
import clientPromise from "../db/connect";

const SETTINGS_COLLECTION = "settings";
const GLOBAL_SETTINGS_ID = "global";
const DEFAULT_DUE_BADGE_DAYS = 3;

type SharedSettings = {
  _id: string;
  dueBadgeDays: number;
};

async function getCollection() {
  const client = await clientPromise;
  return client.db("react-web-app").collection<SharedSettings>(SETTINGS_COLLECTION);
}

export async function GET() {
  try {
    const collection = await getCollection();
    let doc = await collection.findOne({ _id: GLOBAL_SETTINGS_ID });

    if (!doc) {
      const seed: SharedSettings = {
        _id: GLOBAL_SETTINGS_ID,
        dueBadgeDays: DEFAULT_DUE_BADGE_DAYS,
      };
      await collection.insertOne(seed);
      doc = seed;
    }

    return NextResponse.json({
      dueBadgeDays: doc.dueBadgeDays ?? DEFAULT_DUE_BADGE_DAYS,
    });
  } catch (error) {
    console.error("GET /api/settings failed:", error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const updates: Partial<Pick<SharedSettings, "dueBadgeDays">> = {};

    if (typeof body.dueBadgeDays === "number" && Number.isFinite(body.dueBadgeDays)) {
      updates.dueBadgeDays = Math.max(1, Math.min(365, Math.round(body.dueBadgeDays)));
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const collection = await getCollection();
    await collection.updateOne(
      { _id: GLOBAL_SETTINGS_ID },
      {
        $set: updates,
        $setOnInsert: { _id: GLOBAL_SETTINGS_ID },
      },
      { upsert: true }
    );

    const doc = await collection.findOne({ _id: GLOBAL_SETTINGS_ID });
    return NextResponse.json({
      dueBadgeDays: doc?.dueBadgeDays ?? DEFAULT_DUE_BADGE_DAYS,
    });
  } catch (error) {
    console.error("PATCH /api/settings failed:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
