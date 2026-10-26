import { Item, ItemStatus } from "@/typings/types";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧱 SHARED VIEW HELPERS — pure, no server dependencies                ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// The handful of order fields stats tables render. Views send these instead
// of whole items.
export type StatsItemRef = Pick<
  Item,
  "id" | "customerName" | "design" | "size" | "status" | "dueDate"
>;

export function itemRef(item: Item): StatsItemRef {
  return {
    id: item.id,
    customerName: item.customerName,
    design: item.design,
    size: item.size,
    status: item.status,
    dueDate: item.dueDate,
  };
}

// Open orders: not shipped and not hidden (held orders never reach the views).
export function activeItems(items: Item[]): Item[] {
  return items.filter(
    (i) => i.status !== ItemStatus.Done && i.status !== ItemStatus.Hidden
  );
}

// Query-string inputs shared by the range views.
export const STATS_VIEW_MAX_DAYS = 730;
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDayKey(value: string | null): value is string {
  return value !== null && DAY_KEY_PATTERN.test(value);
}
