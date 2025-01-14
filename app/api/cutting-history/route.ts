import { NextResponse } from "next/server";
import { getDb } from "../db/connect";

export async function GET() {
  try {
    const db = await getDb();
    const collection = db.collection(
      `cuttingHistory-${process.env.NEXT_PUBLIC_MODE}`
    );

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
    const db = await getDb();
    const collection = db.collection(
      `cuttingHistory-${process.env.NEXT_PUBLIC_MODE}`
    );

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
