import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Board } from "@/typings/types";
import { UpdateFilter } from "mongodb";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type PatchRequestBody = {
  boardId: string;
  updateData: UpdateFilter<Board> & {
    arrayFilters?: Array<Record<string, any>>;
  };
};

export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
  try {
    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Board>(process.env.NEXT_PUBLIC_MODE!);

    const body = await request.json();
    const { boardId, updateData } = body as PatchRequestBody;

    if (!boardId || !updateData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Extract arrayFilters if present
    const { arrayFilters, ...updateObj } = updateData;

    // Perform the update operation
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

export async function GET(): Promise<NextResponse<ApiResponse<Board | null>>> {
  try {
    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Board>(process.env.NEXT_PUBLIC_MODE!);

    const board = await collection.findOne({});
    return NextResponse.json({ data: board });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error connecting to database" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Board>>> {
  try {
    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Board>(process.env.NEXT_PUBLIC_MODE!);

    const data = (await request.json()) as Board;

    if (!data.id || !data.name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await collection.insertOne(data);

    if (!result.acknowledged) {
      throw new Error("Failed to insert board");
    }

    return NextResponse.json({ data: data }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error creating board" },
      { status: 500 }
    );
  }
}
