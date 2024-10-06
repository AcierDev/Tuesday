"use client"

import { Draggable, Droppable } from "@hello-pangea/dnd"
import { compareAsc, compareDesc, parseISO } from "date-fns"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { DropdownMenu, DropdownMenuContent } from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { itemSortFuncs } from "@/utils/itemSortFuncs"

import { useOrderSettings } from "../../contexts/OrderSettingsContext"
import {
  type Board,
  ColumnTitles,
  ColumnTypes,
  type Group,
  type Item,
  type ItemSortFuncs,
  ItemStatus,
} from "../../typings/types"
import { cn, isPastDue } from "../../utils/functions"
import { CustomTableCell } from "../cells/CustomTableCell"
import { DeleteConfirmationDialog } from "../ui/DeleteConfirmationDialog"

import { EditItemDialog } from "./EditItemDialog"
import { ItemActions } from "./ItemActions"
import { ItemTags } from "./ItemTags"

interface ItemGroupProps {
  group: Group
  board: Board
  onUpdate: (item: Item) => Promise<void>
  onDelete: (itemId: string) => Promise<void>
  onShip: (itemId: string) => Promise<void>
  onMarkCompleted: (itemId: string) => Promise<void>
  onGetLabel: (item: Item) => void
  onReorder: (newItems: Item[]) => void
  onDragToWeeklySchedule: (itemId: string, day: string) => void
}

export const ItemGroupSection = ({
  group,
  board,
  onUpdate,
  onDelete,
  onShip,
  onMarkCompleted,
  onGetLabel,
}: ItemGroupProps) => {
  const [isOpen, setIsOpen] = useState(true)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [deletingItem, setDeletingItem] = useState<Item | null>(null)
  const { settings } = useOrderSettings()
  const [sortColumn, setSortColumn] = useState<ColumnTitles | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: Item } | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const handleEdit = useCallback((item: Item) => {
    console.log("Editing item:", item)
    setEditingItem(item)
    setContextMenu(null)
  }, [])

  const handleSaveEdit = useCallback(
    async (updatedItem: Item) => {
      if (updatedItem) {
        console.log("Saving edited item:", updatedItem)
        try {
          await onUpdate(updatedItem)
          setEditingItem(null)
          console.log("Item updated successfully")
          toast.success("Item updated successfully", {
            style: { background: "#10B981", color: "white" },
          })
        } catch (error) {
          console.error("Failed to update item:", error)
          toast.error("Failed to update item. Please try again.", {
            style: { background: "#EF4444", color: "white" },
          })
        }
      }
    },
    [onUpdate]
  )

  const handleDelete = useCallback((item: Item) => {
    console.log("Deleting item:", item)
    setDeletingItem(item)
    setContextMenu(null)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (deletingItem) {
      console.log("Confirming delete for item:", deletingItem)
      await onDelete(deletingItem.id)
      setDeletingItem(null)
    }
  }, [deletingItem, onDelete])

  const handleSort = useCallback(
    (column: ColumnTitles) => {
      if (sortColumn === column) {
        if (sortDirection === "asc") {
          setSortDirection("desc")
        } else if (sortDirection === "desc") {
          setSortDirection(null)
          setSortColumn(null)
        } else {
          setSortDirection("asc")
        }
      } else {
        setSortColumn(column)
        setSortDirection("asc")
      }
    },
    [sortColumn, sortDirection]
  )

  const handleContextMenu = useCallback((e: React.MouseEvent, item: Item) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
    })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        closeContextMenu()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [closeContextMenu])

const visibleColumns = [
    ...Object.entries(settings.columnVisibility[group.title] || {})
      .filter(([_, isVisible]) => isVisible)
      .map(([columnName]) => columnName as ColumnTitles),
    "Tags" // Add Tags column
  ]

  const sortedItems = useMemo(() => {
    if (sortColumn && sortDirection && itemSortFuncs[sortColumn]) {
      return itemSortFuncs[sortColumn](
        group.items,
        sortDirection === "asc"
      )
    }
    return group.items
  }, [group.items, sortColumn, sortDirection])

  return (
  <Collapsible
    className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
    open={isOpen}
    onOpenChange={setIsOpen}
  >
    <CollapsibleTrigger asChild>
      <Button
        className="w-full justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
        variant="ghost"
      >
        <span className="font-semibold text-lg">{group.title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <Droppable droppableId={group.title}>
        {(provided, snapshot) => (
          <Table
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            <TableHeader>
              <TableRow className="bg-gray-100 dark:bg-gray-700">
                <TableHead className="border border-gray-200 dark:border-gray-600 p-2 text-center">
                  Order
                </TableHead>
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
                      className="h-8 flex items-center justify-between w-full text-gray-900 dark:text-gray-100"
                      disabled={isDragging}
                      variant="ghost"
                      onClick={() =>
                        !isDragging && handleSort(columnName)
                      }
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
                  Tags
                </TableHead>
                <TableHead className="border border-gray-200 dark:border-gray-600 p-2 text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item, index) => (
                <Draggable
                  key={item.id}
                  draggableId={item.id}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <TableRow
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={cn(
                        index % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-700",
                        isPastDue(item) && item.status !== ItemStatus.Done && "relative",
                        snapshot.isDragging ? "bg-blue-100 dark:bg-blue-800 shadow-lg" : ""
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
                        const columnValue = item.values.find(value => value.columnName === columnName) || {
                          columnName,
                          type: ColumnTypes.Text,
                          text: "\u00A0" // Unicode non-breaking space
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
                      <TableCell className="border border-gray-200 dark:border-gray-600 p-2">
                        <ItemTags
                          itemId={item.id}
                          initialTags={item.tags || []}
                          allTags={board.tags || []}
                          onAddTag={handleDelete}
                          onRemoveTag={handleDelete}
                        />
                      </TableCell>
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
                      {isPastDue(item) && item.status !== ItemStatus.Done &&  (
                        <>
                          <div className="absolute inset-x-0 top-0 h-[2px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                        </>
                      )}
                    </TableRow>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </TableBody>
          </Table>
        )}
      </Droppable>
    </CollapsibleContent>
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
          position: 'fixed',
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
  </Collapsible>
)
}

function getStatusColor(columnValue: {
  columnName: string
  type: ColumnTypes
  text?: string
}): string {
  if (columnValue.type === ColumnTypes.Dropdown) {
    switch (columnValue.text?.toLowerCase()) {
      case "done":
        return "bg-green-200 dark:bg-green-800"
      case "working on it":
        return "bg-yellow-100 dark:bg-yellow-800"
      case "stuck":
        return "bg-red-200 dark:bg-red-800"
      default:
        return ""
    }
  }
  return ""
}