import { NextResponse } from "next/server";
import clientPromise from "../db/connect";
import { Item } from "@/typings/types";
import { ItemStatus } from "@/typings/types";

// CORS headers helper function
function getCorsHeaders() {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "https://www.etsy.com");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return headers;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDone = searchParams.get("includeDone") === "true" || false;
    const includeHidden = searchParams.get("includeHidden") === "true" || false;
    const status = searchParams.get("status") || "";
    const limit = parseInt(searchParams.get("limit") || "0", 10); // 0 means no limit (backward compatibility if needed, but we should default to 50 for safety if client doesn't specify, OR only limit if specified)
    // Actually, for backward compatibility with existing calls that expect everything, let's default to 0 (no limit) unless specified.
    // The plan says "default 50". But existing calls might break if I impose a limit they don't expect.
    // "Done" loading currently fetches EVERYTHING.
    // "loadItems" fetches everything except Done/Hidden.
    // To be safe, I will default to 0 (all) but allow client to specify limit.
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";

    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Item>(
      `items-${process.env.NEXT_PUBLIC_MODE}`
    );

    const filter: any = { visible: true, deleted: false };

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      filter.$or = [
        { customerName: searchRegex },
        { design: searchRegex },
        { size: searchRegex },
        { notes: searchRegex },
        { id: searchRegex } // Allow searching by ID
      ];
    }

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

    let cursor = collection.find(filter);

    // Sort by completedAt for Done items, otherwise by index or createdAt
    if (status === "Done") {
      cursor = cursor.sort({ completedAt: -1 });
    } else {
      cursor = cursor.sort({ index: 1, createdAt: -1 });
    }

    if (offset > 0) {
      cursor = cursor.skip(offset);
    }
    if (limit > 0) {
      cursor = cursor.limit(limit);
    }

    const items = await cursor.toArray();
    return NextResponse.json(items, { headers: getCorsHeaders() });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch board" },
      { status: 500, headers: getCorsHeaders() }
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

    const { _id, ...updatesWithoutId } = updates;

    // Update the item with the given id
    const result = await collection.updateOne(
      { id },
      { $set: updatesWithoutId },
      { upsert: true }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    return NextResponse.json(result, { headers: getCorsHeaders() });
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Item>(
      `items-${process.env.NEXT_PUBLIC_MODE}`
    );

    const newItem = await request.json();
    const result = await collection.insertOne(newItem);

    if (!result.acknowledged) {
      return NextResponse.json(
        { error: "Failed to add item" },
        { status: 500, headers: getCorsHeaders() }
      );
    }

    return NextResponse.json(newItem, { headers: getCorsHeaders() });
  } catch (error) {
    console.error("Error adding item:", error);
    return NextResponse.json(
      { error: "Failed to add item" },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

// Handle preflight OPTIONS requests
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(),
  });
}
