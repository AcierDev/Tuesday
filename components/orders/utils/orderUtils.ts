import { format } from "date-fns";
import { ItemStatus } from "@/typings/types";

// Define the order of statuses for grouping
export const STATUS_ORDER: ItemStatus[] = [
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
  ItemStatus.Packaging,
  ItemStatus.Shipping,
  ItemStatus.At_The_Door,
  ItemStatus.Done,
  // "Hidden" status can be added if needed
];

// Helper functions
export function formatDate(dateString: string): string {
  if (!dateString) return "No date";
  try {
    const date = new Date(dateString);
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

export function getDaysRemaining(dueDate: string): number {
  if (!dueDate) return 0;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    // Check if date is valid
    if (isNaN(due.getTime())) {
      return 0;
    }
    due.setHours(0, 0, 0, 0);

    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error("Error calculating days remaining:", error);
    return 0;
  }
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
import { Item, ColumnTitles, ExtendedItem } from "@/typings/types";

// Modified OrderItem type to match Item structure
export interface OrderItem extends ExtendedItem {
  customerName?: string;
  design?: string;
  size?: string;
  dueDate?: string;
}

// Process an Item into OrderItem format
export const processItem = (item: Item): OrderItem => {
  const customerName =
    item.values.find((v) => v.columnName === ColumnTitles.Customer_Name)
      ?.text || "Unknown";

  const design =
    item.values.find((v) => v.columnName === ColumnTitles.Design)?.text || "";

  const size =
    item.values.find((v) => v.columnName === ColumnTitles.Size)?.text || "";

  const dueDate =
    item.values.find((v) => v.columnName === ColumnTitles.Due)?.text || "";

  return {
    ...item,
    customerName,
    design,
    size,
    dueDate,
  };
};
