"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { ShippingStatusIcon } from "./ShippingStatusIcon";
import { PreviewTableCell } from "./PreviewTableCell";
import { cn, isPastDue } from "@/utils/functions";
import {
  ColumnTitles,
  Item,
  ItemStatus,
  ColumnTypes,
  DayName,
} from "@/typings/types";
import { boardConfig } from "@/config/boardconfig";

interface PreviewTableRowProps {
  item: Item;
  index: number;
  visibleColumns: ColumnTitles[];
  schedules: any;
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
  schedules,
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
          ? "bg-gray-200 dark:bg-gray-800"
          : "bg-gray-100 dark:bg-gray-700",
        isPastDue(item) &&
          item.status !== ItemStatus.Done &&
          "shadow-[inset_0_2px_8px_-2px_rgba(239,68,68,0.5),inset_0_-2px_8px_-2px_rgba(239,68,68,0.5)]"
      )}
    >
      <TableCell className="border border-gray-200 dark:border-gray-600 p-2 text-center">
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
              schedules={schedules}
              onDaySelect={onDaySelect}
              onAddToSchedule={onAddToSchedule}
              onScheduleUpdate={onScheduleUpdate}
            />
          );
        })}
    </TableRow>
  );
}
