"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { ShippingStatusIcon } from "./ShippingStatusIcon";
import { PreviewTableCell } from "./PreviewTableCell";
import { cn } from "@/utils/functions";
import {
  ColumnTitles,
  Item,
  ColumnTypes,
  DayName,
} from "@/typings/types";
import { boardConfig } from "@/config/boardconfig";

interface PreviewTableRowProps {
  item: Item;
  index: number;
  visibleColumns: ColumnTitles[];
  onDaySelect: (itemId: string, date: Date) => void;
  onAddToSchedule: (
    weekKey: string,
    day: DayName,
    itemId: string
  ) => Promise<void>;
  onScheduleUpdate: () => void;
}

export function PreviewTableRow({
  item,
  index,
  visibleColumns,
  onDaySelect,
  onAddToSchedule,
  onScheduleUpdate,
}: PreviewTableRowProps) {
  // Map column names to flat keys
  const fieldMap: Record<string, keyof Item> = {
    [ColumnTitles.Customer_Name]: "customerName",
    [ColumnTitles.Due]: "dueDate",
    [ColumnTitles.Design]: "design",
    [ColumnTitles.Size]: "size",
    [ColumnTitles.Painted]: "painted",
    [ColumnTitles.Backboard]: "backboard",
    [ColumnTitles.Glued]: "glued",
    [ColumnTitles.Packaging]: "packaging",
    [ColumnTitles.Boxes]: "boxes",
    [ColumnTitles.Notes]: "notes",
    [ColumnTitles.Rating]: "rating",
    [ColumnTitles.Shipping]: "shipping",
    [ColumnTitles.Labels]: "labels",
  };

  return (
    <TableRow
      key={item.id}
      className={cn(
        index % 2 === 0
          ? "bg-white dark:bg-gray-800"
          : "bg-gray-50 dark:bg-gray-800/60",
        "hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors duration-150"
      )}
    >
      <TableCell className="border-b border-gray-100 dark:border-gray-700/60 p-2 text-center">
        <ShippingStatusIcon orderId={item.id} />
      </TableCell>

      {visibleColumns
        .filter((columnName) => columnName !== "Shipping")
        .map((columnName, cellIndex) => {
          const fieldKey = fieldMap[columnName];
          const textValue = fieldKey ? (item[fieldKey] as string) : undefined;
          
          const columnValue = {
            columnName,
            type: boardConfig.columns[columnName]?.type || ColumnTypes.Text,
            text: textValue || "\u00A0", // Unicode non-breaking space
          };

          return (
            <PreviewTableCell
              key={`${item.id}-${columnName}`}
              item={item}
              columnValue={columnValue}
              columnName={columnName}
              cellIndex={cellIndex}
              onDaySelect={onDaySelect}
              onAddToSchedule={onAddToSchedule}
              onScheduleUpdate={onScheduleUpdate}
            />
          );
        })}
    </TableRow>
  );
}
