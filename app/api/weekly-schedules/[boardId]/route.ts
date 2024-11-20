// app/api/weekly-schedules/[boardId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: { boardId: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection("boards-" + process.env.NEXT_PUBLIC_MODE);

    const board = await collection.findOne(
      { id: params.boardId },
      { projection: { weeklySchedules: 1 } }
    );

    return NextResponse.json({ weeklySchedules: board?.weeklySchedules || {} });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error fetching weekly schedules" },
      { status: 500 }
    );
  }
}
