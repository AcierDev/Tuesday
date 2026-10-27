import type { Db } from "mongodb";

import { logActivity } from "@/app/api/activities/log";
import { stripDerivedItemFields } from "@/lib/order-patch";
import {
  DEFAULT_ETSY_QUANTITY_INDEX,
  etsyOrderIdentityFilter,
  isPlainRecord,
  normalizeOrderShippingInput,
  OrderShippingValidationError,
} from "@/lib/order-shipping-patch";
import { prepareNewItemHistory } from "@/lib/reporting/item-history";
import { ItemStatus, type Item } from "@/typings/types";

// Shared by POST /api/items (extension, order form) and the Etsy import, so
// both get the same validation, duplicate protection and activity entry.

const MONGO_DUPLICATE_KEY_CODE = 11000;
const ASCENDING_INDEX_DIRECTION = 1;
const ETSY_ORDER_UNIQUE_INDEX = "etsy_order_receipt_transaction_quantity_unique";
export const ETSY_UNIT_TAKEN_MESSAGE = "This Etsy quantity unit already belongs to an item";

export type CreateOrderResult =
  | { status: "created"; item: Item }
  | { status: "duplicate"; error: string; id?: string };

/** Inserts a new order. Throws OrderShippingValidationError for bad input. */
export async function createOrderItem(db: Db, body: unknown): Promise<CreateOrderResult> {
  if (!isPlainRecord(body)) throw new OrderShippingValidationError("An item object is required");
  const newItem = prepareNewItemHistory(
    stripDerivedItemFields(normalizeOrderShippingInput(body) as Item) as Item
  );
  if (newItem.etsyOrder?.receiptId && newItem.etsyOrder.transactionId && newItem.etsyOrder.quantityIndex === undefined) {
    newItem.etsyOrder.quantityIndex = DEFAULT_ETSY_QUANTITY_INDEX;
  }

  const collection = db.collection<Item>(`items-${process.env.NEXT_PUBLIC_MODE}`);
  const confirmedEtsyIds = newItem.etsyOrder?.receiptId && newItem.etsyOrder?.transactionId
    ? etsyOrderIdentityFilter(newItem.etsyOrder)
    : null;
  if (confirmedEtsyIds) {
    // Legacy links without an ordinal represent the first quantity unit.
    const existing = await collection.findOne(confirmedEtsyIds);
    if (existing) return { status: "duplicate", error: ETSY_UNIT_TAKEN_MESSAGE, id: existing.id };
  }
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
    const result = await collection.insertOne(newItem);
    if (!result.acknowledged) throw new Error("Failed to add item");
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === MONGO_DUPLICATE_KEY_CODE) {
      const existing = confirmedEtsyIds ? await collection.findOne(confirmedEtsyIds) : null;
      return {
        status: "duplicate",
        error: duplicateProtectionReady
          ? ETSY_UNIT_TAKEN_MESSAGE
          : "Existing duplicate Etsy IDs prevent enabling duplicate protection; no item was added",
        ...(existing ? { id: existing.id } : {}),
      };
    }
    throw error;
  }

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
  return { status: "created", item: newItem };
}
