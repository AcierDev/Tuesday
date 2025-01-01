import {
  Item,
  DayName,
  DaySchedule,
  ColumnTitles,
  ColumnValue,
  WeeklySchedules,
} from "@/typings/types";
import {
  addDays,
  isBefore,
  parseISO,
  startOfWeek,
  addWeeks,
  format,
} from "date-fns";

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
  weeklySchedules?: WeeklySchedules;
}

const BLOCKS_PER_DAY_LIMIT = 1000;

// Define the days tuple type at the top level
const daysOrder = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
] as const;
type ValidDay = (typeof daysOrder)[number];

// Calculate blocks for an item based on its size
const calculateBlocks = (item: Item): number => {
  const sizeStr = item.values.find((v) => v.columnName === "Size")?.text || "";
  const dimensions = sizeStr.split("x").map((dim) => parseFloat(dim.trim()));

  // Check if we have valid dimensions
  const width = dimensions[0] || 0;
  const height = dimensions[1] || 0;

  return width * height;
};

// Track blocks per day
interface DayBlocks {
  Sunday: number;
  Monday: number;
  Tuesday: number;
  Wednesday: number;
  Thursday: number;
}

interface DayCapacities {
  Sunday: number;
  Monday: number;
  Tuesday: number;
  Wednesday: number;
  Thursday: number;
}

