import { NextResponse } from "next/server";
import clientPromise from "../db/connect";
import { Item } from "@/typings/types";
import { ItemStatus } from "@/typings/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDone = searchParams.get("includeDone") === "true";
    const includeHidden = searchParams.get("includeHidden") === "true";
    const status = searchParams.get("status") || "";

    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Item>(
      `items-${process.env.NEXT_PUBLIC_MODE}`
    );

    const filter: any = { visible: true, deleted: false };

    if (!status) {
      const excludeStatuses = [];
      if (!includeDone) {
        excludeStatuses.push("Done");
      }
      if (!includeHidden) {
        excludeStatuses.push("Hidden");
      }

      if (excludeStatuses.length > 0) {
        filter.status = { $nin: excludeStatuses };
      }
    } else {
      filter.status = status;
    }

    const items = await collection.find(filter).toArray();
    return NextResponse.json(items);
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
    const collection = db.collection<Item>(
      `items-${process.env.NEXT_PUBLIC_MODE}`
    );

    const { id, updates } = await request.json();

    // Update the item with the given id
    const result = await collection.updateOne(
      { id },
      { $set: updates },
      { upsert: true }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}
