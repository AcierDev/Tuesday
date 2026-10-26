import type {
  ShippingLabelCategory,
  ShippingLabelRecord,
} from "@/types/shipping-labels";
import type { TrackerStatus } from "@/typings/types";

// Only positive shipping statuses prove the carrier has the package.
// A newly created tracker may be unknown until carrier data arrives.
export const SHIPPED_TRACKER_STATUSES: ReadonlySet<TrackerStatus> = new Set([
  "in_transit",
  "out_for_delivery",
  "delivered",
  "available_for_pickup",
]);

// Label exists but the carrier hasn't received the package yet.
export const NOT_YET_SHIPPED_TRACKER_STATUSES: ReadonlySet<TrackerStatus> = new Set([
  "pre_transit",
  "unknown",
]);

type ClassifiableShippingLabel = Pick<
  ShippingLabelRecord,
  "processingStatus" | "tracker"
>;

export function classifyShippingLabel(
  record: ClassifiableShippingLabel
): ShippingLabelCategory {
  if (record.processingStatus !== "ready" || !record.tracker) {
    return "issues";
  }

  // A freshly scanned label often reads "unknown" until the carrier has data:
  // it is a usable, printable label, not a problem.
  if (NOT_YET_SHIPPED_TRACKER_STATUSES.has(record.tracker.status)) return "unused";
  return SHIPPED_TRACKER_STATUSES.has(record.tracker.status) ? "used" : "issues";
}

export function canCompleteFutureLabelOrder(
  records: ClassifiableShippingLabel[]
): boolean {
  return (
    records.length > 0 &&
    records.every((record) => classifyShippingLabel(record) === "used")
  );
}

export function isShippingLabelPrintable(
  record: ClassifiableShippingLabel
): boolean {
  const category = classifyShippingLabel(record);
  return category === "unused" || category === "used";
}
