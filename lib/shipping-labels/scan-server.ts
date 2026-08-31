import { getDb } from "@/app/api/db/connect";
import { fetchTracker } from "@/lib/easypost-tracking";
import { getLabel as getS3Label } from "@/lib/s3-client";
import { extractValidTrackingInfo } from "@/lib/shipping-label-extraction";
import {
  evaluateFutureLabelCompletion,
} from "./order-completion";
import { createFutureLabelCompletionDeps } from "./order-completion-server";
import {
  claimShippingLabel,
  getShippingLabel,
  saveNeedsReviewShippingLabel,
  saveReadyShippingLabel,
} from "./repository";
import { scanShippingLabel } from "./scanner";
import type { ScanShippingLabelHttpDeps } from "./scan-http";
import { upsertTrackerProjection } from "./tracker-projection";

export async function createScanShippingLabelHttpDeps(): Promise<ScanShippingLabelHttpDeps> {
  const db = await getDb();
  const completionDeps = createFutureLabelCompletionDeps(db);

  return {
    scan: (labelId, manual) =>
      scanShippingLabel(labelId, manual, {
        getLabel: (id) => getShippingLabel(db, id),
        claimLabel: (id, updatedAt, allowReady) =>
          claimShippingLabel(db, id, updatedAt, allowReady),
        getObject: getS3Label,
        extractTracking: extractValidTrackingInfo,
        fetchTracker,
        saveReady: (id, update) => saveReadyShippingLabel(db, id, update),
        saveNeedsReview: (id, error, updatedAt) =>
          saveNeedsReviewShippingLabel(db, id, error, updatedAt),
        upsertTrackerProjection: (orderId, tracker) =>
          upsertTrackerProjection(db, orderId, tracker),
        evaluateOrderCompletion: (orderId) =>
          evaluateFutureLabelCompletion(orderId, completionDeps),
        now: Date.now,
      }),
  };
}
