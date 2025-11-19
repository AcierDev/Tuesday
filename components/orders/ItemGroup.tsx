"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

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
  DayName,
} from "../../typings/types";
import { cn } from "../../utils/functions";
import { DeleteConfirmationDialog } from "../ui/DeleteConfirmationDialog";

import { EditItemDialog } from "./EditItemDialog";
import { ItemActions } from "./ItemActions";
import { BorderedTable } from "./BoarderedTable";
import { ItemTableRow } from "./ItemTableRow";
import { PreviewTableRow } from "./PreviewTableRow";
import { DEFAULT_COLUMN_VISIBILITY, STATUS_COLORS } from "@/typings/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrderStore } from "@/stores/useOrderStore";
import { LoadMoreSentinel } from "./LoadMoreSentinel";
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
  onStatusChange?: (itemId: string, newStatus: ItemStatus) => Promise<void>;
  isPreview?: boolean;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
  clickToAddTarget?: { day: DayName; weekKey: string } | null;
  onItemClick?: (item: Item) => Promise<void>;
}

export const ItemGroupSection = memo(function ItemGroupSection({
  group,
  onDelete,
  onShip,
  onMarkCompleted,
  onGetLabel,
  onStatusChange,
  isPreview = false,
  isCollapsible = false,
  defaultCollapsed = true,
  clickToAddTarget,
  onItemClick,
  ...props
}: ItemGroupProps) {
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const { settings } = useOrderSettings();
  const [sortColumn, setSortColumn] = useState<ColumnTitles | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: Item;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const { schedules, addItemToDay } = useWeeklyScheduleStore();

  const loadDoneItems = useOrderStore((state) => state.loadDoneItems);
  const removeDoneItems = useOrderStore((state) => state.removeDoneItems);
  const doneItemsLoaded = useOrderStore((state) => state.doneItemsLoaded);
  const loadHiddenItems = useOrderStore((state) => state.loadHiddenItems);
  const removeHiddenItems = useOrderStore((state) => state.removeHiddenItems);
  const hiddenItemsLoaded = useOrderStore((state) => state.hiddenItemsLoaded);
  const updateItem = useOrderStore((state) => state.updateItem);
  const hasMoreDoneItems = useOrderStore((state) => state.hasMoreDoneItems);
  const isDoneLoading = useOrderStore((state) => state.isDoneLoading);
  const searchQuery = useOrderStore((state) => state.searchQuery);

  useEffect(() => {
    // Auto-expand "Done" section if searching and there are items
    if (
      group.title === ItemStatus.Done &&
      searchQuery &&
      group.items.length > 0 &&
      isCollapsed
    ) {
      setIsCollapsed(false);
    }
  }, [group.title, searchQuery, group.items.length, isCollapsed]);

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
        // Directly update due date field
        dueDate: format(selectedDate, "yyyy-MM-dd"),
        // Keep values for compatibility if needed, or rely on store to handle patch
      };

      try {
        await updateItem(updatedItem);
      } catch (error) {
        console.error("Failed to update due date:", error);
      }
    },
    [sortedItems, updateItem]
  );

  const handleGroupClick = useCallback(() => {
    if (!isCollapsible) return;

    setIsCollapsed(!isCollapsed);
    if (group.title === ItemStatus.Done) {
      if (isCollapsed) {
        loadDoneItems(true);
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
            <BorderedTable
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
                  {visibleColumns
                    .filter((columnName) => columnName !== "Shipping")
                    .map((columnName) => (
                      <TableHead
                        key={columnName}
                        className={cn(
                          "border border-gray-200 dark:border-gray-600 p-2 text-center",
                          columnName === ColumnTitles.Customer_Name
                            ? "w-1/3"
                            : "",
                          columnName === ColumnTitles.Labels
                            ? "w-8 flex-shrink-0"
                            : ""
                        )}
                      >
                        <Button
                          className="h-8 flex items-center justify-center gap-2 w-full text-gray-900 dark:text-gray-400"
                          variant="ghost"
                          onClick={() => handleSort(columnName)}
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
                  : sortedItems.map((item, index) => (
                      <ItemTableRow
                        key={item.id}
                        item={item}
                        index={index}
                        visibleColumns={visibleColumns}
                        schedules={schedules}
                        onContextMenu={handleContextMenu}
                        onDaySelect={handleDaySelect}
                        onAddToSchedule={addItemToDay}
                        onScheduleUpdate={handleScheduleUpdate}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                        onGetLabel={onGetLabel}
                        onMarkCompleted={onMarkCompleted}
                        onShip={onShip}
                        onStatusChange={onStatusChange}
                        clickToAddTarget={clickToAddTarget}
                        onItemClick={onItemClick}
                      />
                    ))}
              </TableBody>
            </BorderedTable>
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
                        columnName === ColumnTitles.Customer_Name
                          ? "w-1/3"
                          : "",
                        columnName === ColumnTitles.Labels
                          ? "w-8 flex-shrink-0"
                          : ""
                      )}
                    >
                      <Button
                        className="h-8 flex items-center justify-between w-full"
                        variant="ghost"
                        onClick={() => handleSort(columnName)}
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
                      <PreviewTableRow
                        key={item.id}
                        item={item}
                        index={index}
                        visibleColumns={visibleColumns}
                        schedules={schedules}
                        onDaySelect={handleDaySelect}
                        onAddToSchedule={addItemToDay}
                        onScheduleUpdate={handleScheduleUpdate}
                      />
                    ))}
              </TableBody>
            </BorderedTable>
          )}
          {group.title === ItemStatus.Done && !isCollapsed && (
            <LoadMoreSentinel
              hasMore={hasMoreDoneItems}
              isLoading={isDoneLoading}
              onLoadMore={() => loadDoneItems(false)}
            />
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
        itemName={deletingItem?.customerName || "Unknown"}
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
});

export function getStatusColor(columnValue: {
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
