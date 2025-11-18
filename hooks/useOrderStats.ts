import { useMemo, useCallback } from "react";
import { Item, ItemSizes, ItemDesigns } from "@/typings/types";

interface UseOrderStatsProps {
  items: Item[] | undefined;
  dueBadgeDays: number;
}

export function useOrderStats({ items, dueBadgeDays }: UseOrderStatsProps) {
  const isItemDue = useCallback(
    (item: Item) => {
      // Use flattened due date field
      const dueDate = item.dueDate;

      if (!dueDate) return false;

      const dueDateObj = new Date(dueDate);
      const currentDate = new Date();
      const daysDifference = Math.abs(
        Math.ceil(
          (dueDateObj.getTime() - currentDate.getTime()) / (1000 * 3600 * 24)
        )
      );

      return daysDifference <= dueBadgeDays;
    },
    [dueBadgeDays]
  );

  const dueCounts = useMemo(() => {
    if (!items) return {};

    const counts: Record<string, number> = {
      all: 0,
      geometric: 0,
      striped: 0,
      tiled: 0,
      mini: 0,
      custom: 0,
    };

    items.forEach((item) => {
      if (isItemDue(item)) {
        counts.all = (counts.all || 0) + 1;

        // Use flattened fields
        const design = item.design || "";
        const size = item.size || "";

        const isMini = size === ItemSizes.Fourteen_By_Seven;

        if (design.startsWith("Striped") && !isMini)
          counts.striped = (counts.striped || 0) + 1;
        else if (design.startsWith("Tiled") && !isMini)
          counts.tiled = (counts.tiled || 0) + 1;
        else if (
          !design.startsWith("Striped") &&
          !isMini &&
          !design.startsWith("Tiled")
        )
          counts.geometric = (counts.geometric || 0) + 1;

        if (isMini) counts.mini = (counts.mini || 0) + 1;
        if (!Object.values(ItemDesigns).includes(design as ItemDesigns))
          counts.custom = (counts.custom || 0) + 1;
      }
    });

    return counts;
  }, [items, isItemDue]);

  return dueCounts;
}
