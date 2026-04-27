"use client";

import { memo, useMemo } from "react";
import { GripVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { TableCell, TableRow } from "@/components/ui/table";
import { MergedShippingCell } from "../cells/MergedShippingCell";
import { ItemTableCell } from "./ItemTableCell";
import { ItemActions } from "./ItemActions";
import { cn } from "@/utils/functions";
import {
  Activity,
  ColumnTitles,
  Item,
  ItemStatus,
  ColumnTypes,
  DayName,
} from "@/typings/types";
import { boardConfig } from "@/config/boardconfig";
import { useActivities } from "@/lib/stats-shared";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";
import { useTodayScheduledIds } from "@/hooks/useTodayScheduledIds";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📂 "TODAY" FOLDER TAB                                                ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// Rows whose item is in today's planner lane get a manilla-folder treatment:
// a warm top edge plus a small "Today" tab nub sticking up from the row.
const TODAY_TAB_LEFT_PX = 12;
const TODAY_TAB_OVERLAP_PX = 4; // tab dips into the row this much for a seamless join

// Item ids whose most recent status_change activity falls inside the
// `recentEditHours` window. Computed once per (activities, hours) pair and
// shared across every row via the module-level cache so that mounting N
// rows doesn't recompute N times.
let recentlyMovedCache: {
  activities: Activity[];
  hours: number;
  set: Set<string>;
} | null = null;

function useRecentlyMovedIds(): Set<string> {
  const { activities } = useActivities();
  const { settings } = useOrderSettings();
  const hours = settings.recentEditHours;

  return useMemo(() => {
    if (!activities || hours === undefined) return new Set<string>();
    if (
      recentlyMovedCache &&
      recentlyMovedCache.activities === activities &&
      recentlyMovedCache.hours === hours
    ) {
      return recentlyMovedCache.set;
    }
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const set = new Set<string>();
    for (const a of activities) {
      if (a.type !== "status_change") continue;
      if (a.timestamp >= cutoff) set.add(a.itemId);
    }
    recentlyMovedCache = { activities, hours, set };
    return set;
  }, [activities, hours]);
}

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
  // Row is draggable — drop on a status section to change status. Listeners
  // live only on the grip cell so the rest of the row stays interactive.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });

  const recentlyMoved = useRecentlyMovedIds().has(item.id);
  const isToday = useTodayScheduledIds().has(item.id);

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
        isToday &&
          "[&>td]:border-t-2 [&>td]:border-t-amber-400 dark:[&>td]:border-t-amber-500",
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
      <TableCell className="border-b border-gray-100 dark:border-gray-700/60 p-0 relative w-7 sm:w-[3.125rem]">
        <div
          {...listeners}
          {...attributes}
          className="flex items-center justify-center w-full h-full py-2 cursor-grab active:cursor-grabbing touch-none text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          aria-label="Drag to change status"
          role="button"
        >
          <GripVertical className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        {recentlyMoved && (
          <span
            aria-label="Moved recently"
            className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500"
          />
        )}
        {isToday && (
          <span
            aria-label="Planned for today"
            className="pointer-events-none absolute z-20 flex items-center h-5 px-2 rounded-t-md bg-amber-400 dark:bg-amber-500 text-amber-950 text-[10px] font-bold uppercase tracking-wide shadow-sm"
            style={{
              left: TODAY_TAB_LEFT_PX,
              top: -(20 - TODAY_TAB_OVERLAP_PX),
            }}
          >
            Today
          </span>
        )}
      </TableCell>

      {visibleColumns.includes("Shipping" as ColumnTitles) && (
        <TableCell className="border-b border-gray-100 dark:border-gray-700/60 p-0 text-center w-8 sm:w-[3.625rem]">
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
