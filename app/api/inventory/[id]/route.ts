// app/api/inventory/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection(
      "inventory-" + process.env.NEXT_PUBLIC_MODE
    );

    const data = await request.json();
    const result = await collection.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: data }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error updating item" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection(
      "inventory-" + process.env.NEXT_PUBLIC_MODE
    );

    const result = await collection.deleteOne({
      _id: new ObjectId(params.id),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error deleting item" }, { status: 500 });
  }
}
