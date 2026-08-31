import type { ShippingLabelRecord } from "@/types/shipping-labels";
import { ItemStatus, type Item } from "@/typings/types";
import { canCompleteFutureLabelOrder } from "./status";

export type FutureLabelCompletionDeps = {
  listLabels: (orderId: string) => Promise<ShippingLabelRecord[]>;
  getOrder: (orderId: string) => Promise<Item | null>;
  completeOrder: (item: Item, completedAt: number) => Promise<boolean>;
  now: () => number;
};

export async function evaluateFutureLabelCompletion(
  orderId: string,
  deps: FutureLabelCompletionDeps
): Promise<boolean | null> {
  const labels = await deps.listLabels(orderId);
  if (labels.length === 0) return null;
  if (!canCompleteFutureLabelOrder(labels)) return false;

  const item = await deps.getOrder(orderId);
  if (!item) return false;
  if (item.status === ItemStatus.Done || item.status === ItemStatus.Hidden) {
    return true;
  }

  await deps.completeOrder(item, deps.now());
  return true;
}