export const sortItems = ({
  items,
  currentSchedule,
  targetWeek = new Date(),
  weeklySchedules = {},
}: SortItemsProps): SortedItems => {
  console.log("Starting sortItems with:", {
    totalItems: items.length,
    targetWeek: format(targetWeek, "yyyy-MM-dd"),
    hasExistingSchedule: Object.keys(currentSchedule).length > 0,
  });

  const sortedItems = {} as SortedItems;

  const scheduleItemsForWeek = (
    itemsToSchedule: Item[],
    weekStart: Date,
    existingSchedule: DaySchedule
  ): {
    scheduledItems: Item[];
    unscheduledItems: Item[];
  } => {
    const weekKey = format(weekStart, "yyyy-MM-dd");
    console.log(`\nProcessing week: ${weekKey}`, {
      itemsToSchedule: itemsToSchedule.length,
      hasExistingSchedule: Object.keys(existingSchedule).length > 0,
    });

    if (!sortedItems[weekKey]) {
      sortedItems[weekKey] = [];
    }

    const dayBlocks: DayBlocks = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
    };

    // Handle existing scheduled items
    const existingScheduledItems = new Set<string>();
    Object.entries(existingSchedule).forEach(([day, scheduleItems]) => {
      if (day in dayBlocks) {
        scheduleItems.forEach((scheduleItem) => {
          const existingItem = items.find((i) => i.id === scheduleItem.id);
          if (existingItem) {
            const itemBlocks = calculateBlocks(existingItem);
            dayBlocks[day as keyof DayBlocks] += itemBlocks;
            existingScheduledItems.add(existingItem.id);
            //@ts-ignore
            sortedItems[weekKey].push({
              day: day as DayName,
              item: existingItem,
            });
          }
        });
      }
    });

    console.log("Existing scheduled items:", {
      count: existingScheduledItems.size,
      dayBlocks,
    });

    // Filter and separate items
    const activeItems = itemsToSchedule.filter(
      (item) => !existingScheduledItems.has(item.id)
    );

    const urgentItems = activeItems.filter((item) => {
      const dueDateValue = item.values.find(
        (v) => v.columnName === "Due Date"
      )?.text;
      if (!dueDateValue) return false;

      try {
        const dueDate = parseISO(dueDateValue);
        if (isNaN(dueDate.getTime())) return false;

        const today = new Date();
        const daysUntilDue = Math.floor(
          (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilDue < 2;
      } catch {
        return false;
      }
    });

    const nonUrgentItems = activeItems.filter(
      (item) => !urgentItems.includes(item)
    );

    console.log("Items to schedule:", {
      urgent: urgentItems.length,
      nonUrgent: nonUrgentItems.length,
    });

    const unscheduledItems: Item[] = [];

    // Helper function for scheduling items by design
    const scheduleItemsByDesign = (items: Item[], isUrgent: boolean) => {
      const itemsByDesign: Record<string, Item[]> = {};
      items.forEach((item) => {
        const design =
          item.values.find((v) => v.columnName === "Design")?.text ||
          "No Design";
        if (!itemsByDesign[design]) {
          itemsByDesign[design] = [];
        }
        itemsByDesign[design].push(item);
      });

      console.log(`Processing ${isUrgent ? "urgent" : "non-urgent"} items:`, {
        designGroups: Object.keys(itemsByDesign).length,
        itemsByDesign: Object.fromEntries(
          Object.entries(itemsByDesign).map(([k, v]) => [k, v.length])
        ),
      });

      Object.entries(itemsByDesign).forEach(([design, designItems]) => {
        console.log(`\nScheduling design group: ${design}`, {
          itemCount: designItems.length,
          currentDayBlocks: { ...dayBlocks },
        });

        const remainingItems = scheduleDesignGroup(
          designItems,
          design,
          isUrgent ? "urgent items" : "regular items",
          weekKey,
          sortedItems,
          dayBlocks,
          unscheduledItems
        );

        console.log(`Completed design group: ${design}`, {
          scheduled: designItems.length - remainingItems.length,
          unscheduled: remainingItems.length,
          updatedDayBlocks: { ...dayBlocks },
        });

        unscheduledItems.push(...remainingItems);
      });
    };

    scheduleItemsByDesign(urgentItems, true);
    scheduleItemsByDesign(nonUrgentItems, false);

    const result = {
      scheduledItems: activeItems.filter(
        (item) => !unscheduledItems.includes(item)
      ),
      unscheduledItems,
    };

    console.log(`\nWeek ${weekKey} scheduling complete:`, {
      scheduled: result.scheduledItems.length,
      unscheduled: result.unscheduledItems.length,
      finalDayBlocks: { ...dayBlocks },
    });

    return result;
  };

  // Start scheduling with the target week
  let currentWeekStart = startOfWeek(targetWeek);
  let remainingItems = [...items];
  let weekCount = 0;

  while (remainingItems.length > 0) {
    weekCount++;
    console.log(`\n=== Processing Week ${weekCount} ===`);

    const weekKey = format(currentWeekStart, "yyyy-MM-dd");
    const existingSchedule =
      weekKey === format(targetWeek, "yyyy-MM-dd")
        ? currentSchedule
        : weeklySchedules[weekKey] || {
            Sunday: [],
            Monday: [],
            Tuesday: [],
            Wednesday: [],
            Thursday: [],
            Friday: [],
            Saturday: [],
          };

    const { unscheduledItems } = scheduleItemsForWeek(
      remainingItems,
      currentWeekStart,
      existingSchedule
    );

    if (unscheduledItems.length === 0) {
      console.log("All items scheduled successfully!");
      break;
    }

    console.log(`Moving ${unscheduledItems.length} items to next week`);
    currentWeekStart = addWeeks(currentWeekStart, 1);
    remainingItems = unscheduledItems;
  }

  console.log("\nFinal schedule:", {
    weeksUsed: Object.keys(sortedItems).length,
    totalItemsScheduled: Object.values(sortedItems).reduce(
      (sum, week) => sum + week.length,
      0
    ),
    itemsByWeek: Object.fromEntries(
      Object.entries(sortedItems).map(([k, v]) => [k, v.length])
    ),
  });

  return sortedItems;
};

// Helper function for finding optimal day and scheduling items
const scheduleDesignGroup = (
  items: Item[],
  design: string,
  itemType: string,
  weekKey: string,
  sortedItems: SortedItems,
  dayBlocks: DayBlocks,
  unscheduledItems: Item[]
): Item[] => {
  const dayCapacities: DayCapacities = {
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
  };

  // Simulate adding items to each day
  for (const day of daysOrder) {
    let theoreticalBlocks = dayBlocks[day];
    let itemsFittingThisDay = 0;

    for (const item of items) {
      const itemBlocks = calculateBlocks(item);
      if (theoreticalBlocks + itemBlocks <= BLOCKS_PER_DAY_LIMIT) {
        itemsFittingThisDay++;
        theoreticalBlocks += itemBlocks;
      } else {
        break;
      }
    }

    dayCapacities[day] = itemsFittingThisDay;
  }

  // Check if any day can hold items
  const maxCapacity = Math.max(...Object.values(dayCapacities));
  if (maxCapacity === 0) {
    items.forEach((item) => {
      unscheduledItems.push(item);
    });
    return [];
  }

  // Find the day that can hold the most items
  let bestDay: ValidDay = "Sunday";
  for (const day of daysOrder) {
    if (dayCapacities[day] > dayCapacities[bestDay]) {
      bestDay = day;
    }
  }

  // Schedule what fits on best day
  const fittingItems: Item[] = [];
  const remainingItems: Item[] = [];
  let currentBlocks = dayBlocks[bestDay];

  for (const item of items) {
    const itemBlocks = calculateBlocks(item);
    if (currentBlocks + itemBlocks <= BLOCKS_PER_DAY_LIMIT) {
      dayBlocks[bestDay] += itemBlocks;
      currentBlocks += itemBlocks;
      if (!sortedItems[weekKey]) {
        sortedItems[weekKey] = [];
      }
      sortedItems[weekKey].push({
        day: bestDay,
        item: item,
      });
      fittingItems.push(item);
    } else {
      remainingItems.push(item);
    }
  }

  // Recursively handle remaining items
  if (remainingItems.length > 0) {
    return scheduleDesignGroup(
      remainingItems,
      design,
      itemType,
      weekKey,
      sortedItems,
      dayBlocks,
      unscheduledItems
    );
  }

  return remainingItems;
};
