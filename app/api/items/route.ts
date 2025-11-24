import { NextResponse } from "next/server";
import clientPromise from "../db/connect";
import {
  Item,
  ColumnTitles,
  ActivityChange,
  ActivityType,
} from "@/typings/types";
import { ItemStatus } from "@/typings/types";
import { logActivity } from "../activities/log";

// CORS headers helper function
function getCorsHeaders(requestOrigin?: string) {
  const headers = new Headers();
  
  const allowedOrigins = [
    "https://www.etsy.com",
    "https://etsy.com",
    "chrome-extension://", // Allow chrome extensions if needed, though usually they send origin as the page they are on
  ];

  // Check if the request origin matches any allowed origin
  if (requestOrigin) {
    if (allowedOrigins.some(origin => requestOrigin.startsWith(origin))) {
      headers.set("Access-Control-Allow-Origin", requestOrigin);
    }
  } else {
    // Fallback default
    headers.set("Access-Control-Allow-Origin", "https://www.etsy.com");
  }

  headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return headers;
}

const FIELD_TO_COLUMN_TITLE: Record<string, ColumnTitles> = {
  customerName: ColumnTitles.Customer_Name,
  dueDate: ColumnTitles.Due,
  design: ColumnTitles.Design,
  size: ColumnTitles.Size,
  painted: ColumnTitles.Painted,
  backboard: ColumnTitles.Backboard,
  glued: ColumnTitles.Glued,
  packaging: ColumnTitles.Packaging,
  boxes: ColumnTitles.Boxes,
  notes: ColumnTitles.Notes,
  rating: ColumnTitles.Rating,
  shipping: ColumnTitles.Shipping,
  labels: ColumnTitles.Labels,
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDone = searchParams.get("includeDone") === "true" || false;
    const includeHidden = searchParams.get("includeHidden") === "true" || false;
    const status = searchParams.get("status") || "";
    const limit = parseInt(searchParams.get("limit") || "0", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";
    const ids = searchParams.get("ids");

    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Item>(
      `items-${process.env.NEXT_PUBLIC_MODE}`
    );

    const filter: any = { visible: true, deleted: false };

    if (ids) {
      // If IDs are provided, fetch specific items regardless of other filters
      // except visible/deleted which are base filters
      const idList = ids.split(",").filter(Boolean);
      if (idList.length > 0) {
        filter.id = { $in: idList };
      }
    } else {
      // Standard filtering logic
      if (search) {
        const searchRegex = { $regex: search, $options: "i" };
        filter.$or = [
          { customerName: searchRegex },
          { design: searchRegex },
          { size: searchRegex },
          { notes: searchRegex },
          { id: searchRegex }, // Allow searching by ID
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
    const origin = request.headers.get("origin") || undefined;
    return NextResponse.json(items, { headers: getCorsHeaders(origin) });
  } catch (error) {
    const origin = request.headers.get("origin") || undefined;
    return NextResponse.json(
      { error: "Failed to fetch board" },
      { status: 500, headers: getCorsHeaders(origin) }
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

    const { id, updates, user } = await request.json();
    const { _id, ...updatesWithoutId } = updates;

    // Fetch the item before updating to compare changes
    const currentItem = await collection.findOne({ id });

    if (!currentItem) {
      const origin = request.headers.get("origin") || undefined;
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404, headers: getCorsHeaders(origin) }
      );
    }

    // Update the item with the given id
    const result = await collection.updateOne(
      { id },
      { $set: updatesWithoutId },
      { upsert: true }
    );

    if (result.matchedCount === 0) {
      // Should have been caught by findOne check, but just in case
      const origin = request.headers.get("origin") || undefined;
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404, headers: getCorsHeaders(origin) }
      );
    }

    // Determine changes and log activity
    const changes: ActivityChange[] = [];
    let activityType: ActivityType = "update";
    let isRestore = false;

    // Check for status change
    if (
      updatesWithoutId.status &&
      updatesWithoutId.status !== currentItem.status
    ) {
      activityType = "status_change";
      // Check if it's a restore (heuristic: if passed explicitly or based on context, but here we just check field)
      // The frontend logic for restore sets status back. We'll just log it as status_change unless 'isRestore' flag was passed in updates?
      // The plan said "Compute differences".
      // Frontend passes `isRestore` in manual logging, but here we just see status change.
      // We can check if previousStatus is being used (not standard field) or just infer.
      // Let's stick to simple comparison.
      changes.push({
        field: "status",
        oldValue: currentItem.status,
        newValue: updatesWithoutId.status,
      });
    }

    // Check for deletion change
    if (
      updatesWithoutId.deleted !== undefined &&
      updatesWithoutId.deleted !== currentItem.deleted
    ) {
      if (updatesWithoutId.deleted) {
        activityType = "delete";
        changes.push({
          field: "deleted",
          oldValue: "false",
          newValue: "true",
        });
      } else {
        activityType = "restore";
        isRestore = true;
        changes.push({
          field: "deleted",
          oldValue: "true",
          newValue: "false",
          isRestore: true,
        });
      }
    }

    // Check for other field changes
    Object.keys(updatesWithoutId).forEach((key) => {
      if (
        key === "status" ||
        key === "deleted" ||
        key === "completedAt" ||
        key === "previousStatus"
      )
        return;

      const oldValue = (currentItem as any)[key];
      const newValue = (updatesWithoutId as any)[key];

      // Simple equality check
      if (oldValue !== newValue) {
        // Only log if it maps to a known column title
        const columnTitle = FIELD_TO_COLUMN_TITLE[key];
        if (columnTitle) {
          changes.push({
            field: columnTitle,
            oldValue: String(oldValue || ""),
            newValue: String(newValue || ""),
          });
        }
      }
    });

    if (changes.length > 0) {
      // Allow overriding activity type if it's a restore of status (not handled explicitly above but valid)
      // If mixed changes, "update" is safe default if not status/delete.
      // If status changed, we prefer "status_change".
      // If deleted changed, we prefer "delete" or "restore".

      // Prioritize delete/restore/status_change over generic update
      // Already set above.

      await logActivity(db, {
        itemId: id,
        type: activityType,
        changes,
        userName: user, // Passed from client
        metadata: {
          customerName:
            updatesWithoutId.customerName || currentItem.customerName,
          design: updatesWithoutId.design || currentItem.design,
          size: updatesWithoutId.size || currentItem.size,
        },
      });
    }

    const origin = request.headers.get("origin") || undefined;
    return NextResponse.json(result, { headers: getCorsHeaders(origin) });
  } catch (error) {
    console.error("Error updating item:", error);
    const origin = request.headers.get("origin") || undefined;
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500, headers: getCorsHeaders(origin) }
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

    const body = await request.json();
    const { user, ...newItemData } = body;
    const newItem = newItemData as Item;

    const result = await collection.insertOne(newItem);

    if (!result.acknowledged) {
      const origin = request.headers.get("origin") || undefined;
      return NextResponse.json(
        { error: "Failed to add item" },
        { status: 500, headers: getCorsHeaders(origin) }
      );
    }

    // Log creation activity
    if (newItem.id) {
      await logActivity(db, {
        itemId: newItem.id,
        type: "create",
        changes: [
          {
            field: "status",
            oldValue: "",
            newValue: newItem.status || ItemStatus.New,
          },
        ],
        userName: user,
        metadata: {
          customerName: newItem.customerName,
          design: newItem.design,
          size: newItem.size,
        },
      });
    }

    const origin = request.headers.get("origin") || undefined;
    return NextResponse.json(newItem, { headers: getCorsHeaders(origin) });
  } catch (error) {
    console.error("Error adding item:", error);
    const origin = request.headers.get("origin") || undefined;
    return NextResponse.json(
      { error: "Failed to add item" },
      { status: 500, headers: getCorsHeaders(origin) }
    );
  }
}

// Handle preflight OPTIONS requests
export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") || undefined;
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(origin),
  });
}
