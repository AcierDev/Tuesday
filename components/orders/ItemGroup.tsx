"use client";

import { Draggable, Droppable } from "@hello-pangea/dnd";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  GripVertical,
  ChevronDown,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { addDays, format, isSameDay } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { itemSortFuncs } from "@/utils/itemSortFuncs";

import { useOrderSettings } from "../../contexts/OrderSettingsContext";
import {
  ColumnTitles,
  ColumnTypes,
  Group,
  Item,
  ItemStatus,
} from "../../typings/types";
import { cn, isPastDue } from "../../utils/functions";
import { CustomTableCell } from "../cells/CustomTableCell";
import { DeleteConfirmationDialog } from "../ui/DeleteConfirmationDialog";

import { EditItemDialog } from "./EditItemDialog";
import { ItemActions } from "./ItemActions";
import { BorderedTable } from "./BoarderedTable";
import { DEFAULT_COLUMN_VISIBILITY, STATUS_COLORS } from "@/typings/constants";
import { boardConfig } from "@/config/boardconfig";
import { ItemPreviewTooltip } from "./ItemPreviewTooltip";
import { Portal } from "@/components/ui/portal";
import { DueDateTooltip } from "./DueDateTooltip";
import { ShippingStatusIcon } from "./ShippingStatusIcon";
import { ShippingCell } from "../cells/ShippingCell";
import { useOrderStore } from "@/stores/useOrderStore";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeeklyScheduleStore } from "@/stores/useWeeklyScheduleStore";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

const GROUP_COLORS = {
  ...STATUS_COLORS,
  Hidden: "gray-500",
} as const;

