"use client";

import { Draggable, Droppable } from "@hello-pangea/dnd";
import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { itemSortFuncs } from "@/utils/itemSortFuncs";

import { useOrderSettings } from "../../contexts/OrderSettingsContext";
import {
  Board,
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
import { STATUS_COLORS } from "@/typings/constants";
import { boardConfig } from "@/config/boardconfig";

interface ItemGroupProps {
  group: Group;
  board: Board;
  onUpdate: (item: Item) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onShip: (itemId: string) => Promise<void>;
  onMarkCompleted: (itemId: string) => Promise<void>;
  onGetLabel: (item: Item) => void;
  onReorder: (newItems: Item[]) => void;
  onDragToWeeklySchedule: (itemId: string, day: string) => void;
}

export function ItemGroupSection({
  group,
  board,
  onUpdate,
  onDelete,
  onShip,
  onMarkCompleted,
  onGetLabel,
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
          await onUpdate(updatedItem);
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
    [onUpdate]
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
    settings.columnVisibility[group.title] || {}
  )
    .filter(([_, isVisible]) => isVisible)
    .map(([columnName]) => columnName as ColumnTitles);

  const sortedItems = useMemo(() => {
    if (sortColumn && sortDirection && itemSortFuncs[sortColumn]) {
      return itemSortFuncs[sortColumn](group.items, sortDirection === "asc");
    }
    return group.items;
  }, [group.items, sortColumn, sortDirection]);

  return (
    <div
      className="mb-6 bg-white dark:bg-gray-900 rounded-lg"
      style={{ contain: "paint" }}
    >
      <div
        className={cn(
          `w-full p-4`,
          `text-${STATUS_COLORS[group.title]} dark:text-${
            STATUS_COLORS[group.title]
          }`,
          "sticky top-[73px] z-30 bg-white dark:bg-gray-900"
        )}
      >
        <span className="font-semibold text-lg">{group.title}</span>
      </div>
      <div className="relative">
        <Droppable droppableId={group.title}>
          {(provided, snapshot) => (
            <BorderedTable
              ref={provided.innerRef}
              {...provided.droppableProps}
              borderColor={`bg-${STATUS_COLORS[group.title]}`}
            >
              <TableHeader className="sticky top-[132px] z-20 bg-gray-100 dark:bg-gray-700 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_6px_-1px_rgba(255,255,255,0.1),0_2px_4px_-2px_rgba(255,255,255,0.1)]">
                <TableRow>
                  <TableHead className="border border-gray-200 dark:border-gray-600 p-2 text-center">
                    Order
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
                        className="h-8 flex items-center justify-between w-full text-gray-900 dark:text-gray-100"
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
                  <TableHead className="border border-gray-200 dark:border-gray-600 p-2 text-center">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <TableRow
                        ref={provided.innerRef}
                        {...provided.draggableProps}
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
                        onContextMenu={(e) => handleContextMenu(e, item)}
                      >
                        <TableCell
                          className="border border-gray-200 dark:border-gray-600 p-2 text-center"
                          {...provided.dragHandleProps}
                        >
                          <GripVertical className="cursor-grab inline-block" />
                        </TableCell>
                        {visibleColumns.map((columnName, cellIndex) => {
                          const columnValue = item.values.find(
                            (value) => value.columnName === columnName
                          ) || {
                            columnName,
                            type: boardConfig.columns[columnName].type,
                            text: "\u00A0", // Unicode non-breaking space
                          };
                          return (
                            <TableCell
                              key={`${item.id}-${columnName}`}
                              className={cn(
                                "border border-gray-200 dark:border-gray-600 p-2",
                                cellIndex === 0 ? "w-1/3" : "",
                                getStatusColor(columnValue)
                              )}
                            >
                              <CustomTableCell
                                board={board}
                                columnValue={columnValue}
                                isNameColumn={cellIndex === 0}
                                item={item}
                                onUpdate={onUpdate}
                              />
                            </TableCell>
                          );
                        })}
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
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </TableBody>
            </BorderedTable>
          )}
        </Droppable>
      </div>
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
