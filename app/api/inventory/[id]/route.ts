import { NextResponse } from "next/server";
import clientPromise from "../../db/connect";
import { ObjectId } from "mongodb";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection(`inventory-${process.env.NODE_ENV}`);

    const updates = await request.json();
    const result = await collection.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: updates }
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection(`inventory-${process.env.NODE_ENV}`);

    const result = await collection.deleteOne({ _id: new ObjectId(params.id) });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
