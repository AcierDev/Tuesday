// app/api/board/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Board } from "@/typings/types";
import { UpdateFilter } from "mongodb";
import process from "node:process";
import clientPromise from "../db/connect";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

export async function GET(): Promise<NextResponse<ApiResponse<Board>>> {
  try {
    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Board>(
      "boards-" + process.env.NEXT_PUBLIC_MODE!
    );

    const boards = await collection.find({}).toArray();

    return NextResponse.json({
      data: boards[0],
    });
  } catch (error) {
    console.error("Error fetching boards:", error);
    return NextResponse.json(
      { error: "Error fetching boards" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Board>>> {
  try {
    const data = (await request.json()) as Board;

    if (!data.id || !data.name) {
      return NextResponse.json(
        { error: "Missing required fields: id and name" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Board>(
      "boards-" + process.env.NEXT_PUBLIC_MODE!
    );

    const result = await collection.insertOne(data);

    if (!result.acknowledged) {
      throw new Error("Failed to insert board");
    }

    return NextResponse.json({ data: data });
  } catch (error) {
    console.error("Error creating board:", error);
    return NextResponse.json(
      { error: "Error creating board" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
  try {
    const body = await request.json();
    const { boardId, updateData } = body as {
      boardId: string;
      updateData: UpdateFilter<Board> & {
        arrayFilters?: Array<Record<string, any>>;
      };
    };

    if (!boardId || !updateData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Board>(
      "boards-" + process.env.NEXT_PUBLIC_MODE!
    );

    const { arrayFilters, ...updateObj } = updateData;
    const result = arrayFilters
      ? await collection.updateOne({ id: boardId }, updateObj, { arrayFilters })
      : await collection.updateOne({ id: boardId }, updateObj);

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Error updating board:", error);
    return NextResponse.json(
      { error: "Error updating board" },
      { status: 500 }
    );
  }
}
