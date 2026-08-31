import type {
  ShippingLabelCategory,
  ShippingLabelRecord,
} from "@/types/shipping-labels";

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

  return record.tracker.status === "pre_transit" ? "unused" : "used";
}

export function canCompleteFutureLabelOrder(
  records: ClassifiableShippingLabel[]
): boolean {
  return (
    records.length > 0 &&
    records.every((record) => classifyShippingLabel(record) === "used")
  );
}
