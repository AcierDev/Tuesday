import { useMemo, useCallback } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Item, ItemSizes, ItemDesigns, ItemStatus } from "@/typings/types";
import { isWithinDueBadgeWarningWindow } from "@/config/due-badge";

interface UseOrderStatsProps {
  items: Item[] | undefined;
}

export function isDueDateWithinStatsWindow(
  dueDate: Item["dueDate"],
  referenceDate = new Date()
): boolean {
  if (!dueDate) return false;

  const calendarDayDistance = Math.abs(
    differenceInCalendarDays(parseISO(dueDate), referenceDate)
  );
  return isWithinDueBadgeWarningWindow(calendarDayDistance);
}

export function useOrderStats({ items }: UseOrderStatsProps) {
  const isItemDue = useCallback(
    (item: Item) => isDueDateWithinStatsWindow(item.dueDate),
    []
  );

  const dueCounts = useMemo(() => {
    if (!items) return {};

    const counts: Record<string, number> = {
      all: 0,
      geometric: 0,
      striped: 0,
      mini: 0,
      shepit: 0,
      custom: 0,
    };

    items.forEach((item) => {
      if (isItemDue(item) || item.status === ItemStatus.New) {
        counts.all = (counts.all || 0) + 1;

        // Use flattened fields
        const design = item.design || "";
        const size = item.size || "";

        const isMini = size === ItemSizes.Fourteen_By_Seven;
        const isShepit = size.includes('"');

        if (design.startsWith("Striped") && !isMini)
          counts.striped = (counts.striped || 0) + 1;
        else if (!design.startsWith("Striped") && !isMini)
          counts.geometric = (counts.geometric || 0) + 1;

        if (isMini) counts.mini = (counts.mini || 0) + 1;
        if (isShepit) counts.shepit = (counts.shepit || 0) + 1;
        if (
          !isMini &&
          !isShepit &&
          (!Object.values(ItemDesigns).includes(design as ItemDesigns) ||
            !Object.values(ItemSizes).includes(size as ItemSizes))
        )
          counts.custom = (counts.custom || 0) + 1;
      }
    });

    return counts;
  }, [items, isItemDue]);

  return dueCounts;
}
