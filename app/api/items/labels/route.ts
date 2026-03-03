// app/api/items/labels/route.ts
import { NextRequest, NextResponse } from "next/server";
import process from "node:process";
import clientPromise from "../../db/connect";

export async function PATCH(request: NextRequest) {
  try {
    const { orderId, hasLabel, columnName } = await request.json();

    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection("boards-" + process.env.NEXT_PUBLIC_MODE);

    const result = await collection.updateOne(
      { "items_page.items.id": orderId },
      {
        $set: {
          "items_page.items.$[elem].values.$[val].text": hasLabel.toString(),
        },
      },
      {
        arrayFilters: [
          { "elem.id": orderId },
          { "val.columnName": columnName },
        ],
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "No changes made" }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Labels field updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating labels:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
