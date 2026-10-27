import { randomUUID } from "node:crypto";
import type { Db, Document } from "mongodb";

import { getDb } from "@/app/api/db/connect";
import { createAndStoreTracker } from "@/lib/easypost-tracking";
import { pushEtsyTrackingForOrder } from "@/lib/etsy/sync-server";
import { cancelFedExShipment, purchaseFedExShipment } from "@/lib/fedex-api";
import { deleteLabel, getNextLabelFilename, uploadLabel } from "@/lib/s3-client";
import type { OrderTrackingInfo } from "@/typings/types";
import {
  PURCHASE_LOCK_TTL_MS,
  type FedExPurchaseDeps,
  type FollowUpDeps,
} from "./fedex-purchase";
import type { FedExVoidDeps } from "./fedex-void";
import {
  PURCHASE_SOURCE_UPLOADED,
  type OrderPurchaseFields,
} from "./purchase-records";

const PURCHASE_LOCK_FIELD = "fedexPurchaseLockedAt";

function itemsCollection(db: Db) {
  // Untyped: purchase history fields are newer than the shared Item type.
  return db.collection<Document>(`items-${process.env.NEXT_PUBLIC_MODE}`);
}

async function getOrder(db: Db, orderId: string): Promise<OrderPurchaseFields | null> {
  return itemsCollection(db).findOne(
    { id: orderId },
    { projection: { _id: 0, id: 1, purchasedShipment: 1, purchasedShipments: 1 } }
  ) as Promise<OrderPurchaseFields | null>;
}

function followUpDeps(db: Db): FollowUpDeps {
  return {
    updatePurchase: async (orderId, purchaseId, patch, unsetFields) => {
      const setFor = (prefix: string) =>
        Object.fromEntries(
          Object.entries(patch).map(([field, value]) => [`${prefix}.${field}`, value])
        );
      const unsetFor = (prefix: string) =>
        Object.fromEntries(unsetFields.map((field) => [`${prefix}.${field}`, ""]));
      const update = (prefix: string): Document => ({
        ...(Object.keys(patch).length ? { $set: setFor(prefix) } : {}),
        ...(unsetFields.length ? { $unset: unsetFor(prefix) } : {}),
      });
      if (!Object.keys(patch).length && !unsetFields.length) return;

      const items = itemsCollection(db);
      await items.updateOne({ id: orderId }, update("purchasedShipments.$[purchase]"), {
        arrayFilters: [{ "purchase.id": purchaseId }],
      });
      await items.updateOne(
        { id: orderId, "purchasedShipment.id": purchaseId },
        update("purchasedShipment")
      );
    },
    uploadLabel: (filename, labelBuffer) =>
      uploadLabel(filename, labelBuffer, "application/pdf"),
    onLabelUploaded: async (orderId, filename) => {
      await itemsCollection(db).updateOne({ id: orderId }, { $set: { labels: filename } });
    },
    createTracker: async (orderId, trackingNumber) => {
      await createAndStoreTracker(orderId, trackingNumber, "FedEx");
    },
    pushEtsyTracking: (orderId, purchase) => pushEtsyTrackingForOrder(db, orderId, purchase),
  };
}

export async function createFedExPurchaseDeps(): Promise<FedExPurchaseDeps> {
  const db = await getDb();
  const items = itemsCollection(db);

  return {
    ...followUpDeps(db),
    getOrder: (orderId) => getOrder(db, orderId),
    claimPurchaseLock: async (orderId, now) => {
      const result = await items.updateOne(
        {
          id: orderId,
          $or: [
            { [PURCHASE_LOCK_FIELD]: { $exists: false } },
            { [PURCHASE_LOCK_FIELD]: { $lt: now - PURCHASE_LOCK_TTL_MS } },
          ],
        },
        { $set: { [PURCHASE_LOCK_FIELD]: now } }
      );
      return result.modifiedCount === 1;
    },
    releasePurchaseLock: async (orderId) => {
      await items.updateOne({ id: orderId }, { $unset: { [PURCHASE_LOCK_FIELD]: "" } });
    },
    purchase: (input) =>
      purchaseFedExShipment({
        accountId: input.accountId,
        shipFrom: input.shipFrom,
        shipTo: input.shipTo,
        packages: input.packages,
        serviceType: input.serviceType,
        purchaseDefaults: input.purchaseDefaults,
      }),
    savePurchase: async (orderId, record) => {
      // Seed the history with a pre-history purchase so it isn't lost.
      const legacyPurchase = {
        $cond: [
          {
            $and: [
              { $eq: [{ $type: "$purchasedShipment.trackingNumber" }, "string"] },
              { $ne: ["$purchasedShipment.source", PURCHASE_SOURCE_UPLOADED] },
            ],
          },
          ["$purchasedShipment"],
          [],
        ],
      };
      await items.updateOne({ id: orderId }, [
        {
          $set: {
            purchasedShipments: {
              $concatArrays: [
                { $ifNull: ["$purchasedShipments", legacyPurchase] },
                [{ $literal: record }],
              ],
            },
            purchasedShipment: { $literal: record },
            shipping: { $literal: record.trackingNumber },
          },
        },
      ]);
    },
    createLabelFilename: getNextLabelFilename,
    createId: randomUUID,
    now: Date.now,
  };
}

export async function createFedExFollowUpDeps(): Promise<
  FollowUpDeps & { getOrder: FedExPurchaseDeps["getOrder"] }
> {
  const db = await getDb();
  return { ...followUpDeps(db), getOrder: (orderId) => getOrder(db, orderId) };
}

export async function createFedExVoidDeps(): Promise<FedExVoidDeps> {
  const db = await getDb();
  const items = itemsCollection(db);

  return {
    getOrder: (orderId) => getOrder(db, orderId),
    cancel: cancelFedExShipment,
    saveVoid: async (orderId, plan) => {
      const update: Document = { $set: { purchasedShipments: plan.history } };
      if (plan.nextPurchasedShipment) {
        update.$set.purchasedShipment = plan.nextPurchasedShipment;
      } else if (plan.nextPurchasedShipment === null) {
        update.$unset = { purchasedShipment: "" };
      }
      await items.updateOne({ id: orderId }, update);
      if (plan.voided.labelFilename) {
        await items.updateOne(
          { id: orderId, labels: plan.voided.labelFilename },
          { $unset: { labels: "" } }
        );
      }
    },
    removeTrackers: async (orderId, trackingNumbers) => {
      await db
        .collection<OrderTrackingInfo>(`trackers-${process.env.NEXT_PUBLIC_MODE}`)
        .updateOne(
          { orderId },
          { $pull: { trackers: { tracking_code: { $in: trackingNumbers } } } }
        );
    },
    removeLabelFile: deleteLabel,
    now: Date.now,
  };
}
