import { useMemo } from "react";
import { Item, ItemStatus, ItemSizes, ItemDesigns } from "@/typings/types";
import { parseSquareSize } from "@/lib/production-metrics";

interface UseOrderFilteringProps {
  items: Item[] | undefined;
  searchTerm: string;
  currentType: string;
}

export function useOrderFiltering({
  items,
  searchTerm,
  currentType,
}: UseOrderFilteringProps) {
  const filteredGroups = useMemo(() => {
    if (!items) return [];

    const groupValues: string[] = Object.values(ItemStatus).filter(
      (status) => status !== ItemStatus.Hidden
    );

    const groups = groupValues.map((value) => ({
      id: value,
      title: value,
      items: [] as Item[],
    }));

    const normalizedSearchTerm = searchTerm.toLowerCase();

    const matchedSearch = items.filter((item) => {
      if (item.searchText) {
        return item.searchText.includes(normalizedSearchTerm);
      }
      return Object.values(item).some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(normalizedSearchTerm)
      );
    });

    matchedSearch.forEach((item) => {
      const group = groups.find((g) => g.title === item.status);
      if (group) {
        const design = item.design || "";
        const size = item.size || "";

        const isMini = size === ItemSizes.Fourteen_By_Seven;
        // Shepit orders are sized in inches (e.g. `18" x 24"`, `10" x 18"`),
        // not in 3"-square counts. Detected by the literal quote character
        // in the size string.
        const isShepit = size.includes('"');

        const shouldInclude = (() => {
          switch (currentType) {
            case "all":
              return true;
            case "striped":
              return design.startsWith("Striped") && !isMini;
            case "geometric":
              return (
                Object.values(ItemDesigns).includes(design as ItemDesigns) &&
                !design.startsWith("Striped") &&
                !isMini
              );
            case "mini":
              return isMini;
            case "shepit":
              return isShepit;
            case "custom":
              return (
                !isMini &&
                !isShepit &&
                (!Object.values(ItemDesigns).includes(design as ItemDesigns) ||
                  parseSquareSize(size) === null)
              );
            default:
              return false;
          }
        })();

        if (shouldInclude) {
          group.items.push(item);
        }
      }
    });

    return groups;
  }, [items, searchTerm, currentType]);

  const sortedGroups = useMemo(() => {
    return [...filteredGroups].sort((a, b) => {
      const aIndex = Object.values(ItemStatus).indexOf(a.title as ItemStatus);
      const bIndex = Object.values(ItemStatus).indexOf(b.title as ItemStatus);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [filteredGroups]);

  return sortedGroups;
}
