import {
  Item,
  DayName,
  WeekSchedule,
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
  isThisWeek,
} from "date-fns";
import { useAutoScheduleStore } from "./stores/useAutoScheduleStore";

interface SortedItems {
  [key: string]: {
    day: DayName;
    item: Item;
  }[];
}

interface SortItemsProps {
  items: Item[];
  currentSchedule: WeekSchedule;
  targetWeek?: Date;
  weeklySchedules?: WeeklySchedules;
  blockLimits: Record<string, Record<DayName, number>>;
  excludedDays: Record<string, Set<DayName>>;
}

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

interface HighBlockItem {
  id: string;
  customerName: string;
  design: string;
  size: string;
  blocks: number;
}

export const sortItems = ({
  items,
  currentSchedule,
  targetWeek = new Date(),
  weeklySchedules = {},
  blockLimits,
  excludedDays,
}: SortItemsProps): {
  schedule: SortedItems;
  activeHighBlockItems: HighBlockItem[];
} => {
  console.log("Starting sortItems with:", {
    totalItems: items.length,
    targetWeek: format(targetWeek, "yyyy-MM-dd"),
    hasExistingSchedule: Object.keys(currentSchedule).length > 0,
  });

  // Filter out completed items first
  const activeItems = items.filter((item) => item.status !== "Done");

  // Identify ALL items with blocks > 1000 (both completed and uncompleted)
  const allHighBlockItems: HighBlockItem[] = [];
  const activeHighBlockItems: HighBlockItem[] = [];

  // First check all items for logging purposes
  items.forEach((item) => {
    const blocks = calculateBlocks(item);
    if (blocks > 1000) {
      const highBlockItem = {
        id: item.id,
        customerName:
          item.values.find((v) => v.columnName === "Customer Name")?.text ||
          "Unknown",
        design:
          item.values.find((v) => v.columnName === "Design")?.text || "Unknown",
        size:
          item.values.find((v) => v.columnName === "Size")?.text || "Unknown",
        blocks: blocks,
      };

      allHighBlockItems.push(highBlockItem);
      if (item.status !== "Done") {
        activeHighBlockItems.push(highBlockItem);
      }
    }
  });

  // Then filter active items to get valid ones for scheduling
  const validActiveItems = activeItems.filter((item) => {
    const blocks = calculateBlocks(item);
    return blocks <= 1000;
  });

  // Log all items with high block counts
  if (allHighBlockItems.length > 0) {
    console.log(
      "All items with block count > 1000 (including completed):",
      allHighBlockItems.map((item) => ({
        customerName: item.customerName,
        design: item.design,
        size: item.size,
        blocks: item.blocks,
      }))
    );
  }

  // Log active (non-completed) items with high block counts
  if (activeHighBlockItems.length > 0) {
    console.log(
      "Active items excluded from auto-scheduling due to high block count:",
      activeHighBlockItems.map((item) => ({
        customerName: item.customerName,
        design: item.design,
        size: item.size,
        blocks: item.blocks,
      }))
    );
  }

  console.log("Filtered items:", {
    totalItems: items.length,
    activeItems: activeItems.length,
    completedItems: items.length - activeItems.length,
    totalHighBlockItems: allHighBlockItems.length,
    activeHighBlockItems: activeHighBlockItems.length,
    validItemsForScheduling: validActiveItems.length,
  });

  const sortedItems = {} as SortedItems;

  const scheduleItemsForWeek = (
    itemsToSchedule: Item[],
    weekStart: Date,
    existingSchedule: WeekSchedule
  ): {
    scheduledItems: Item[];
    unscheduledItems: Item[];
  } => {
    const weekKey = format(weekStart, "yyyy-MM-dd");
    const weekExclusions = excludedDays[weekKey] || new Set();
    console.log(`\nProcessing week: ${weekKey}`, {
      itemsToSchedule: itemsToSchedule.length,
      hasExistingSchedule: Object.keys(existingSchedule).length > 0,
    });

    if (!sortedItems[weekKey]) {
      sortedItems[weekKey] = [];
    }

    // Initialize day blocks
    const dayBlocks: DayBlocks = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
    };

    // Determine available days based on whether this is the current week
    const today = new Date();
    const isCurrentWeek = isThisWeek(weekStart, { weekStartsOn: 0 });
    const currentDayIndex = today.getDay();

    // Filter out past days if this is the current week
    const availableDays = isCurrentWeek
      ? [...daysOrder].filter((_, index) => {
          const dayIndex = index;
          return dayIndex >= currentDayIndex && currentDayIndex < 5;
        })
      : [...daysOrder];

    console.log("Available days for scheduling:", {
      isCurrentWeek,
      currentDayIndex,
      availableDays,
    });

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

    // Get week-specific limits or use default
    const weekLimits = blockLimits[weekKey] || {
      Sunday: 1000,
      Monday: 1000,
      Tuesday: 1000,
      Wednesday: 1000,
      Thursday: 1000,
      Friday: 1000,
      Saturday: 1000,
    };

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

      Object.entries(itemsByDesign).forEach(([design, designItems]) => {
        const remainingItems = scheduleDesignGroupForWeek(
          designItems,
          design,
          isUrgent ? "urgent items" : "regular items",
          availableDays,
          dayBlocks,
          weekKey,
          sortedItems,
          unscheduledItems,
          weekLimits,
          weekExclusions
        );
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

  // Start scheduling with validActiveItems instead of activeItems
  let currentWeekStart = startOfWeek(targetWeek);
  let remainingItems = [...validActiveItems]; // Use validActiveItems here instead of activeItems
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
      remainingItems, // These are now from validActiveItems
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

  return {
    schedule: sortedItems,
    activeHighBlockItems: activeHighBlockItems,
  };
};

// Helper function for finding optimal day and scheduling items
const scheduleDesignGroupForWeek = (
  designItems: Item[],
  design: string,
  itemType: string,
  availableDays: ValidDay[],
  dayBlocks: DayBlocks,
  weekKey: string,
  sortedItems: SortedItems,
  unscheduledItems: Item[],
  weekLimits: Record<DayName, number>,
  excludedDays: Set<DayName>
): Item[] => {
  // Filter out excluded days from available days
  const allowedDays = availableDays.filter((day) => !excludedDays.has(day));

  // If no allowed days, all items are unscheduled
  if (allowedDays.length === 0) {
    designItems.forEach((item) => unscheduledItems.push(item));
    return [];
  }

  const dayCapacities: DayCapacities = {
    Sunday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
  };

  // Only check allowed days
  for (const day of allowedDays) {
    let theoreticalBlocks = dayBlocks[day as keyof DayBlocks];
    let itemsFittingThisDay = 0;

    for (const item of designItems) {
      const itemBlocks = calculateBlocks(item);
      if (theoreticalBlocks + itemBlocks <= weekLimits[day]) {
        itemsFittingThisDay++;
        theoreticalBlocks += itemBlocks;
      } else {
        break;
      }
    }

    dayCapacities[day as keyof DayCapacities] = itemsFittingThisDay;
  }

  // Find best day among allowed days only
  const maxCapacity = Math.max(
    ...allowedDays.map((day) => dayCapacities[day as keyof DayCapacities])
  );
  if (maxCapacity === 0) {
    designItems.forEach((item) => unscheduledItems.push(item));
    return [];
  }

  let bestDay = allowedDays[0];
  for (const day of allowedDays) {
    if (
      dayCapacities[day as keyof DayCapacities] >
      dayCapacities[bestDay as keyof DayCapacities]
    ) {
      bestDay = day;
    }
  }

  // Schedule items to best day
  const fittingItems: Item[] = [];
  const remainingItems: Item[] = [];
  let currentBlocks = dayBlocks[bestDay as keyof DayBlocks];

  for (const item of designItems) {
    const itemBlocks = calculateBlocks(item);
    if (currentBlocks + itemBlocks <= weekLimits[bestDay as DayName]) {
      dayBlocks[bestDay as keyof DayBlocks] += itemBlocks;
      currentBlocks += itemBlocks;

      // Ensure the array exists for this week
      if (!sortedItems[weekKey]) {
        sortedItems[weekKey] = [];
      }

      sortedItems[weekKey].push({
        day: bestDay as DayName,
        item: item,
      });
      fittingItems.push(item);
    } else {
      remainingItems.push(item);
    }
  }

  // Update recursive call to include weekLimits
  if (remainingItems.length > 0) {
    return scheduleDesignGroupForWeek(
      remainingItems,
      design,
      itemType,
      availableDays,
      dayBlocks,
      weekKey,
      sortedItems,
      unscheduledItems,
      weekLimits,
      excludedDays
    );
  }

  return remainingItems;
};
