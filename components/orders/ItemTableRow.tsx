"use client";

import { Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
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
}

export function ItemTableRow({
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
}: ItemTableRowProps) {
  if (!item.id) {
    console.warn("Item missing id:", item);
    return null;
  }

  return (
    <Draggable key={item.id} draggableId={item.id.toString()} index={index}>
      {(provided, snapshot) => (
        <TableRow
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            index % 2 === 0
              ? "bg-gray-200 dark:bg-gray-800"
              : "bg-gray-100 dark:bg-gray-700",
            isPastDue(item) &&
              item.status !== ItemStatus.Done &&
              "shadow-[inset_0_2px_8px_-2px_rgba(239,68,68,0.5),inset_0_-2px_8px_-2px_rgba(239,68,68,0.5)]",
            snapshot.isDragging ? "bg-blue-100 dark:bg-blue-800 shadow-lg" : ""
          )}
          onContextMenu={(e) => onContextMenu(e, item)}
        >
          <TableCell className="border border-gray-200 dark:border-gray-600 p-2 text-center relative">
            <GripVertical className="cursor-grab inline-block" />
          </TableCell>

          {visibleColumns.includes("Shipping" as ColumnTitles) && (
            <TableCell className="border border-gray-200 dark:border-gray-600 p-2 text-center">
              <ShippingCell item={item} />
            </TableCell>
          )}

          {visibleColumns
            .filter((columnName) => columnName !== "Shipping")
            .map((columnName, cellIndex) => {
              const columnValue = item.values.find(
                (value) => value.columnName === columnName
              ) || {
                columnName,
                type: boardConfig.columns[columnName]?.type || ColumnTypes.Text,
                text: "\u00A0", // Unicode non-breaking space
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
      )}
    </Draggable>
  );
}
