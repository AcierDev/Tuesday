import type { TrackingInfo } from "@/types/shipping";
import type {
  ShippingLabelCarrier,
  ShippingLabelRecord,
} from "@/types/shipping-labels";
import type { Tracker } from "@/typings/types";
import { normalizeTrackingInfo } from "@/lib/shipping-label-extraction";

export type ManualShippingLabelTracking = {
  trackingNumber: string;
  carrier: ShippingLabelCarrier;
};

type ReadyLabelUpdate = Pick<
  ShippingLabelRecord,
  | "trackingNumber"
  | "carrier"
  | "trackerId"
  | "tracker"
  | "updatedAt"
>;

export type ScanShippingLabelDeps = {
  getLabel: (labelId: string) => Promise<ShippingLabelRecord | null>;
  claimLabel: (
    labelId: string,
    updatedAt: number,
    allowReady?: boolean
  ) => Promise<ShippingLabelRecord | null>;
  getObject: (key: string) => Promise<Buffer>;
  extractTracking: (pdfBuffer: Buffer) => Promise<TrackingInfo>;
  fetchTracker: (
    trackingNumber: string,
    carrier: ShippingLabelCarrier
  ) => Promise<Tracker>;
  saveReady: (
    labelId: string,
    update: ReadyLabelUpdate
  ) => Promise<ShippingLabelRecord>;
  saveNeedsReview: (
    labelId: string,
    processingError: string,
    updatedAt: number
  ) => Promise<ShippingLabelRecord>;
  upsertTrackerProjection: (
    orderId: string,
    tracker: Tracker
  ) => Promise<void>;
  evaluateOrderCompletion: (orderId: string) => Promise<unknown>;
  now: () => number;
};

function manualTrackingInfo(
  input: ManualShippingLabelTracking
): TrackingInfo {
  const normalized = normalizeTrackingInfo({
    ...input,
    sender: null,
    receiver: null,
  });
  if (!normalized) throw new Error("Manual tracking information is invalid.");
  return normalized;
}

function safeProcessingError(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Tracking information could not be processed.";
}

export async function scanShippingLabel(
  labelId: string,
  manual: ManualShippingLabelTracking | null,
  deps: ScanShippingLabelDeps
): Promise<ShippingLabelRecord> {
  const existing = await deps.getLabel(labelId);
  if (!existing) throw new Error("Shipping label not found.");

  if (existing.processingStatus === "ready" && existing.tracker && !manual) {
    await deps.upsertTrackerProjection(existing.orderId, existing.tracker);
    await deps.evaluateOrderCompletion(existing.orderId);
    return existing;
  }

  const timestamp = deps.now();
  const claimed = await deps.claimLabel(labelId, timestamp, Boolean(manual));
  if (!claimed) {
    const current = await deps.getLabel(labelId);
    if (current) return current;
    throw new Error("Shipping label could not be claimed for scanning.");
  }

  try {
    const trackingInfo = manual
      ? manualTrackingInfo(manual)
      : await deps.extractTracking(await deps.getObject(claimed.s3Key));
    const normalized = normalizeTrackingInfo(trackingInfo);
    if (!normalized) {
      throw new Error("Tracking number could not be read from this label.");
    }

    const tracker = await deps.fetchTracker(
      normalized.trackingNumber,
      normalized.carrier
    );
    const ready = await deps.saveReady(labelId, {
      trackingNumber: normalized.trackingNumber,
      carrier: normalized.carrier,
      trackerId: tracker.id,
      tracker,
      updatedAt: deps.now(),
    });
    await deps.upsertTrackerProjection(ready.orderId, tracker);
    await deps.evaluateOrderCompletion(ready.orderId);
    return ready;
  } catch (error) {
    return deps.saveNeedsReview(
      labelId,
      safeProcessingError(error),
      deps.now()
    );
  }
}
