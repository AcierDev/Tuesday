import type { Item } from "@/typings/types";

// Orders added by the Etsy import carry `etsyImportReview: true` until someone
// opens or edits them (Etsy's API can't show details agreed in messages).

// A change to any of these by a person counts as having looked at the order;
// scheduling, ordering and shipping bookkeeping do not.
const REVIEWED_BY_EDITING = new Set<string>([
  "customerName", "dueDate", "design", "size", "painted", "backboard", "glued", "packaging",
  "boxes", "notes", "labels", "status", "shippingDetails", "tags", "onHold", "isWip", "deleted",
]);

export const needsEtsyImportReview = (item: Pick<Item, "etsyImportReview">) => item.etsyImportReview === true;

export function clearsEtsyImportReview(current: Pick<Item, "etsyImportReview">, updates: Partial<Item>): boolean {
  return needsEtsyImportReview(current) && Object.keys(updates).some((field) => REVIEWED_BY_EDITING.has(field));
}
