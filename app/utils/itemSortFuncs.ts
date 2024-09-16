import {
  ColumnTitles,
  Item,
  ItemSizes,
  ItemSortFuncs,
  ProgressStatus,
} from "../typings/types";

export const itemSortFuncs: ItemSortFuncs = {
  Painted: (items: Item[], ascending: boolean) => {
    return statusSort(items, ascending, ColumnTitles.Painted);
  },
  Packaging: (items: Item[], ascending: boolean) => {
    return statusSort(items, ascending, ColumnTitles.Packaging);
  },
  Backboard: (items: Item[], ascending: boolean) => {
    return statusSort(items, ascending, ColumnTitles.Backboard);
  },
  Glued: (items: Item[], ascending: boolean) => {
    return statusSort(items, ascending, ColumnTitles.Glued);
  },
  Boxes: (items: Item[], ascending: boolean) => {
    return statusSort(items, ascending, ColumnTitles.Boxes);
  },
  Size: sizeSort,
  "Customer Name": (items: Item[], ascending: boolean) => {
    return alphSort(items, ascending, ColumnTitles.Customer_Name);
  },
  Design: (items: Item[], ascending: boolean) => {
    return alphSort(items, ascending, ColumnTitles.Design);
  },
};

function statusSort(items: Item[], ascending: boolean, field: ColumnTitles): Item[] {
  // Define the order of progress statuses
  const progressStatusOrder: Record<ProgressStatus, number> = {
    Done: 1,
    Stuck: 2,
    "Working on it": 3,
  };

  return [...items].sort((a, b) => {
    const aValue = a.values.find((v) => v.columnName === field)?.text as ProgressStatus || "";
    const bValue = b.values.find((v) => v.columnName === field)?.text as ProgressStatus || "";

    const aOrder = progressStatusOrder[aValue] || Number.MAX_SAFE_INTEGER;
    const bOrder = progressStatusOrder[bValue] || Number.MAX_SAFE_INTEGER;

    return ascending ? aOrder - bOrder : bOrder - aOrder;
  });
}

function sizeSort(items: Item[], ascending: boolean): Item[] {
  // Create a mapping from size names to their order
  const sizeOrder: Record<string, number> = Object.fromEntries(
    Object.values(ItemSizes).map((size, index) => [size, index])
  );

  return [...items].sort((a, b) => {
    const aSize = a.values.find((v) => v.columnName === ColumnTitles.Size)?.text || "";
    const bSize = b.values.find((v) => v.columnName === ColumnTitles.Size)?.text || "";

    const aOrder = sizeOrder[aSize] ?? Number.MAX_SAFE_INTEGER;
    const bOrder = sizeOrder[bSize] ?? Number.MAX_SAFE_INTEGER;

    return ascending ? aOrder - bOrder : bOrder - aOrder;
  });
}

function alphSort(items: Item[], ascending: boolean, field: ColumnTitles): Item[] {
  return [...items].sort((a, b) => {
    const aValue = a.values.find((v) => v.columnName === field)?.text || "";
    const bValue = b.values.find((v) => v.columnName === field)?.text || "";

    return ascending
      ? aValue.localeCompare(bValue, undefined, { sensitivity: 'base' })
      : bValue.localeCompare(aValue, undefined, { sensitivity: 'base' });
  });
}