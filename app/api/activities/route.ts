import { NextResponse } from "next/server";
import { Activity } from "@/typings/types";
import { MongoClient, ObjectId } from "mongodb";

let cachedClient: MongoClient | null = null;

async function getMongoClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  cachedClient = client;
  return client;
}

async function getCollection() {
  const client = await getMongoClient();
  return client.db("react-web-app").collection<Activity>("activities");
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
