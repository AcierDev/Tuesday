import { ItemStatus } from "@/typings/types";

// Statuses an order can have while still being eligible to be moved or
// auto-planned on the calendar. Once an order leaves this set (Wip and
// beyond), its day on the calendar is locked so historical planning data
// stays accurate.
export const PRE_WIP_STATUSES: ReadonlySet<ItemStatus> = new Set([
  ItemStatus.New,
  ItemStatus.OnDeck,
]);
