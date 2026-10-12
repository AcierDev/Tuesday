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
import {
  getEffectiveDueDateKey,
  hasStoredDueDatePauseOffset,
  pauseDueDate,
} from "@/lib/due-date-pause";
import { prepareItemPatchHistory, prepareNewItemHistory } from "@/lib/reporting/item-history";
import {
  ensureCompletionEventIndex,
  recordCompletionEvent,
} from "@/lib/reporting/completion-events-server";

import {
  DEFAULT_ETSY_QUANTITY_INDEX,
  etsyOrderIdentityFilter,
  isPlainRecord,
  mergeOrderShippingPatch,
  normalizeOrderShippingInput,
  OrderShippingValidationError,
  OrderShippingConflictError,
  type ShippingUpdateMode,
} from "@/lib/order-shipping-patch";

const BAD_REQUEST_STATUS = 400;
const CONFLICT_STATUS = 409;
const MONGO_DUPLICATE_KEY_CODE = 11000;
const ASCENDING_INDEX_DIRECTION = 1;
const ETSY_ORDER_UNIQUE_INDEX = "etsy_order_receipt_transaction_quantity_unique";

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
  labels: ColumnTitles.Labels,
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDone = searchParams.get("includeDone") === "true" || false;
    const includeHidden = searchParams.get("includeHidden") === "true" || false;
    const deletedOnly = searchParams.get("deletedOnly") === "true";
    const status = searchParams.get("status") || "";
    const limit = parseInt(searchParams.get("limit") || "0", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";
    const ids = searchParams.get("ids");
    const fields = searchParams.get("fields") || "";
    let etsyFilter: Record<string, unknown> | undefined;
    if (["etsyReceiptId", "etsyTransactionId", "etsyQuantityIndex"].some(field => searchParams.has(field))) {
      const receiptId = searchParams.get("etsyReceiptId");
      const transactionId = searchParams.get("etsyTransactionId");
      const quantityParam = searchParams.get("etsyQuantityIndex");
      if (!receiptId || !transactionId || (quantityParam !== null && !/^\d+$/.test(quantityParam))) {
        throw new OrderShippingValidationError("Valid Etsy receipt and transaction IDs are required; quantity must be a positive integer");
      }
      const lookup = normalizeOrderShippingInput({ etsyOrder: {
        receiptId,
        transactionId,
        quantityIndex: quantityParam === null ? DEFAULT_ETSY_QUANTITY_INDEX : Number(quantityParam),
      } });
      etsyFilter = etsyOrderIdentityFilter(lookup.etsyOrder!);
    }

    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Item>(
      `items-${process.env.NEXT_PUBLIC_MODE}`
    );

    const filter: any = deletedOnly
      ? { deleted: true }
      : { visible: true, deleted: false };

    if (ids) {
      // If IDs are provided, fetch specific items regardless of other filters
      // except visible/deleted which are base filters
      const idList = ids.split(",").filter(Boolean);
      if (idList.length > 0) {
        filter.id = { $in: idList };
      }
    } else if (deletedOnly) {
      // Deleted view: show every deleted item regardless of status.
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

    if (etsyFilter) filter.$and = [etsyFilter];

    const findOptions: { projection?: Record<string, 1> } = {};
    if (fields) {
      const projection: Record<string, 1> = {};
      for (const f of fields.split(",").map((s) => s.trim()).filter(Boolean)) {
        projection[f] = 1;
      }
      // Always include id so callers can identify rows
      projection.id = 1;
      findOptions.projection = projection;
    }

    let cursor = collection.find(filter, findOptions);

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

    // Lazily initialize the fixed days-remaining offset for held records that
    // predate due-date pausing. This makes an existing hold start behaving as
    // a true pause the first time the upgraded app reads it.
    const itemsForResponse = await Promise.all(
      items.map(async (item) => {
        let normalized = item;
        if (item.onHold && !hasStoredDueDatePauseOffset(item)) {
          const migrated = pauseDueDate(item);
          const migratedOffset = migrated.dueDatePauseOffsetDays;
          if (
            typeof migratedOffset === "number" &&
            Number.isFinite(migratedOffset)
          ) {
            await collection.updateOne(
              { id: item.id, onHold: true },
              {
                $set: {
                  dueDatePauseOffsetDays: migratedOffset,
                },
              }
            );
            normalized = {
              ...item,
              dueDatePauseOffsetDays: migratedOffset,
            };
          }
        }

        const effectiveDueDate = getEffectiveDueDateKey(normalized);
        return effectiveDueDate && effectiveDueDate !== normalized.dueDate
          ? { ...normalized, dueDate: effectiveDueDate }
          : normalized;
      })
    );
    const origin = request.headers.get("origin") || undefined;
    return NextResponse.json(itemsForResponse, {
      headers: getCorsHeaders(origin),
    });
  } catch (error) {
    const origin = request.headers.get("origin") || undefined;
    return NextResponse.json(
      { error: error instanceof OrderShippingValidationError ? error.message : "Failed to fetch board" },
      { status: error instanceof OrderShippingValidationError ? BAD_REQUEST_STATUS : 500, headers: getCorsHeaders(origin) }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isPlainRecord(body) || typeof body.id !== "string" || !body.id.trim() || !isPlainRecord(body.updates)) {
      throw new OrderShippingValidationError("An item id and updates object are required");
    }
    if (body.shippingUpdateMode !== undefined && body.shippingUpdateMode !== "merge" && body.shippingUpdateMode !== "fillMissing") {
      throw new OrderShippingValidationError("shippingUpdateMode must be merge or fillMissing");
    }
    if (body.requireEtsyLinkMatch !== undefined && typeof body.requireEtsyLinkMatch !== "boolean") {
      throw new OrderShippingValidationError("requireEtsyLinkMatch must be a boolean");
    }
    const id = body.id;
    const requireEtsyLinkMatch = body.requireEtsyLinkMatch === true;
    const shippingUpdateMode = body.shippingUpdateMode as ShippingUpdateMode | undefined;
    const { _id, ...updatesWithoutId } = normalizeOrderShippingInput(body.updates) as Partial<Item> & { _id?: unknown };
    if (requireEtsyLinkMatch && (shippingUpdateMode !== "fillMissing" ||
      !updatesWithoutId.etsyOrder?.receiptId || !updatesWithoutId.etsyOrder.transactionId)) {
      throw new OrderShippingValidationError("requireEtsyLinkMatch requires fillMissing and complete incoming Etsy receipt and transaction IDs");
    }

    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Item>(
      `items-${process.env.NEXT_PUBLIC_MODE}`
    );

    // Stamp deletedAt when soft-deleting so the /deleted view can bucket by
    // age. Clear it on restore.
    if (updatesWithoutId.deleted === true && !updatesWithoutId.deletedAt) {
      updatesWithoutId.deletedAt = Date.now();
    } else if (updatesWithoutId.deleted === false) {
      updatesWithoutId.deletedAt = null;
    }

    if (updatesWithoutId.status === ItemStatus.Done) {
      await ensureCompletionEventIndex(db);
    }

    const session = client.startSession();
    let transactionResult: {
      currentItem: Item;
      updatesWithHistory: Partial<Item>;
    } | null = null;
    try {
      transactionResult = await session.withTransaction(async () => {
        const currentItem = await collection.findOne({ id }, { session });
        if (!currentItem) return null;

        const updatesWithHistory = prepareItemPatchHistory(
          currentItem,
          mergeOrderShippingPatch(currentItem, updatesWithoutId, shippingUpdateMode, requireEtsyLinkMatch),
          Date.now()
        );
        await collection.updateOne(
          { _id: currentItem._id },
          { $set: updatesWithHistory },
          { session }
        );

        if (currentItem.status !== ItemStatus.Done &&
          updatesWithHistory.status === ItemStatus.Done &&
          typeof updatesWithHistory.completedAt === "number") {
          const completedItem = { ...currentItem, ...updatesWithHistory } as Item;
          await recordCompletionEvent(
            db,
            completedItem,
            updatesWithHistory.completedAt,
            updatesWithHistory.dueDateAtCompletion,
            session
          );
        }

        return { currentItem, updatesWithHistory };
      });
    } finally {
      await session.endSession();
    }

    if (!transactionResult) {
      const origin = request.headers.get("origin") || undefined;
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404, headers: getCorsHeaders(origin) }
      );
    }

    const { currentItem, updatesWithHistory } = transactionResult;

    const result = {
      matchedCount: 1,
      modifiedCount: 1,
      ...(Object.hasOwn(updatesWithHistory, "shippingDetails") ? { shippingDetails: updatesWithHistory.shippingDetails } : {}),
      ...(Object.hasOwn(updatesWithHistory, "etsyOrder") ? { etsyOrder: updatesWithHistory.etsyOrder } : {}),
    };

    // Determine changes and log activity
    const changes: ActivityChange[] = [];
    let activityType: ActivityType = "update";

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
    if (error instanceof OrderShippingValidationError || error instanceof SyntaxError) {
      const origin = request.headers.get("origin") || undefined;
      return NextResponse.json({ error: error.message }, { status: BAD_REQUEST_STATUS, headers: getCorsHeaders(origin) });
    }
    if (error instanceof OrderShippingConflictError) {
      const origin = request.headers.get("origin") || undefined;
      return NextResponse.json({ error: error.message }, { status: CONFLICT_STATUS, headers: getCorsHeaders(origin) });
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === MONGO_DUPLICATE_KEY_CODE) {
      const origin = request.headers.get("origin") || undefined;
      return NextResponse.json({ error: "This Etsy quantity unit already belongs to another item" }, { status: CONFLICT_STATUS, headers: getCorsHeaders(origin) });
    }
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
    const body: unknown = await request.json();
    if (!isPlainRecord(body)) throw new OrderShippingValidationError("An item object is required");
    const newItem = prepareNewItemHistory(normalizeOrderShippingInput(body) as Item);
    if (newItem.etsyOrder?.receiptId && newItem.etsyOrder.transactionId && newItem.etsyOrder.quantityIndex === undefined) {
      newItem.etsyOrder.quantityIndex = DEFAULT_ETSY_QUANTITY_INDEX;
    }

    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<Item>(
      `items-${process.env.NEXT_PUBLIC_MODE}`
    );

    const confirmedEtsyIds = newItem.etsyOrder?.receiptId && newItem.etsyOrder?.transactionId
      ? etsyOrderIdentityFilter(newItem.etsyOrder)
      : null;
    if (confirmedEtsyIds) {
      // Legacy links without an ordinal represent the first quantity unit.
      const existing = await collection.findOne(confirmedEtsyIds);
      if (existing) {
        const origin = request.headers.get("origin") || undefined;
        return NextResponse.json({ error: "This Etsy quantity unit already belongs to an item", id: existing.id }, {
          status: CONFLICT_STATUS, headers: getCorsHeaders(origin),
        });
      }
    }
    let result;
    let duplicateProtectionReady = false;
    try {
      if (confirmedEtsyIds) {
        // Partial compound uniqueness permits receipt-only legacy orders and multiple items per receipt.
        await collection.createIndex(
          { "etsyOrder.receiptId": ASCENDING_INDEX_DIRECTION, "etsyOrder.transactionId": ASCENDING_INDEX_DIRECTION, "etsyOrder.quantityIndex": ASCENDING_INDEX_DIRECTION },
          {
            name: ETSY_ORDER_UNIQUE_INDEX,
            unique: true,
            partialFilterExpression: {
              "etsyOrder.receiptId": { $type: "string", $gt: "" },
              "etsyOrder.transactionId": { $type: "string", $gt: "" },
              "etsyOrder.quantityIndex": { $type: "number", $gte: DEFAULT_ETSY_QUANTITY_INDEX },
            },
          }
        );
      }
      duplicateProtectionReady = true;
      result = await collection.insertOne(newItem);
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === MONGO_DUPLICATE_KEY_CODE) {
        const existing = confirmedEtsyIds ? await collection.findOne(confirmedEtsyIds) : null;
        const origin = request.headers.get("origin") || undefined;
        return NextResponse.json({
          error: duplicateProtectionReady
            ? "This Etsy quantity unit already belongs to an item"
            : "Existing duplicate Etsy IDs prevent enabling duplicate protection; no item was added",
          ...(existing ? { id: existing.id } : {}),
        }, { status: CONFLICT_STATUS, headers: getCorsHeaders(origin) });
      }
      throw error;
    }

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
    if (error instanceof OrderShippingValidationError || error instanceof SyntaxError) {
      const origin = request.headers.get("origin") || undefined;
      return NextResponse.json({ error: error.message }, { status: BAD_REQUEST_STATUS, headers: getCorsHeaders(origin) });
    }
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