interface ItemGroupProps {
  group: Group;
  onDelete: (itemId: string) => Promise<void>;
  onShip: (itemId: string) => Promise<void>;
  onMarkCompleted: (itemId: string) => Promise<void>;
  onGetLabel: (item: Item) => void;
  onReorder?: (newItems: Item[]) => void;
  isPreview?: boolean;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function ItemGroupSection({
  group,
  onDelete,
  onShip,
  onMarkCompleted,
  onGetLabel,
  isPreview = false,
  isCollapsible = false,
  defaultCollapsed = true,
  ...props
}: ItemGroupProps) {
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const { settings } = useOrderSettings();
  const [sortColumn, setSortColumn] = useState<ColumnTitles | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: Item;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<ColumnTitles | null>(null);
  const [isPreviewTooltipHovered, setIsPreviewTooltipHovered] = useState(false);
  const [isDueDateTooltipHovered, setIsDueDateTooltipHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();
  const closeTimeoutRef = useRef<NodeJS.Timeout>();
  const hoveredElementRef = useRef<HTMLElement | null>(null);
  const [showDueDateTooltip, setShowDueDateTooltip] = useState(false);
  const ignoreHoverRef = useRef(false);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const { schedules, addItemToDay } = useWeeklyScheduleStore();

  const {
    loadDoneItems,
    removeDoneItems,
    doneItemsLoaded,
    loadHiddenItems,
    removeHiddenItems,
    hiddenItemsLoaded,
    updateItem,
  } = useOrderStore();

  const handleScheduleUpdate = useCallback(() => {
    const event = new CustomEvent("weeklyScheduleUpdate");
    window.dispatchEvent(event);
  }, []);

  const handleEdit = useCallback((item: Item) => {
    console.log("Editing item:", item);
    setEditingItem(item);
    setContextMenu(null);
  }, []);

  const handleSaveEdit = useCallback(
    async (updatedItem: Item) => {
      if (updatedItem) {
        console.log("Saving edited item:", updatedItem);
        try {
          await updateItem(updatedItem);
          setEditingItem(null);
          console.log("Item updated successfully");
          toast.success("Item updated successfully", {
            style: { background: "#10B981", color: "white" },
          });
        } catch (error) {
          console.error("Failed to update item:", error);
          toast.error("Failed to update item. Please try again.", {
            style: { background: "#EF4444", color: "white" },
          });
        }
      }
    },
    [updateItem]
  );

  const handleDelete = useCallback((item: Item) => {
    console.log("Deleting item:", item);
    setDeletingItem(item);
    setContextMenu(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (deletingItem) {
      console.log("Confirming delete for item:", deletingItem);
      await onDelete(deletingItem.id);
      setDeletingItem(null);
    }
  }, [deletingItem, onDelete]);

  const handleSort = useCallback(
    (column: ColumnTitles) => {
      if (sortColumn === column) {
        if (sortDirection === "asc") {
          setSortDirection("desc");
        } else if (sortDirection === "desc") {
          setSortDirection(null);
          setSortColumn(null);
        } else {
          setSortDirection("asc");
        }
      } else {
        setSortColumn(column);
        setSortDirection("asc");
      }
    },
    [sortColumn, sortDirection]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent, item: Item) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        closeContextMenu();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [closeContextMenu]);

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

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const visibleColumns = Object.entries(
    settings.columnVisibility[group.title as ItemStatus] ||
      DEFAULT_COLUMN_VISIBILITY
  )
    .filter(([_, isVisible]) => isVisible)
    .map(([columnName]) => columnName as ColumnTitles);

  const sortedItems = useMemo(() => {
    let items = [...group.items];

    // First sort by index
    items.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    // Then apply column sorting if specified
    if (sortColumn && sortDirection && itemSortFuncs[sortColumn]) {
      items = itemSortFuncs[sortColumn](items, sortDirection === "asc");
    }

    return items;
  }, [group.items, sortColumn, sortDirection]);

  const handleDaySelect = useCallback(
    async (itemId: string, selectedDate: Date) => {
      const item = sortedItems.find((i) => i.id === itemId);
      if (!item) return;

      const updatedItem = {
        ...item,
        values: item.values.map((v) =>
          v.columnName === ColumnTitles.Due
            ? { ...v, text: format(selectedDate, "yyyy-MM-dd") }
            : v
        ),
      };

      try {
        await updateItem(updatedItem);
        setShowDueDateTooltip(false);
        setIsDueDateTooltipHovered(false);
      } catch (error) {
        console.error("Failed to update due date:", error);
      }
    },
    [sortedItems, updateItem]
  );

  const handleDueDateClick = useCallback(() => {
    ignoreHoverRef.current = true;
    setHoveredItemId(null);
    setHoveredColumn(null);
  }, []);

  const handleGroupClick = useCallback(() => {
    if (!isCollapsible) return;

    setIsCollapsed(!isCollapsed);
    if (group.title === ItemStatus.Done) {
      if (isCollapsed) {
        loadDoneItems();
      } else {
        removeDoneItems();
      }
    } else if (group.title === "Hidden") {
      if (isCollapsed) {
        loadHiddenItems();
      } else {
        removeHiddenItems();
      }
    }
  }, [
    isCollapsible,
    isCollapsed,
    group.title,
    loadDoneItems,
    removeDoneItems,
    loadHiddenItems,
    removeHiddenItems,
  ]);

  const shouldShowSkeleton =
    (group.title === ItemStatus.Done && !doneItemsLoaded) ||
    (group.title === "Hidden" && !hiddenItemsLoaded);

  const renderSkeletonRows = useCallback(() => {
    return Array(3)
      .fill(0)
      .map((_, index) => (
        <TableRow
          key={`skeleton-${index}`}
          className={cn(
            index % 2 === 0
              ? "bg-gray-200 dark:bg-gray-800"
              : "bg-gray-100 dark:bg-gray-700"
          )}
        >
          <TableCell className="border border-gray-200 dark:border-gray-600 p-2 text-center">
            <Skeleton className="h-6 w-6 mx-auto" />
          </TableCell>
          {visibleColumns.map((columnName, i) => (
            <TableCell
              key={`${index}-${columnName}`}
              className="border border-gray-200 dark:border-gray-600 p-2"
            >
              <Skeleton className="h-6 w-full" />
            </TableCell>
          ))}
          <TableCell className="border border-gray-200 dark:border-gray-600 p-2 text-center">
            <Skeleton className="h-6 w-20 mx-auto" />
          </TableCell>
          <TableCell className="border border-gray-200 dark:border-gray-600 p-2 text-center">
            <div className="flex justify-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </TableCell>
        </TableRow>
      ));
  }, [visibleColumns]);

  return (
    <div
      className={cn(
        "mb-6 bg-white dark:bg-gray-900 rounded-lg overflow-visible"
      )}
    >
      <div
        className={cn(
          `w-full p-4`,
          `text-${
            GROUP_COLORS[group.title as keyof typeof GROUP_COLORS]
          } dark:text-${
            GROUP_COLORS[group.title as keyof typeof GROUP_COLORS]
          }`,
          "sticky top-[73px] z-30 bg-white dark:bg-gray-900",
          isCollapsible &&
            "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800",
          isCollapsed && "bg-gray-50 dark:bg-blue-900/10 rounded-lg"
        )}
        onClick={handleGroupClick}
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold text-lg sticky top-0 z-10">
            {group.title}
          </span>
          {isCollapsible && (
            <ChevronDown
              className={cn(
                "h-5 w-5 transition-transform duration-200",
                !isCollapsed && "transform rotate-180"
              )}
            />
          )}
        </div>
      </div>
      {(!isCollapsible || !isCollapsed) && (
        <div className="relative overflow-visible">
          {!isPreview ? (
            <Droppable droppableId={group.title}>
              {(provided, snapshot) => (
                <BorderedTable
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  borderColor={`bg-${
                    GROUP_COLORS[group.title as keyof typeof GROUP_COLORS]
                  }`}
                >
                  <TableHeader className="sticky top-[132px] z-20 bg-gray-100 dark:bg-gray-700 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_6px_-1px_rgba(255,255,255,0.1),0_2px_4px_-2px_rgba(255,255,255,0.1)]">
                    <TableRow>
                      <TableHead className="border border-gray-200 dark:border-gray-600 p-2 text-center">
                        Order
                      </TableHead>
                      {visibleColumns.includes("Shipping" as ColumnTitles) && (
                        <TableHead className="border border-gray-200 dark:border-gray-600 p-2 text-center w-12">
                          Shipping
                        </TableHead>
                      )}
                      {visibleColumns.map((columnName) => (
                        <TableHead
                          key={columnName}
                          className={cn(
                            "border border-gray-200 dark:border-gray-600 p-2 text-center",
                            columnName === ColumnTitles.Customer_Name
                              ? "w-1/3"
                              : ""
                          )}
                        >
                          <Button
                            className="h-8 flex items-center justify-center gap-2 w-full text-gray-900 dark:text-gray-400"
                            disabled={isDragging}
                            variant="ghost"
                            onClick={() =>
                              !isDragging && handleSort(columnName)
                            }
                          >
                            <span>{columnName}</span>
                            {settings.showSortingIcons ? (
                              sortColumn === columnName ? (
                                sortDirection === "asc" ? (
                                  <ArrowUp className="h-4 w-4" />
                                ) : sortDirection === "desc" ? (
                                  <ArrowDown className="h-4 w-4" />
                                ) : (
                                  <ArrowUpDown className="h-4 w-4" />
                                )
                              ) : (
                                <ArrowUpDown className="h-4 w-4" />
                              )
                            ) : null}
                          </Button>
                        </TableHead>
                      ))}
                      <TableHead className="border border-gray-200 dark:border-gray-600 p-2 text-center">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody key={`${group.title}-body`}>
                    {shouldShowSkeleton
                      ? renderSkeletonRows()
                      : sortedItems.map((item, index) => {
                          if (!item.id) {
                            console.warn("Item missing id:", item);
                            return null;
                          }

                          return (
                            <Draggable
                              key={item.id}
                              draggableId={item.id.toString()}
                              index={index}
                            >
                              {(provided, snapshot) => {
                                return (
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
                                      snapshot.isDragging
                                        ? "bg-blue-100 dark:bg-blue-800 shadow-lg"
                                        : ""
                                    )}
                                    onContextMenu={(e) =>
                                      handleContextMenu(e, item)
                                    }
                                  >
                                    <TableCell className="border border-gray-200 dark:border-gray-600 p-2 text-center relative">
                                      <GripVertical className="cursor-grab inline-block" />
                                    </TableCell>
                                    {visibleColumns.includes(
                                      "Shipping" as ColumnTitles
                                    ) && (
                                      <TableCell className="border border-gray-200 dark:border-gray-600 p-2 text-center">
                                        <ShippingCell item={item} />
                                      </TableCell>
                                    )}
                                    {visibleColumns.map(
                                      (columnName, cellIndex) => {
                                        const columnValue = item.values.find(
                                          (value) =>
                                            value.columnName === columnName
                                        ) || {
                                          columnName,
                                          type:
                                            boardConfig.columns[columnName]
                                              ?.type || ColumnTypes.Text,
                                          text: "\u00A0", // Unicode non-breaking space
                                        };
                                        const showPreviewTooltip =
                                          hoveredItemId === item.id &&
                                          hoveredColumn === columnName;
                                        return (
                                          <TableCell
                                            key={`${item.id}-${columnName}`}
                                            className={cn(
                                              "border border-gray-200 dark:border-gray-600 p-2 relative",
                                              cellIndex === 0 ? "w-1/3" : "",
                                              getStatusColor(columnValue)
                                            )}
                                            onMouseEnter={(e) => {
                                              if (
                                                columnName ===
                                                  ColumnTitles.Size ||
                                                columnName ===
                                                  ColumnTitles.Design
                                              ) {
                                                handlePreviewMouseEnter(
                                                  item.id,
                                                  columnName,
                                                  e.currentTarget
                                                );
                                              } else if (
                                                columnName === ColumnTitles.Due
                                              ) {
                                                handleMouseEnter(
                                                  item.id,
                                                  columnName,
                                                  e.currentTarget
                                                );
                                              }
                                            }}
                                            onMouseLeave={(e) => {
                                              if (
                                                columnName ===
                                                  ColumnTitles.Size ||
                                                columnName ===
                                                  ColumnTitles.Design
                                              ) {
                                                handlePreviewMouseLeave();
                                              } else if (
                                                columnName === ColumnTitles.Due
                                              ) {
                                                handleMouseLeave();
                                              }
                                            }}
                                          >
                                            {columnName === ColumnTitles.Size ||
                                            columnName ===
                                              ColumnTitles.Design ? (
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
                                                          hoveredElementRef.current?.getBoundingClientRect()
                                                            .top || 0,
                                                        left:
                                                          hoveredElementRef.current?.getBoundingClientRect()
                                                            .right || 0,
                                                        zIndex: 9999,
                                                      }}
                                                    >
                                                      <div className="pointer-events-auto">
                                                        <ItemPreviewTooltip
                                                          item={item}
                                                          onMouseEnter={() =>
                                                            setIsPreviewTooltipHovered(
                                                              true
                                                            )
                                                          }
                                                          onMouseLeave={() => {
                                                            setIsPreviewTooltipHovered(
                                                              false
                                                            );
                                                            setHoveredItemId(
                                                              null
                                                            );
                                                            setHoveredColumn(
                                                              null
                                                            );
                                                          }}
                                                        />
                                                      </div>
                                                    </div>
                                                  </Portal>
                                                )}
                                              </>
                                            ) : columnValue.columnName ===
                                              ColumnTitles.Due ? (
                                              <>
                                                <div
                                                  onClick={handleDueDateClick}
                                                  className="relative"
                                                >
                                                  <div className="relative">
                                                    <CustomTableCell
                                                      columnValue={columnValue}
                                                      isNameColumn={
                                                        cellIndex === 0
                                                      }
                                                      item={item}
                                                    />
                                                  </div>
                                                </div>
                                                {showPreviewTooltip &&
                                                  hoveredColumn ===
                                                    ColumnTitles.Due &&
                                                  !ignoreHoverRef.current && (
                                                    <Portal>
                                                      <div
                                                        className="fixed pointer-events-none"
                                                        style={{
                                                          top:
                                                            hoveredElementRef.current?.getBoundingClientRect()
                                                              .top || 0,
                                                          left:
                                                            hoveredElementRef.current?.getBoundingClientRect()
                                                              .right || 0,
                                                          zIndex: 9999,
                                                        }}
                                                      >
                                                        <div className="pointer-events-auto">
                                                          <DueDateTooltip
                                                            onSelectDay={(
                                                              date
                                                            ) =>
                                                              handleDaySelect(
                                                                item.id,
                                                                date
                                                              )
                                                            }
                                                            onMouseEnter={() =>
                                                              setIsDueDateTooltipHovered(
                                                                true
                                                              )
                                                            }
                                                            onMouseLeave={() => {
                                                              setIsDueDateTooltipHovered(
                                                                false
                                                              );
                                                              setHoveredItemId(
                                                                null
                                                              );
                                                              setHoveredColumn(
                                                                null
                                                              );
                                                            }}
                                                            item={item}
                                                            schedules={
                                                              schedules
                                                            }
                                                            onAddToSchedule={
                                                              addItemToDay
                                                            }
                                                            onScheduleUpdate={
                                                              handleScheduleUpdate
                                                            }
                                                          />
                                                        </div>
                                                      </div>
                                                    </Portal>
                                                  )}
                                              </>
                                            ) : (
                                              <CustomTableCell
                                                columnValue={columnValue}
                                                isNameColumn={cellIndex === 0}
                                                item={item}
                                              />
                                            )}
                                          </TableCell>
                                        );
                                      }
                                    )}
                                    <TableCell className="border border-gray-200 dark:border-gray-600 p-2 text-center">
                                      <ItemActions
                                        item={item}
                                        onDelete={handleDelete}
                                        onEdit={handleEdit}
                                        onGetLabel={onGetLabel}
                                        onMarkCompleted={onMarkCompleted}
                                        onShip={onShip}
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              }}
                            </Draggable>
                          );
                        })}
                    {provided.placeholder}
                  </TableBody>
                </BorderedTable>
              )}
            </Droppable>
          ) : (
            <BorderedTable
              borderColor={`bg-${
                GROUP_COLORS[group.title as keyof typeof GROUP_COLORS]
              }`}
            >
              <TableHeader className="sticky top-[132px] z-20 bg-gray-100 dark:bg-gray-700 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]">
                <TableRow>
                  <TableHead className="border border-gray-200 dark:border-gray-600 p-2 text-center w-12">
                    Status
                  </TableHead>
                  {visibleColumns.map((columnName) => (
                    <TableHead
                      key={columnName}
                      className={cn(
                        "border border-gray-200 dark:border-gray-600 p-2 text-center",
                        columnName === ColumnTitles.Customer_Name ? "w-1/3" : ""
                      )}
                    >
                      <Button
                        className="h-8 flex items-center justify-between w-full"
                        disabled={isDragging}
                        variant="ghost"
                        onClick={() => !isDragging && handleSort(columnName)}
                      >
                        {columnName}
                        {settings.showSortingIcons ? (
                          sortColumn === columnName ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="ml-2 h-4 w-4" />
                            ) : sortDirection === "desc" ? (
                              <ArrowDown className="ml-2 h-4 w-4" />
                            ) : (
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            )
                          ) : (
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          )
                        ) : null}
                      </Button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody key={`${group.title}-preview-body`}>
                {shouldShowSkeleton
                  ? renderSkeletonRows()
                  : sortedItems.map((item, index) => (
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
                        {visibleColumns.map((columnName, cellIndex) => {
                          const columnValue = item.values.find(
                            (value) => value.columnName === columnName
                          ) || {
                            columnName,
                            type:
                              boardConfig.columns[columnName]?.type ||
                              ColumnTypes.Text,
                            text: "\u00A0", // Unicode non-breaking space
                          };
                          const showPreviewTooltip =
                            hoveredItemId === item.id &&
                            hoveredColumn === columnName;
                          return (
                            <TableCell
                              key={`${item.id}-${columnName}`}
                              className={cn(
                                "border border-gray-200 dark:border-gray-600 p-2 relative",
                                cellIndex === 0 ? "w-1/3" : "",
                                getStatusColor(columnValue)
                              )}
                              onMouseEnter={(e) => {
                                if (
                                  columnName === ColumnTitles.Size ||
                                  columnName === ColumnTitles.Design
                                ) {
                                  handlePreviewMouseEnter(
                                    item.id,
                                    columnName,
                                    e.currentTarget
                                  );
                                } else if (columnName === ColumnTitles.Due) {
                                  handleMouseEnter(
                                    item.id,
                                    columnName,
                                    e.currentTarget
                                  );
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (
                                  columnName === ColumnTitles.Size ||
                                  columnName === ColumnTitles.Design
                                ) {
                                  handlePreviewMouseLeave();
                                } else if (columnName === ColumnTitles.Due) {
                                  handleMouseLeave();
                                }
                              }}
                            >
                              {columnName === ColumnTitles.Size ||
                              columnName === ColumnTitles.Design ? (
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
                                            hoveredElementRef.current?.getBoundingClientRect()
                                              .top || 0,
                                          left:
                                            hoveredElementRef.current?.getBoundingClientRect()
                                              .right || 0,
                                          zIndex: 9999,
                                        }}
                                      >
                                        <div className="pointer-events-auto">
                                          <ItemPreviewTooltip
                                            item={item}
                                            onMouseEnter={() =>
                                              setIsPreviewTooltipHovered(true)
                                            }
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
                              ) : columnValue.columnName ===
                                ColumnTitles.Due ? (
                                <>
                                  <div
                                    onClick={handleDueDateClick}
                                    className="relative"
                                  >
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
                                              hoveredElementRef.current?.getBoundingClientRect()
                                                .top || 0,
                                            left:
                                              hoveredElementRef.current?.getBoundingClientRect()
                                                .right || 0,
                                            zIndex: 9999,
                                          }}
                                        >
                                          <div className="pointer-events-auto">
                                            <DueDateTooltip
                                              onSelectDay={(date) =>
                                                handleDaySelect(item.id, date)
                                              }
                                              onMouseEnter={() =>
                                                setIsDueDateTooltipHovered(true)
                                              }
                                              onMouseLeave={() => {
                                                setIsDueDateTooltipHovered(
                                                  false
                                                );
                                                setHoveredItemId(null);
                                                setHoveredColumn(null);
                                              }}
                                              item={item}
                                              schedules={schedules}
                                              onAddToSchedule={addItemToDay}
                                              onScheduleUpdate={
                                                handleScheduleUpdate
                                              }
                                            />
                                          </div>
                                        </div>
                                      </Portal>
                                    )}
                                </>
                              ) : (
                                <CustomTableCell
                                  columnValue={columnValue}
                                  isNameColumn={cellIndex === 0}
                                  item={item}
                                />
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
              </TableBody>
            </BorderedTable>
          )}
        </div>
      )}
      <EditItemDialog
        editingItem={editingItem}
        handleSaveEdit={handleSaveEdit}
        setEditingItem={setEditingItem}
      />
      <DeleteConfirmationDialog
        isOpen={Boolean(deletingItem)}
        itemName={
          deletingItem?.values.find(
            (v) => v.columnName === ColumnTitles.Customer_Name
          )?.text || "Unknown"
        }
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
      />
      {contextMenu ? (
        <div
          ref={contextMenuRef}
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000,
          }}
        >
          <DropdownMenu open>
            <DropdownMenuContent>
              <ItemActions
                item={contextMenu.item}
                showTrigger={false}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onGetLabel={onGetLabel}
                onMarkCompleted={onMarkCompleted}
                onShip={onShip}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </div>
  );
}

function getStatusColor(columnValue: {
  columnName: string;
  type: ColumnTypes;
  text?: string;
}): string {
  if (columnValue.type === ColumnTypes.Dropdown) {
    switch (columnValue.text?.toLowerCase()) {
      case "done":
        return "bg-green-200 dark:bg-green-800";
      case "working on it":
        return "bg-yellow-100 dark:bg-yellow-800";
      case "stuck":
        return "bg-red-200 dark:bg-red-800";
      default:
        return "";
    }
  }
  return "";
}
