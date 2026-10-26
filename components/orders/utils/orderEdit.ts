import type { Item } from "@/typings/types";

// What the order form edits.
export interface OrderFormValues {
  customerName: string;
  size: string;
  design: string;
  dueDate: string; // yyyy-MM-dd
  isVertical: boolean;
}

const DAY_KEY_LENGTH = "YYYY-MM-DD".length;

// Only the fields the user changed versus the copy the dialog opened with, so
// saving never writes back stale values of fields someone else edited while
// the dialog was open.
export function buildOrderEditChanges(
  original: Item,
  values: OrderFormValues
): Partial<Item> {
  const changes: Partial<Item> = {};
  if (values.customerName !== (original.customerName ?? "")) {
    changes.customerName = values.customerName;
  }
  if (values.size !== (original.size ?? "")) changes.size = values.size;
  if (values.design !== (original.design ?? "")) changes.design = values.design;
  if (values.dueDate !== (original.dueDate ?? "").slice(0, DAY_KEY_LENGTH)) {
    changes.dueDate = values.dueDate;
  }
  if (values.isVertical !== Boolean(original.tags?.isVertical)) {
    changes.tags = { isVertical: values.isVertical };
  }
  return changes;
}

// Apply dialog changes on top of the latest copy of the order. Tags merge so
// an edited flag doesn't drop the others.
export function applyOrderEditChanges(
  latest: Item,
  changes: Partial<Item>
): Item {
  const { tags, ...rest } = changes;
  return {
    ...latest,
    ...rest,
    ...(tags ? { tags: { ...latest.tags, ...tags } } : {}),
  };
}
