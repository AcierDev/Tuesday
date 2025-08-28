"use client";

import { useCallback, useRef, useState } from "react";
import { TableCell } from "@/components/ui/table";
import { Portal } from "@/components/ui/portal";
import { CustomTableCell } from "../cells/CustomTableCell";
import { ItemPreviewTooltip } from "./ItemPreviewTooltip";
import { DueDateTooltip } from "./DueDateTooltip";
import { cn } from "@/utils/functions";
import { ColumnTitles, Item, ColumnValue, DayName } from "@/typings/types";
import { getStatusColor } from "./ItemGroup";

interface PreviewTableCellProps {
  item: Item;
  columnValue: ColumnValue;
  columnName: ColumnTitles;
  cellIndex: number;
  schedules: any;
  onDaySelect: (itemId: string, date: Date) => void;
  onAddToSchedule: (
    weekKey: string,
    day: DayName,
    itemId: string
  ) => Promise<void>;
  onScheduleUpdate: () => void;
}

export function PreviewTableCell({
  item,
  columnValue,
  columnName,
  cellIndex,
  schedules,
  onDaySelect,
  onAddToSchedule,
  onScheduleUpdate,
}: PreviewTableCellProps) {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<ColumnTitles | null>(null);
  const [isPreviewTooltipHovered, setIsPreviewTooltipHovered] = useState(false);
  const [isDueDateTooltipHovered, setIsDueDateTooltipHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();
  const closeTimeoutRef = useRef<NodeJS.Timeout>();
  const hoveredElementRef = useRef<HTMLElement | null>(null);
  const ignoreHoverRef = useRef(false);

  const handlePreviewMouseEnter = useCallback(
    (itemId: string, columnName: ColumnTitles, element: HTMLElement) => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      hoveredElementRef.current = element;
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredItemId(itemId);
        setHoveredColumn(columnName);
      }, 1000);
    },
    []
  );

  const handlePreviewMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      if (!isPreviewTooltipHovered) {
        setHoveredItemId(null);
        setHoveredColumn(null);
      }
    }, 300);
  }, [isPreviewTooltipHovered]);

  const handleMouseEnter = useCallback(
    (itemId: string, columnName: ColumnTitles, element: HTMLElement) => {
      if (ignoreHoverRef.current) return;

      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);

      hoveredElementRef.current = element;
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredItemId(itemId);
        setHoveredColumn(columnName);
      }, 1000);
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    closeTimeoutRef.current = setTimeout(() => {
      if (!isDueDateTooltipHovered) {
        setHoveredItemId(null);
        setHoveredColumn(null);
        ignoreHoverRef.current = false;
      }
    }, 300);
  }, [isDueDateTooltipHovered]);

  const handleDueDateClick = useCallback(() => {
    ignoreHoverRef.current = true;
    setHoveredItemId(null);
    setHoveredColumn(null);
  }, []);

  const showPreviewTooltip =
    hoveredItemId === item.id && hoveredColumn === columnName;
  const isPreviewColumn =
    columnName === ColumnTitles.Size || columnName === ColumnTitles.Design;
  const isDueDateColumn = columnName === ColumnTitles.Due;

  return (
    <TableCell
      key={`${item.id}-${columnName}`}
      className={cn(
        "border border-gray-200 dark:border-gray-600 p-2 relative",
        cellIndex === 0 ? "w-1/3" : "",
        columnName === ColumnTitles.Labels ? "w-8 flex-shrink-0" : "",
        getStatusColor(columnValue)
      )}
      onMouseEnter={(e) => {
        if (isPreviewColumn || isDueDateColumn) {
          if (isPreviewColumn) {
            handlePreviewMouseEnter(item.id, columnName, e.currentTarget);
          } else {
            handleMouseEnter(item.id, columnName, e.currentTarget);
          }
        }
      }}
      onMouseLeave={() => {
        if (isPreviewColumn) {
          handlePreviewMouseLeave();
        } else if (isDueDateColumn) {
          handleMouseLeave();
        }
      }}
    >
      {isPreviewColumn ? (
        <>
          <CustomTableCell
            columnValue={columnValue}
            isNameColumn={cellIndex === 0}
            item={item}
          />
          {showPreviewTooltip && (
            <Portal>
              <div
                className="fixed pointer-events-none"
                style={{
                  top:
                    hoveredElementRef.current?.getBoundingClientRect().top || 0,
                  left:
                    hoveredElementRef.current?.getBoundingClientRect().right ||
                    0,
                  zIndex: 9999,
                }}
              >
                <div className="pointer-events-auto">
                  <ItemPreviewTooltip
                    item={item}
                    onMouseEnter={() => setIsPreviewTooltipHovered(true)}
                    onMouseLeave={() => {
                      setIsPreviewTooltipHovered(false);
                      setHoveredItemId(null);
                      setHoveredColumn(null);
                    }}
                  />
                </div>
              </div>
            </Portal>
          )}
        </>
      ) : isDueDateColumn ? (
        <>
          <div onClick={handleDueDateClick} className="relative">
            {item.isScheduled && (
              <div
                className="absolute -left-2 -top-[10px] w-3 h-3 bg-amber-400"
                style={{
                  borderBottomRightRadius: "100%",
                  borderTopRightRadius: "0",
                  borderBottomLeftRadius: "0",
                  borderTopLeftRadius: "0",
                }}
              />
            )}
            <div className="relative">
              <CustomTableCell
                columnValue={columnValue}
                isNameColumn={cellIndex === 0}
                item={item}
              />
            </div>
          </div>
          {showPreviewTooltip &&
            hoveredColumn === ColumnTitles.Due &&
            !ignoreHoverRef.current && (
              <Portal>
                <div
                  className="fixed pointer-events-none"
                  style={{
                    top:
                      hoveredElementRef.current?.getBoundingClientRect().top ||
                      0,
                    left:
                      hoveredElementRef.current?.getBoundingClientRect()
                        .right || 0,
                    zIndex: 9999,
                  }}
                >
                  <div className="pointer-events-auto">
                    <DueDateTooltip
                      onSelectDay={(date) => onDaySelect(item.id, date)}
                      onMouseEnter={() => setIsDueDateTooltipHovered(true)}
                      onMouseLeave={() => {
                        setIsDueDateTooltipHovered(false);
                        setHoveredItemId(null);
                        setHoveredColumn(null);
                      }}
                      item={item}
                      schedules={schedules}
                      onAddToSchedule={onAddToSchedule}
                      onScheduleUpdate={onScheduleUpdate}
                    />
                  </div>
                </div>
              </Portal>
            )}
        </>
      ) : (
        <CustomTableCell
          columnValue={columnValue}
          isNameColumn={columnName === ColumnTitles.Customer_Name}
          item={item}
        />
      )}
    </TableCell>
  );
}
