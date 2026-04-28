import { Item } from "@/typings/types";

export interface OrderMeta {
  id: string;
  item: Item;
  squares: number;
  dueDate: Date | null;
  bucket: "overdue" | "thisWeek" | "nextWeek" | "future" | "noDue";
}

export type DueBucket = "overdue" | "thisWeek" | "nextWeek" | "future" | "noDue";










