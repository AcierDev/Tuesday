import { format } from "date-fns";
import {
  BackboardRequirement,
  ColumnTitles,
  Item,
  ItemSizes,
} from "@/typings/types";
import { DaySchedule } from "../weekly-schedule/UseWeeklySchedule";

type BackboardCalculationsProps = {
  schedule: DaySchedule;
  items: Item[];
  selectedDates: Date[];
};

export function BackboardCalculations({
  schedule,
  items,
  selectedDates,
}: BackboardCalculationsProps): BackboardRequirement {
  const requirements: BackboardRequirement = Object.values(ItemSizes).reduce(
    (acc, size) => {
      acc[size as ItemSizes] = 0;
      return acc;
    },
    {} as BackboardRequirement
  );

  // Create a Set of scheduled item IDs
  const scheduledItems = new Set<string>();

  selectedDates.forEach((date) => {
    const selectedDay = format(date, "EEEE");
    if (schedule[selectedDay]) {
      schedule[selectedDay].forEach((item) => {
        scheduledItems.add(item.id);
      });
    }
  });

  // Filter items that are in the schedule
  const scheduledItemsList = items.filter((item) =>
    scheduledItems.has(item.id)
  );

  // Calculate requirements for filtered items
  scheduledItemsList.forEach((item) => {
    const size = item.values.find((v) => v.columnName === ColumnTitles.Size)
      ?.text as ItemSizes;
    if (size && size in requirements) {
      requirements[size] += 1;
    }
  });

  return requirements;
}
