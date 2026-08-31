import type { Db } from "mongodb";

import { getDb } from "@/app/api/db/connect";
import { deleteLabel, getLabel, uploadLabel } from "@/lib/s3-client";
import type { Item } from "@/typings/types";
import { ingestShippingLabelPdf } from "./ingest";
import type { ShippingLabelHttpDeps } from "./http";
import {
  deleteShippingLabelRecord,
  ensureShippingLabelIndexes,
  findShippingLabelsBySource,
  futureLabelCounts,
  getShippingLabel,
  listShippingLabels,
  saveShippingLabel,
} from "./repository";

async function orderExists(db: Db, orderId: string): Promise<boolean> {
  const item = await db
    .collection<Item>(`items-${process.env.NEXT_PUBLIC_MODE}`)
    .findOne({ id: orderId }, { projection: { _id: 1 } });
  return Boolean(item);
}

export async function createShippingLabelHttpDeps(): Promise<ShippingLabelHttpDeps> {
  const db = await getDb();
  await ensureShippingLabelIndexes(db);

  return {
    ingest: (input) =>
      ingestShippingLabelPdf(input, {
        orderExists: (orderId) => orderExists(db, orderId),
        findBySource: (orderId, hash) =>
          findShippingLabelsBySource(db, orderId, hash),
        saveRecord: (record) => saveShippingLabel(db, record),
        uploadObject: async (key, bytes, contentType) => {
          await uploadLabel(key, bytes, contentType);
        },
        createId: crypto.randomUUID,
        now: Date.now,
      }),
    listLabels: (orderId) => listShippingLabels(db, orderId),
    summarizeLabels: () => futureLabelCounts(db),
    getLabel: (labelId) => getShippingLabel(db, labelId),
    getObject: getLabel,
    deleteObject: deleteLabel,
    deleteRecord: (labelId) => deleteShippingLabelRecord(db, labelId),
  };
}
