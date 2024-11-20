import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import process from "node:process";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection(
      "cuttingHistory-" + process.env.NEXT_PUBLIC_MODE
    );

    const history = await collection.find({}).toArray();
    return NextResponse.json(history);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error connecting to database" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection(
      "cuttingHistory-" + process.env.NEXT_PUBLIC_MODE
    );

    const { date, count } = await request.json();

    // Use updateOne with upsert instead of insertOne to match the previous behavior
    const result = await collection.updateOne(
      { date },
      { $set: { count } },
      { upsert: true }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error connecting to database" },
      { status: 500 }
    );
  }
}
