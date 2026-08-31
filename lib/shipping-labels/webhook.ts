import type { ShippingLabelRecord } from "@/types/shipping-labels";
import type { Tracker } from "@/typings/types";

export type FutureLabelTrackerUpdateDeps = {
  updateByTrackerId: (
    trackerId: string,
    tracker: Tracker,
    updatedAt: number
  ) => Promise<ShippingLabelRecord | null>;
  evaluateOrderCompletion: (orderId: string) => Promise<boolean | null>;
  now: () => number;
};

export type FutureLabelTrackerUpdateResult = {
  orderId: string | null;
  completion: boolean | null;
};

export async function applyFutureLabelTrackerUpdate(
  tracker: Tracker,
  deps: FutureLabelTrackerUpdateDeps
): Promise<FutureLabelTrackerUpdateResult> {
  const record = await deps.updateByTrackerId(
    tracker.id,
    tracker,
    deps.now()
  );
  if (!record) return { orderId: null, completion: null };

  return {
    orderId: record.orderId,
    completion: await deps.evaluateOrderCompletion(record.orderId),
  };
}
