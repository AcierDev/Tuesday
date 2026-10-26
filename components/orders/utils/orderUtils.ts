import { format, parseISO } from "date-fns";
import { dayDiffKeys, laDayKey } from "@/lib/debt-metrics";
import { ItemStatus } from "@/typings/types";

// Define the order of statuses for grouping
export const STATUS_ORDER: ItemStatus[] = [
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
  ItemStatus.Packaging,
  ItemStatus.At_The_Door,
  ItemStatus.Done,
  // "Hidden" status can be added if needed
];

// Helper functions
// Date-only values (YYYY-MM-DD) are calendar days: parse them as local dates.
// new Date("YYYY-MM-DD") reads UTC midnight, which is the previous day in LA.
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}/;
const DAY_KEY_LENGTH = "YYYY-MM-DD".length;

export function formatDate(dateString: string): string {
  if (!dateString) return "No date";
  try {
    const date = DAY_KEY_PATTERN.test(dateString)
      ? parseISO(dateString.slice(0, DAY_KEY_LENGTH))
      : new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    return format(date, "MMM d, yyyy");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
}

// Calendar days from today (America/Los_Angeles) until the due date.
export function getDaysRemaining(
  dueDate: string,
  todayKey: string = laDayKey()
): number {
  if (!dueDate || !DAY_KEY_PATTERN.test(dueDate)) return 0;
  const days = dayDiffKeys(todayKey, dueDate.slice(0, DAY_KEY_LENGTH));
  return Number.isFinite(days) ? days : 0;
}

// Add createBackground helper function
export const createBackground = (option: string | undefined) => {
  if (!option) return "bg-gray-400 dark:bg-gray-600"; // Fallback for undefined design
  const colors = DesignBlends[option as keyof typeof DesignBlends];
  if (colors && colors.length > 0) {
    return `linear-gradient(to right, ${colors.join(", ")})`;
  }
  // Fallback to a solid color if no gradient is found or option is invalid
  return "bg-gray-500 dark:bg-gray-700";
};

import { DesignBlends } from "@/typings/constants";
import { Item } from "@/typings/types";

// Modified OrderItem type to match Item structure
export interface OrderItem extends Item {}

// Process an Item into OrderItem format
export const processItem = (item: Item): OrderItem => {
  // Item is already flat
  return {
    ...item,
    customerName: item.customerName || "Unknown",
    design: item.design || "",
    size: item.size || "",
    dueDate: item.dueDate || "",
  };
};
