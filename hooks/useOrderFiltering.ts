import { useMemo } from "react";
import { Item, ItemStatus, ItemSizes, ItemDesigns } from "@/typings/types";

interface UseOrderFilteringProps {
  items: Item[] | undefined;
  searchTerm: string;
  currentMode: string;
  groupingField: string;
  showCompletedOrders: boolean;
}

export function useOrderFiltering({
  items,
  searchTerm,
  currentMode,
  groupingField,
  showCompletedOrders,
}: UseOrderFilteringProps) {
  const filteredGroups = useMemo(() => {
    if (!items) return [];

    let groupValues: string[] = Object.values(ItemStatus);

    const groups = groupValues.map((value) => ({
      id: value,
      title: value,
      items: [] as Item[],
    }));

    const normalizedSearchTerm = searchTerm.toLowerCase();

    const matchedSearch = items.filter((item) => {
      // Use cached search text if available, otherwise fallback to value scanning
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
        // Use flattened fields
        const design = item.design || "";
        const size = item.size || "";

        const isMini = size === ItemSizes.Fourteen_By_Seven;

        const shouldInclude = (() => {
          switch (currentMode) {
            case "all":
              return true;
            case "striped":
              return design.startsWith("Striped") && !isMini;
            case "tiled":
              return design.startsWith("Tiled") && !isMini;
            case "geometric":
              return (
                !design.startsWith("Striped") &&
                !design.startsWith("Tiled") &&
                !isMini
              );
            case "mini":
              return isMini;
            case "custom":
              return (
                !Object.values(ItemDesigns).includes(design as ItemDesigns) &&
                !isMini
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
  }, [
    items,
    searchTerm,
    currentMode,
    groupingField,
    showCompletedOrders,
  ]);

  const sortedGroups = useMemo(() => {
    return [...filteredGroups].sort((a, b) => {
      if (groupingField === "Status") {
        const aIndex = Object.values(ItemStatus).indexOf(a.title as ItemStatus);
        const bIndex = Object.values(ItemStatus).indexOf(b.title as ItemStatus);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      }
      return a.title.localeCompare(b.title);
    });
  }, [filteredGroups, groupingField]);

  return sortedGroups;
}

