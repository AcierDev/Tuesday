import type { Db, Filter, UpdateFilter } from "mongodb";

import type {
  FutureLabelSummariesByOrder,
  ShippingLabelProcessingStatus,
  ShippingLabelRecord,
} from "@/types/shipping-labels";
import type { Tracker } from "@/typings/types";
import { LABEL_SCAN_STALE_AFTER_MS } from "./config";

const COLLECTION_PREFIX = "shipping-labels";
type ShippingLabelSetFields = NonNullable<
  UpdateFilter<ShippingLabelRecord>["$set"]
>;
type ShippingLabelUnsetFields = NonNullable<
  UpdateFilter<ShippingLabelRecord>["$unset"]
>;

function collectionName(): string {
  return `${COLLECTION_PREFIX}-${process.env.NEXT_PUBLIC_MODE}`;
}

export function shippingLabelCollection(db: Db) {
  return db.collection<ShippingLabelRecord>(collectionName());
}

export async function ensureShippingLabelIndexes(db: Db): Promise<void> {
  const collection = shippingLabelCollection(db);
  await Promise.all([
    collection.createIndex(
      { orderId: 1, sourceFileHash: 1, pageNumber: 1 },
      { unique: true, name: "order_source_page_unique" }
    ),
    collection.createIndex(
      { trackerId: 1 },
      { sparse: true, name: "tracker_id_lookup" }
    ),
  ]);
}

export async function listShippingLabels(
  db: Db,
  orderId: string
): Promise<ShippingLabelRecord[]> {
  return shippingLabelCollection(db)
    .find({ orderId })
    .sort({ createdAt: 1, uploadId: 1, pageNumber: 1 })
    .toArray();
}

export async function findShippingLabelsBySource(
  db: Db,
  orderId: string,
  sourceFileHash: string
): Promise<ShippingLabelRecord[]> {
  return shippingLabelCollection(db)
    .find({ orderId, sourceFileHash })
    .sort({ pageNumber: 1 })
    .toArray();
}

export async function getShippingLabel(
  db: Db,
  labelId: string
): Promise<ShippingLabelRecord | null> {
  return shippingLabelCollection(db).findOne({ id: labelId });
}

export async function saveShippingLabel(
  db: Db,
  record: ShippingLabelRecord
): Promise<ShippingLabelRecord> {
  const logicalKey = {
    orderId: record.orderId,
    sourceFileHash: record.sourceFileHash,
    pageNumber: record.pageNumber,
  };
  await shippingLabelCollection(db).updateOne(
    logicalKey,
    { $setOnInsert: record },
    { upsert: true }
  );
  const saved = await shippingLabelCollection(db).findOne(logicalKey);
  if (!saved) throw new Error("Failed to save shipping-label record.");
  return saved;
}

export async function updateShippingLabel(
  db: Db,
  labelId: string,
  update: ShippingLabelSetFields,
  filter: Filter<ShippingLabelRecord> = {},
  unset?: ShippingLabelUnsetFields
): Promise<ShippingLabelRecord | null> {
  const operation: UpdateFilter<ShippingLabelRecord> = { $set: update };
  if (unset) operation.$unset = unset;
  await shippingLabelCollection(db).updateOne(
    { ...filter, id: labelId },
    operation
  );
  return getShippingLabel(db, labelId);
}

export async function claimShippingLabel(
  db: Db,
  labelId: string,
  updatedAt: number,
  allowReady = false
): Promise<ShippingLabelRecord | null> {
  const eligibleStatuses: ShippingLabelProcessingStatus[] = allowReady
    ? ["pending", "needs_review", "ready"]
    : ["pending", "needs_review"];
  return shippingLabelCollection(db).findOneAndUpdate(
    {
      id: labelId,
      $or: [
        { processingStatus: { $in: eligibleStatuses } },
        {
          processingStatus: "scanning",
          updatedAt: { $lte: updatedAt - LABEL_SCAN_STALE_AFTER_MS },
        },
      ],
    },
    {
      $set: {
        processingStatus: "scanning",
        updatedAt,
      },
      $unset: { processingError: "" },
    },
    { returnDocument: "after" }
  );
}

export async function saveReadyShippingLabel(
  db: Db,
  labelId: string,
  update: Pick<
    ShippingLabelRecord,
    "trackingNumber" | "carrier" | "trackerId" | "tracker" | "updatedAt"
  >
): Promise<ShippingLabelRecord> {
  const record = await updateShippingLabel(
    db,
    labelId,
    {
      ...update,
      processingStatus: "ready",
    },
    {},
    { processingError: "" }
  );
  if (!record) throw new Error("Shipping label not found after scanning.");
  return record;
}

export async function saveNeedsReviewShippingLabel(
  db: Db,
  labelId: string,
  processingError: string,
  updatedAt: number
): Promise<ShippingLabelRecord> {
  const record = await updateShippingLabel(db, labelId, {
    processingStatus: "needs_review",
    processingError,
    updatedAt,
  });
  if (!record) throw new Error("Shipping label not found after scan failure.");
  return record;
}

export async function updateShippingLabelByTrackerId(
  db: Db,
  trackerId: string,
  tracker: Tracker,
  updatedAt: number
): Promise<ShippingLabelRecord | null> {
  return shippingLabelCollection(db).findOneAndUpdate(
    { trackerId },
    {
      $set: {
        processingStatus: "ready",
        trackingNumber: tracker.tracking_code,
        trackerId: tracker.id,
        tracker,
        updatedAt,
      },
      $unset: { processingError: "" },
    },
    { returnDocument: "after" }
  );
}

export async function deleteShippingLabelRecord(
  db: Db,
  labelId: string
): Promise<ShippingLabelRecord | null> {
  return shippingLabelCollection(db).findOneAndDelete({ id: labelId });
}

export async function futureLabelCounts(
  db: Db
): Promise<FutureLabelSummariesByOrder> {
  const records = await shippingLabelCollection(db)
    .find({}, {
      projection: {
        orderId: 1,
        processingStatus: 1,
        tracker: 1,
        createdAt: 1,
      },
    })
    .toArray();
  const summaries: FutureLabelSummariesByOrder = {};

  for (const record of records) {
    const summary = (summaries[record.orderId] ??= {
      total: 0,
      unused: 0,
      used: 0,
      issues: 0,
    });
    summary.total += 1;
    summary.latestCreatedAt = Math.max(
      summary.latestCreatedAt ?? 0,
      record.createdAt
    );
    if (record.processingStatus !== "ready" || !record.tracker) {
      summary.issues += 1;
    } else if (record.tracker.status === "pre_transit") {
      summary.unused += 1;
    } else {
      summary.used += 1;
    }
  }

  return summaries;
}
