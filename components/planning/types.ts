import { DayName, Item } from "@/typings/types";

export type DueBucket = "overdue" | "thisWeek" | "nextWeek" | "future" | "noDue";

export type SortOption = "dueDate" | "blocks" | "status";

export type FilterOption = "all" | "overdue" | "thisWeek" | "nextWeek";

export interface OrderMeta {
  id: string;
  item: Item;
  blocks: number;
  dueDate: Date | null;
  bucket: DueBucket;
}

export type ScheduledPlacement = {
  week: "current" | "next";
  day?: DayName;
};
