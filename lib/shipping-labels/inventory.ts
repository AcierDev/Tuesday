import type {
  ShippingLabelCategory,
  ShippingLabelRecord,
} from "@/types/shipping-labels";
import { classifyShippingLabel } from "./status";

export const RECENT_LABEL_WINDOW_HOURS = 12;
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const RECENT_LABEL_WINDOW_MS =
  RECENT_LABEL_WINDOW_HOURS * MILLISECONDS_PER_HOUR;

export function isLabelAddedRecently(
  latestCreatedAt: number | undefined,
  now = Date.now()
): boolean {
  if (latestCreatedAt === undefined) return false;
  const age = now - latestCreatedAt;
  return age >= 0 && age < RECENT_LABEL_WINDOW_MS;
}

export type ShippingLabelInventoryFilter = "all" | ShippingLabelCategory;

export type ShippingLabelInventoryCounts = Record<
  ShippingLabelInventoryFilter,
  number
>;

export function shippingLabelInventoryCounts(
  labels: ShippingLabelRecord[]
): ShippingLabelInventoryCounts {
  const counts: ShippingLabelInventoryCounts = {
    all: labels.length,
    unused: 0,
    used: 0,
    issues: 0,
  };
  for (const label of labels) counts[classifyShippingLabel(label)] += 1;
  return counts;
}

export function defaultShippingLabelFilter(
  labels: ShippingLabelRecord[]
): ShippingLabelInventoryFilter {
  return labels.some((label) => classifyShippingLabel(label) === "unused")
    ? "unused"
    : "all";
}

export function filterShippingLabelInventory(
  labels: ShippingLabelRecord[],
  filter: ShippingLabelInventoryFilter
): ShippingLabelRecord[] {
  return filter === "all"
    ? labels
    : labels.filter((label) => classifyShippingLabel(label) === filter);
}

export function normalizeUnusedSelection(
  selectedIds: Set<string>,
  labels: ShippingLabelRecord[]
): Set<string> {
  const selectableIds = new Set(
    labels
      .filter((label) => classifyShippingLabel(label) === "unused")
      .map((label) => label.id)
  );
  return new Set([...selectedIds].filter((id) => selectableIds.has(id)));
}
