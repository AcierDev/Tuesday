import { NextResponse } from "next/server";
import { Activity } from "@/typings/types";
import { ObjectId } from "mongodb";
import { getDb } from "../db/connect";

async function getCollection() {
  const db = await getDb();
  return db.collection<Activity>("activities");
}

export async function POST(request: Request) {
  try {
    const collection = await getCollection();
    const activity: Omit<Activity, "id" | "_id"> = await request.json();

    const activityWithId = {
      ...activity,
      _id: new ObjectId(),
      id: crypto.randomUUID(),
      timestamp: activity.timestamp || Date.now(),
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
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

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
