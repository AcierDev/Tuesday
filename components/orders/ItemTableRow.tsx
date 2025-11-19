"use client";

import { memo } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { ShippingCell } from "../cells/ShippingCell";
import { ItemTableCell } from "./ItemTableCell";
import { ItemActions } from "./ItemActions";
import { cn, isPastDue } from "@/utils/functions";
import {
  ColumnTitles,
  Item,
  ItemStatus,
  ColumnTypes,
  DayName,
} from "@/typings/types";
import { boardConfig } from "@/config/boardconfig";
import { StatusRadialMenu } from "./StatusRadialMenu";

interface ItemTableRowProps {
  item: Item;
  index: number;
  visibleColumns: ColumnTitles[];
  schedules: any;
  onContextMenu: (e: React.MouseEvent, item: Item) => void;
  onDaySelect: (itemId: string, date: Date) => void;
  onAddToSchedule: (
    weekKey: string,
    day: DayName,
    itemId: string
  ) => Promise<void>;
  onScheduleUpdate: () => void;
  onDelete: (item: Item) => void;
  onEdit: (item: Item) => void;
  onGetLabel: (item: Item) => void;
  onMarkCompleted: (itemId: string) => Promise<void>;
  onShip: (itemId: string) => Promise<void>;
  onStatusChange?: (itemId: string, newStatus: ItemStatus) => Promise<void>;
  clickToAddTarget?: { day: DayName; weekKey: string } | null;
  onItemClick?: (item: Item) => Promise<void>;
}

export const ItemTableRow = memo(function ItemTableRow({
  item,
  index,
  visibleColumns,
  schedules,
  onContextMenu,
  onDaySelect,
  onAddToSchedule,
  onScheduleUpdate,
  onDelete,
  onEdit,
  onGetLabel,
  onMarkCompleted,
  onShip,
  onStatusChange,
  clickToAddTarget,
  onItemClick,
}: ItemTableRowProps) {
  if (!item.id) {
    console.warn("Item missing id:", item);
    return null;
  }

  return (
    <TableRow
      className={cn(
        index % 2 === 0
          ? "bg-gray-200 dark:bg-gray-800"
          : "bg-gray-100 dark:bg-gray-700",
        isPastDue(item) &&
          item.status !== ItemStatus.Done &&
          "shadow-[inset_0_2px_8px_-2px_rgba(239,68,68,0.5),inset_0_-2px_8px_-2px_rgba(239,68,68,0.5)]",
        clickToAddTarget &&
          "cursor-crosshair hover:bg-blue-50 dark:hover:bg-blue-900/20"
      )}
      onClick={(e) => {
        if (clickToAddTarget) {
          e.preventDefault();
          onItemClick?.(item);
        }
      }}
      onContextMenu={(e) => {
        if (clickToAddTarget) {
          e.preventDefault();
          return;
        }
        onContextMenu(e, item);
      }}
    >
      <TableCell className="border border-gray-200 dark:border-gray-600 p-2 text-center relative">
        <StatusRadialMenu
          currentStatus={item.status}
          onStatusSelect={(newStatus) => onStatusChange?.(item.id, newStatus)}
        />
      </TableCell>

      {visibleColumns.includes("Shipping" as ColumnTitles) && (
        <TableCell className="border border-gray-200 dark:border-gray-600 p-2 text-center">
          <ShippingCell item={item} />
        </TableCell>
      )}

      {visibleColumns
        .filter((columnName) => columnName !== "Shipping")
        .map((columnName, cellIndex) => {
          // Reconstruct pseudo-column-value for the cell
          // This is a compatibility layer. Ideally cells should take raw values.
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

          const key = fieldMap[columnName];
          // Force the type for now as strings
          const textValue = key ? String(item[key] || "") : "";

          const columnValue: any = {
            columnName,
            type: boardConfig.columns[columnName]?.type || ColumnTypes.Text,
            text: textValue,
          };

          return (
            <ItemTableCell
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

      <TableCell className="border border-gray-200 dark:border-gray-600 p-2 text-center">
        <ItemActions
          item={item}
          onDelete={onDelete}
          onEdit={onEdit}
          onGetLabel={onGetLabel}
          onMarkCompleted={onMarkCompleted}
          onShip={onShip}
        />
      </TableCell>
    </TableRow>
  );
});
