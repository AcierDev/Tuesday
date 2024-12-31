import { Item, DayName, DaySchedule, ColumnTitles } from "@/typings/types";
import { addDays, isBefore, parseISO, startOfWeek } from "date-fns";

interface SortedItems {
  [key: string]: {
    day: DayName;
    item: Item;
  }[];
}

interface SortItemsProps {
  items: Item[];
  currentSchedule: DaySchedule;
  targetWeek?: Date;
}

export const sortItems = ({
  items,
  currentSchedule,
  targetWeek = new Date(),
}: SortItemsProps): SortedItems => {
  const sortedItems = {} as SortedItems;

  // Calculate the target week once
  const weekStart = startOfWeek(targetWeek);
  const weekKey = weekStart.toISOString().split("T")[0] as string;

  // Initialize the array for this week
  sortedItems[weekKey] = [];

  // Get all currently scheduled item IDs for this week
  const scheduledItemIds = new Set(
    Object.values(currentSchedule)
      .flat()
      .map((item) => item.id)
  );

  // Filter out items that are:
  // - Done
  // - Deleted
  // - Already in the current week's schedule
  const activeItems = items.filter(
    (item) =>
      item.status !== "Done" && !item.deleted && !scheduledItemIds.has(item.id)
  );

  // Sort items by due date first
  activeItems.sort((a, b) => {
    const aDateText = a.values.find((v) => v.columnName === "Due Date")?.text;
    const bDateText = b.values.find((v) => v.columnName === "Due Date")?.text;

    // If either date is missing, use a far future date
    if (!aDateText) return 1; // Move items without dates to the end
    if (!bDateText) return -1; // Move items without dates to the end

    const aDate = parseISO(aDateText);
    const bDate = parseISO(bDateText);

    return aDate.getTime() - bDate.getTime();
  });

  activeItems.forEach((item) => {
    const dueDateValue = item.values.find(
      (v) => v.columnName === "Due Date"
    )?.text;

    if (!dueDateValue) return;

    try {
      const dueDate = parseISO(dueDateValue);
      if (isNaN(dueDate.getTime())) return;

      const complexityScore = calculateComplexityScore(item);
      const bestDay = determineBestDay(complexityScore, dueDate);

      // Ensure array exists before pushing (TypeScript safety)
      if (!sortedItems[weekKey]) {
        sortedItems[weekKey] = [];
      }

      // Always add to target week regardless of item's due date
      sortedItems[weekKey].push({
        day: bestDay,
        item: item,
      });

      const daysUntilDue = Math.floor(
        (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      const isUrgent = daysUntilDue <= 4;
      const customerName =
        item.values.find((v) => v.columnName === ColumnTitles.Customer_Name)
          ?.text || "Unnamed";

      let schedulingReason = "";
      if (daysUntilDue <= 2) {
        schedulingReason = "URGENT (≤2 days) - forced to Sunday";
      } else if (daysUntilDue <= 4) {
        schedulingReason = `URGENT (≤4 days) - ${
          complexityScore > 60
            ? "high complexity → Sunday"
            : "lower complexity → Monday"
        }`;
      } else {
        schedulingReason = `Normal scheduling based on complexity score`;
      }

      console.log(
        `Item: "${customerName}" (ID: ${item.id})
        • Complexity Score: ${complexityScore}
        • Due in ${daysUntilDue} days ${isUrgent ? "🚨" : ""}
        • Assigned to ${bestDay}
        • Week starting: ${weekKey}
        • Reason: ${schedulingReason}`,
        {
          complexityScore,
          daysUntilDue,
          bestDay,
          dueDate: dueDateValue,
          weekKey,
        }
      );
    } catch (error) {
      console.error("Error processing item:", item.id, error);
    }
  });

  console.log("Final sorted schedule:", sortedItems);
  return sortedItems;
};

const calculateComplexityScore = (item: Item): number => {
  let score = 0;

  // Get size and parse dimensions
  const sizeStr = item.values.find((v) => v.columnName === "Size")?.text || "";
  const dimensions = sizeStr.split("x").map((dim) => parseFloat(dim.trim()));

  // Check if we have valid dimensions before calculating area
  const width = dimensions[0] || 0;
  const height = dimensions[1] || 0;

  if (width > 0 && height > 0) {
    // Larger pieces are more complex
    const area = width * height;
    score += Math.min(area / 100, 40); // Up to 40 points for size
  }

  // Certain designs are more complex
  const design = item.values.find((v) => v.columnName === "Design")?.text;
  if (design?.includes("Striped")) score += 25; // Striped designs are complex
  if (design?.includes("Oceanic Harmony")) score += 20;
  if (design?.includes("Coastal Dream")) score += 15;
  if (design?.includes("Custom")) score += 30;

  // Check progress
  const painted =
    item.values.find((v) => v.columnName === "Painted")?.text === "Done";
  const hasBackboard =
    item.values.find((v) => v.columnName === "Backboard")?.text === "Done";
  const hasGlue =
    item.values.find((v) => v.columnName === "Glued")?.text === "Done";

  // Reduce complexity if work is already done
  if (painted) score -= 10;
  if (hasBackboard) score -= 15;
  if (hasGlue) score -= 15;

  const finalScore = Math.max(0, Math.min(score, 100));

  console.log(
    `Complexity breakdown for item ${item.id} - "${
      item.values.find((v) => v.columnName === ColumnTitles.Customer_Name)
        ?.text || "Unnamed"
    }":`,
    {
      size: `${width}x${height}`,
      design,
      painted,
      hasBackboard,
      hasGlue,
      finalScore,
    }
  );

  return finalScore;
};

const determineBestDay = (complexity: number, dueDate: Date): DayName => {
  // Logic for Sunday-Thursday work week:
  // Sunday: Start complex items that need full week
  // Monday: High complexity items
  // Tuesday: Medium-high complexity or urgent items
  // Wednesday: Medium complexity items
  // Thursday: Low complexity and finishing items

  const today = new Date();
  const daysUntilDue = Math.floor(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Urgent items handling
  if (daysUntilDue <= 2) {
    return "Sunday"; // Most urgent items start immediately
  }
  if (daysUntilDue <= 4) {
    return complexity > 60 ? "Sunday" : "Monday";
  }

  // Normal scheduling based on complexity
  if (complexity >= 80) {
    return "Sunday"; // Most complex items start on Sunday
  } else if (complexity >= 60) {
    return "Monday"; // High complexity items
  } else if (complexity >= 40) {
    return "Tuesday"; // Medium complexity items
  } else if (complexity >= 20) {
    return "Wednesday"; // Lower medium complexity items
  } else {
    return "Thursday"; // Simple items and finishing work
  }
};
