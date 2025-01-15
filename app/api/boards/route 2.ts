import { NextResponse } from "next/server";
import clientPromise from "../db/connect";
import { Board } from "@/typings/types";

export async function GET() {
  console.log("[GET] /api/boards - Starting request");
  try {
    const client = await clientPromise;
    console.log("[GET] /api/boards - Connected to MongoDB");

    const db = client.db("react-web-app");
    const collection = db.collection<Board>(`${process.env.NEXT_PUBLIC_MODE}`);
    console.log(
      `[GET] /api/boards - Using collection: ${process.env.NEXT_PUBLIC_MODE}`
    );

    const board = await collection.findOne({});
    console.log("[GET] /api/boards - Found board:", board ? "yes" : "no");

    return NextResponse.json(board);
  } catch (error) {
    console.error("[GET] /api/boards - Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch board" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  console.log("[PATCH] /api/boards - Starting request");
  try {
    const client = await clientPromise;
    console.log("[PATCH] /api/boards - Connected to MongoDB");

    const db = client.db("react-web-app");
    const collection = db.collection<Board>(`${process.env.NEXT_PUBLIC_MODE}`);
    console.log(
      `[PATCH] /api/boards - Using collection: ${process.env.NEXT_PUBLIC_MODE}`
    );

    const { id, updates, arrayFilters } = await request.json();
    console.log("[PATCH] /api/boards - Request payload:", {
      id,
      updates,
      arrayFilters,
    });

    // If arrayFilters is provided, use it in the update operation
    const updateOptions = arrayFilters ? { arrayFilters } : undefined;

    const result = await collection.updateOne(
      { id },
      { $set: updates },
      updateOptions
    );

    console.log("[PATCH] /api/boards - Update result:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[PATCH] /api/boards - Error:", error);
    return NextResponse.json(
      { error: "Failed to update board" },
      { status: 500 }
    );
  }
}
