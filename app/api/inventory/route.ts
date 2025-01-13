import { NextResponse } from "next/server";
import clientPromise from "../db/connect";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection(`inventory-${process.env.NODE_ENV}`);

    const inventory = await collection.find({}).toArray();
    return NextResponse.json(inventory);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection(`inventory-${process.env.NODE_ENV}`);

    const newItem = await request.json();
    const result = await collection.insertOne(newItem);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}
