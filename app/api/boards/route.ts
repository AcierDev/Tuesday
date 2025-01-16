import { NextResponse } from "next/server";
import clientPromise from "../db/connect";
import { Board } from "@/typings/types";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Board>(`${process.env.NEXT_PUBLIC_MODE}`);
    const board = await collection.findOne({});
    return NextResponse.json(board);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch board" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    console.debug("PATCH request received");

    const client = await clientPromise;

    const db = client.db("react-web-app");
    const collection = db.collection<Board>(`${process.env.NEXT_PUBLIC_MODE}`);

    const { id, updates, arrayFilters } = await request.json();

    // If arrayFilters is provided, use it in the update operation
    const updateOptions = arrayFilters ? { arrayFilters } : undefined;

    const result = await collection.updateOne(
      { id },
      { $set: updates },
      updateOptions
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating board:", error);
    return NextResponse.json(
      { error: "Failed to update board" },
      { status: 500 }
    );
  }
}
