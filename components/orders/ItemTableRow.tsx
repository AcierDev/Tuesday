"use client";

import { memo, useMemo } from "react";
import { GripVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { TableCell, TableRow } from "@/components/ui/table";
import { MergedShippingCell } from "../cells/MergedShippingCell";
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

interface ItemTableRowProps {
  item: Item;
  index: number;
  visibleColumns: ColumnTitles[];
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
  const pastDue = useMemo(() => isPastDue(item), [item.dueDate]);

  // Row is draggable — drop on a status section to change status. Listeners
  // live only on the grip cell so the rest of the row stays interactive.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });

  if (!item.id) {
    console.warn("Item missing id:", item);
    return null;
  }

  return (
    <TableRow
      ref={setNodeRef}
      className={cn(
        "select-none",
        index % 2 === 0
          ? "bg-white dark:bg-gray-800"
          : "bg-gray-50 dark:bg-gray-800/60",
        "hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors duration-200",
        pastDue &&
          item.status !== ItemStatus.Done &&
          "shadow-[inset_0_2px_8px_-2px_rgba(239,68,68,0.5),inset_0_-2px_8px_-2px_rgba(239,68,68,0.5)]",
        clickToAddTarget &&
          "cursor-crosshair hover:bg-blue-50 dark:hover:bg-blue-900/20",
        isDragging && "opacity-30"
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
      <TableCell className="border-b border-gray-100 dark:border-gray-700/60 p-0 relative w-[3.125rem]">
        <div
          {...listeners}
          {...attributes}
          className="flex items-center justify-center w-full h-full py-2 cursor-grab active:cursor-grabbing touch-none text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          aria-label="Drag to change status"
          role="button"
        >
          <GripVertical className="h-5 w-5" />
        </div>
      </TableCell>

      {visibleColumns.includes("Shipping" as ColumnTitles) && (
        <TableCell className="border-b border-gray-100 dark:border-gray-700/60 p-0 text-center w-[3.625rem]">
          <MergedShippingCell item={item} />
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
              onDaySelect={onDaySelect}
              onAddToSchedule={onAddToSchedule}
              onScheduleUpdate={onScheduleUpdate}
            />
          );
        })}

      <TableCell className="border-b border-gray-100 dark:border-gray-700/60 p-0 text-center w-8">
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
