import { NextRequest, NextResponse } from "next/server";
import process from "node:process";
import clientPromise from "../../db/connect";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

export async function GET(
  request: NextRequest,
  context: { params: { boardId: Promise<string> } }
) {
  try {
    // First await the entire params object
    const params = await context.params;
    const boardId = params.boardId;

    if (!boardId) {
      return NextResponse.json(
        { error: "Board ID is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection("boards-" + process.env.NEXT_PUBLIC_MODE);

    const board = await collection.findOne(
      { id: boardId },
      { projection: { weeklySchedules: 1 } }
    );

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: { weeklySchedules: board.weeklySchedules || {} },
    });
  } catch (error) {
    console.error("Error fetching weekly schedules:", error);
    return NextResponse.json(
      { error: "Error fetching weekly schedules" },
      { status: 500 }
    );
  }
}
