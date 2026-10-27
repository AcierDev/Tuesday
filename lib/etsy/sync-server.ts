import { randomUUID } from "node:crypto";
import type { Db, Document } from "mongodb";

import { ETSY_CONFIG } from "@/config/etsy";
import { createOrderItem } from "@/lib/server/create-order";
import { ETSY_PUSH_SKIPPED, type StoredPurchase } from "@/lib/shipping-labels/purchase-records";
import {
  etsyConnectionCollection,
  etsyRequest,
  EtsyNotConnectedError,
  isEtsyImportEnabled,
  isEtsyTrackingPushEnabled,
  readEtsyConnection,
  type EtsySyncSummary,
} from "./connection-server";
import { EtsyApiError } from "./oauth";
import { etsyTrackingBody, isImportableReceipt, receiptToOrders, type EtsyReceipt } from "./receipt-mapping";

const MS_PER_SECOND = 1000;
const GENERIC_SYNC_ERROR = "Etsy import failed; see the server log.";

const itemsCollection = (db: Db) => db.collection<Document>(`items-${process.env.NEXT_PUBLIC_MODE}`);

/** Message safe to show in Settings (driver errors can contain connection strings). */
export function publicEtsyError(error: unknown, fallback = GENERIC_SYNC_ERROR): string {
  return error instanceof EtsyApiError || error instanceof EtsyNotConnectedError ? error.message : fallback;
}

/**
 * Adds the label's tracking to the order's Etsy receipt. Etsy then marks the
 * receipt shipped and emails the buyer. "skipped" when the order has no Etsy
 * receipt or tracking upload is off/not connected.
 */
export async function pushEtsyTrackingForOrder(
  db: Db,
  orderId: string,
  purchase: Pick<StoredPurchase, "trackingNumber">
): Promise<"done" | typeof ETSY_PUSH_SKIPPED> {
  const order = await itemsCollection(db).findOne({ id: orderId }, { projection: { _id: 0, etsyOrder: 1 } });
  const receiptId: unknown = order?.etsyOrder?.receiptId;
  if (typeof receiptId !== "string" || !/^\d+$/.test(receiptId) || !purchase.trackingNumber) return ETSY_PUSH_SKIPPED;
  const connection = await readEtsyConnection(db);
  if (!isEtsyTrackingPushEnabled(connection) || !connection?.shopId) return ETSY_PUSH_SKIPPED;
  await etsyRequest(`/shops/${connection.shopId}/receipts/${receiptId}/tracking`, {
    method: "POST",
    body: etsyTrackingBody(purchase.trackingNumber),
  }, db);
  return "done";
}

type ReceiptsPage = { count?: number; results?: EtsyReceipt[] };

/**
 * Imports paid, unshipped Etsy receipts created since the shop was connected.
 * Idempotent: units already on the board are skipped by their Etsy link.
 * Returns null when import is off or another process holds the sync lease.
 */
export async function syncEtsyOrders(db: Db): Promise<EtsySyncSummary | null> {
  const collection = etsyConnectionCollection(db);
  const connection = await readEtsyConnection(db);
  if (!isEtsyImportEnabled(connection) || !connection?.shopId) return null;

  const token = randomUUID();
  const startedAt = Date.now();
  const lease = await collection.findOneAndUpdate(
    {
      _id: ETSY_CONFIG.documentId,
      $or: [{ "syncLease.until": { $exists: false } }, { "syncLease.until": { $lte: startedAt } }],
    },
    { $set: { syncLease: { token, until: startedAt + ETSY_CONFIG.syncLeaseMs } } },
    { returnDocument: "after" }
  );
  if (lease?.syncLease?.token !== token) return null;

  const summary: EtsySyncSummary = { at: startedAt, imported: 0, receiptsChecked: 0, error: null };
  try {
    const minCreated = Math.floor((connection.importSince ?? startedAt) / MS_PER_SECOND);
    for (let page = 0; page < ETSY_CONFIG.maxReceiptPagesPerSync; page++) {
      const { results = [] } = await etsyRequest<ReceiptsPage>(`/shops/${connection.shopId}/receipts`, {
        query: {
          min_created: minCreated,
          was_paid: true,
          was_shipped: false,
          was_canceled: false,
          sort_on: "created",
          sort_order: "asc",
          limit: ETSY_CONFIG.receiptsPageSize,
          offset: page * ETSY_CONFIG.receiptsPageSize,
        },
      }, db);
      for (const receipt of results) {
        summary.receiptsChecked++;
        summary.imported += await importReceipt(db, receipt);
      }
      if (results.length < ETSY_CONFIG.receiptsPageSize) break;
    }
  } catch (error) {
    console.error("Etsy order import failed", error instanceof EtsyApiError ? error.message : error);
    summary.error = publicEtsyError(error);
  } finally {
    await collection.updateOne(
      { _id: ETSY_CONFIG.documentId, "syncLease.token": token },
      { $set: { lastSync: summary }, $unset: { syncLease: "" } }
    );
  }
  return summary;
}

async function importReceipt(db: Db, receipt: EtsyReceipt): Promise<number> {
  if (!isImportableReceipt(receipt)) return 0;
  // An order linked by hand to this receipt without a transaction ID can't be
  // matched unit by unit, so leave the whole receipt to whoever entered it.
  const linked = await itemsCollection(db)
    .find({ "etsyOrder.receiptId": String(receipt.receipt_id) }, { projection: { _id: 0, etsyOrder: 1 } })
    .toArray();
  if (linked.some((item) => !item.etsyOrder?.transactionId)) return 0;

  let imported = 0;
  for (const order of receiptToOrders(receipt, Date.now(), randomUUID)) {
    const result = await createOrderItem(db, order);
    if (result.status === "created") imported++;
  }
  return imported;
}
