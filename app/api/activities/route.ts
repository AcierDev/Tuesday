import { NextResponse } from "next/server";
import { Activity } from "@/typings/types";
import { ObjectId } from "mongodb";
import { getDb } from "../db/connect";
import {
  ACTIVITIES_DEFAULT_LIMIT,
  ACTIVITIES_MAX_LIMIT,
  ACTIVITIES_MAX_SKIP,
  ACTIVITY_MAX_BODY_BYTES,
  clampedInteger,
  parseActivityInput,
} from "./validate";

const HTTP_BAD_REQUEST = 400;
const HTTP_PAYLOAD_TOO_LARGE = 413;
const MIN_LIMIT = 1;
const MIN_SKIP = 0;

async function getCollection() {
  const db = await getDb();
  return db.collection<Omit<Activity, "_id"> & { _id: ObjectId }>(
    `activities-${process.env.NEXT_PUBLIC_MODE}`
  );
}

export async function POST(request: Request) {
  try {
    const tooLarge = Number(request.headers.get("content-length")) > ACTIVITY_MAX_BODY_BYTES;
    const body = tooLarge ? "" : await request.text();
    if (tooLarge || new TextEncoder().encode(body).byteLength > ACTIVITY_MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Activity is too large" }, { status: HTTP_PAYLOAD_TOO_LARGE });
    }
    let activity: ReturnType<typeof parseActivityInput>;
    try {
      activity = parseActivityInput(JSON.parse(body));
    } catch {
      activity = null;
    }
    if (!activity) {
      return NextResponse.json({ error: "Invalid activity" }, { status: HTTP_BAD_REQUEST });
    }

    const collection = await getCollection();
    // The server sets the time so clients cannot backdate or reorder history.
    const activityWithId = {
      ...activity,
      _id: new ObjectId(),
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    await collection.insertOne(activityWithId);
    return NextResponse.json({ success: true, activity: activityWithId });
  } catch (error) {
    console.error("Failed to save activity:", error);
    return NextResponse.json(
      { error: "Failed to save activity" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");
    const limit = clampedInteger(searchParams.get("limit"), ACTIVITIES_DEFAULT_LIMIT, MIN_LIMIT, ACTIVITIES_MAX_LIMIT);
    const skip = clampedInteger(searchParams.get("skip"), MIN_SKIP, MIN_SKIP, ACTIVITIES_MAX_SKIP);

    const collection = await getCollection();
    const query = itemId ? { itemId } : {};

    const pipeline = [
      { $match: query },
      { $sort: { timestamp: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const activities = await collection.aggregate(pipeline).toArray();
    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Failed to fetch activities:", error);
    const errorMessage =
      process.env.NODE_ENV === "development"
        ? `Failed to fetch activities: ${
            error instanceof Error ? error.message : String(error)
          }`
        : "Failed to fetch activities";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
