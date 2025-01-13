import { NextResponse } from "next/server";
import clientPromise from "../db/connect";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection("cutting-history");

    const history = await collection.find({}).toArray();
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch cutting history" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection("cutting-history");

    const data = await request.json();
    const result = await collection.updateOne(
      { date: data.date },
      { $set: data },
      { upsert: true }
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update cutting history" },
      { status: 500 }
    );
  }
}
