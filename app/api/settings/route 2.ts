import { NextResponse } from "next/server";
import clientPromise from "../db/connect";
import { Settings } from "@/typings/types";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Settings>(
      `settings-${process.env.NODE_ENV}`
    );

    const settings = await collection.findOne({});
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Settings>(
      `settings-${process.env.NODE_ENV}`
    );

    const updates = await request.json();
    const result = await collection.updateOne(
      {}, // Update the single settings document
      { $set: updates },
      { upsert: true }
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
