"use client"

import { useState, useCallback, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { toast } from 'sonner'
import { Group, Item, Board, ColumnTitles, ColumnTypes, ItemSortFuncs } from '../app/typings/types'
import { cn } from "@/lib/utils"
import { CustomTableCell } from './custom-table-cell'
import { ItemActions } from './item-actions'
import { EditItemDialog } from './edit-item-dialog'
import { isPastDue } from '../app/utils/functions'
import { useOrderSettings } from './contexts-order-settings-context'
import { DeleteConfirmationDialog } from './components-delete-confirmation-dialog'

interface ItemGroupProps {
  group: Group
  board: Board
  onUpdate: (itemId: string, columnName: string, newValue: string) => Promise<void>
  onDelete: (itemId: string) => Promise<void>
  onShip: (itemId: string) => Promise<void>
  onMarkCompleted: (itemId: string) => Promise<void>
  onGetLabel: (item: Item) => void
}

const itemSortFuncs: ItemSortFuncs = {
  [ColumnTitles.Customer_Name]: (items, ascending) => [...items].sort((a, b) => {
    const aName = a.values.find(v => v.columnName === ColumnTitles.Customer_Name)?.text || '';
    const bName = b.values.find(v => v.columnName === ColumnTitles.Customer_Name)?.text || '';
    return ascending ? aName.localeCompare(bName) : bName.localeCompare(aName);
  }),
  [ColumnTitles.Design]: (items, ascending) => [...items].sort((a, b) => {
    const aDesign = a.values.find(v => v.columnName === ColumnTitles.Design)?.text || '';
    const bDesign = b.values.find(v => v.columnName === ColumnTitles.Design)?.text || '';
    return ascending ? aDesign.localeCompare(bDesign) : bDesign.localeCompare(aDesign);
  }),
  [ColumnTitles.Size]: (items, ascending) => [...items].sort((a, b) => {
    const aSize = a.values.find(v => v.columnName === ColumnTitles.Size)?.text || '';
    const bSize = b.values.find(v => v.columnName === ColumnTitles.Size)?.text || '';
    return ascending ? aSize.localeCompare(bSize) : bSize.localeCompare(aSize);
  }),
  [ColumnTitles.Painted]: (items, ascending) => [...items].sort((a, b) => {
    const aStatus = a.values.find(v => v.columnName === ColumnTitles.Painted)?.text || '';
    const bStatus = b.values.find(v => v.columnName === ColumnTitles.Painted)?.text || '';
    return ascending ? aStatus.localeCompare(bStatus) : bStatus.localeCompare(aStatus);
  }),
  [ColumnTitles.Backboard]: (items, ascending) => [...items].sort((a, b) => {
    const aStatus = a.values.find(v => v.columnName === ColumnTitles.Backboard)?.text || '';
    const bStatus = b.values.find(v => v.columnName === ColumnTitles.Backboard)?.text || '';
    return ascending ? aStatus.localeCompare(bStatus) : bStatus.localeCompare(aStatus);
  }),
  [ColumnTitles.Glued]: (items, ascending) => [...items].sort((a, b) => {
    const aStatus = a.values.find(v => v.columnName === ColumnTitles.Glued)?.text || '';
    const bStatus = b.values.find(v => v.columnName === ColumnTitles.Glued)?.text || '';
    return ascending ? aStatus.localeCompare(bStatus) : bStatus.localeCompare(aStatus);
  }),
  [ColumnTitles.Packaging]: (items, ascending) => [...items].sort((a, b) => {
    const aStatus = a.values.find(v => v.columnName === ColumnTitles.Packaging)?.text || '';
    const bStatus = b.values.find(v => v.columnName === ColumnTitles.Packaging)?.text || '';
    return ascending ? aStatus.localeCompare(bStatus) : bStatus.localeCompare(aStatus);
  }),
  [ColumnTitles.Boxes]: (items, ascending) => [...items].sort((a, b) => {
    const aStatus = a.values.find(v => v.columnName === ColumnTitles.Boxes)?.text || '';
    const bStatus = b.values.find(v => v.columnName === ColumnTitles.Boxes)?.text || '';
    return ascending ? aStatus.localeCompare(bStatus) : bStatus.localeCompare(aStatus);
  }),
  [ColumnTitles.Notes]: (items, ascending) => [...items].sort((a, b) => {
    const aNotes = a.values.find(v => v.columnName === ColumnTitles.Notes)?.text || '';
    const bNotes = b.values.find(v => v.columnName === ColumnTitles.Notes)?.text || '';
    return ascending ? aNotes.localeCompare(bNotes) : bNotes.localeCompare(aNotes);
  }),
  [ColumnTitles.Rating]: (items, ascending) => [...items].sort((a, b) => {
    const aRating = Number(a.values.find(v => v.columnName === ColumnTitles.Rating)?.text || '0');
    const bRating = Number(b.values.find(v => v.columnName === ColumnTitles.Rating)?.text || '0');
    return ascending ? aRating - bRating : bRating - aRating;
  }),
  [ColumnTitles.Due]: (items, ascending) => [...items].sort((a, b) => {
    const aDate = new Date(a.values.find(v => v.columnName === ColumnTitles.Due)?.text || '');
    const bDate = new Date(b.values.find(v => v.columnName === ColumnTitles.Due)?.text || '');
    return ascending ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
  }),
};

export function ItemGroupSection({ group, board, onUpdate, onDelete, onShip, onMarkCompleted, onGetLabel }: ItemGroupProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [deletingItem, setDeletingItem] = useState<Item | null>(null)
  const { settings } = useOrderSettings()
  const [sortColumn, setSortColumn] = useState<ColumnTitles | null>(null)
  const [sortAscending, setSortAscending] = useState(true)

  const handleEdit = useCallback((item: Item) => {
    console.log("Editing item:", item);
    setEditingItem(item)
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (editingItem) {
      console.log("Saving edited item:", editingItem);
      try {
        for (const value of editingItem.values) {
          await onUpdate(editingItem.id, value.columnName, value.text || '')
        }
        setEditingItem(null)
        console.log("Item updated successfully");
        toast.success("Item updated successfully", {
          style: { background: '#10B981', color: 'white' }
        })
      } catch (error) {
        console.error("Failed to update item:", error)
        toast.error("Failed to update item. Please try again.", {
          style: { background: '#EF4444', color: 'white' }
        })
      }
    }
  }, [editingItem, onUpdate])

  const handleDelete = useCallback((item: Item) => {
    console.log("Deleting item:", item);
    setDeletingItem(item)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (deletingItem) {
      console.log("Confirming delete for item:", deletingItem);
      await onDelete(deletingItem.id)
      setDeletingItem(null)
    }
  }, [deletingItem, onDelete])

  const handleSort = useCallback((column: ColumnTitles) => {
    console.log("Sorting by column:", column);
    if (sortColumn === column) {
      setSortAscending(!sortAscending)
    } else {
      setSortColumn(column)
      setSortAscending(true)
    }
  }, [sortColumn, sortAscending])

  const visibleColumns = Object.entries(settings.columnVisibility[group.title] || {})
    .filter(([_, isVisible]) => isVisible)
    .map(([columnName]) => columnName as ColumnTitles)

  const sortedItems = useMemo(() => {
    if (sortColumn && itemSortFuncs[sortColumn]) {
      console.log("Sorting items by:", sortColumn, "Ascending:", sortAscending);
      return itemSortFuncs[sortColumn](group.items, sortAscending)
    }
    return group.items
  }, [group.items, sortColumn, sortAscending])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-6 bg-white rounded-lg shadow-md overflow-hidden">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-4 hover:bg-gray-50">
          <span className="font-semibold text-lg">{group.title}</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              {visibleColumns.map((columnName) => (
                <TableHead key={columnName} className={cn(
                  "border border-gray-200 p-2 text-center",
                  columnName === ColumnTitles.Customer_Name ? "w-1/3" : ""
                )}>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort(columnName)}
                    className="h-8 flex items-center justify-between w-full"
                  >
                    {columnName}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
              ))}
              <TableHead className="border border-gray-200 p-2 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item, index) => (
              <TableRow 
                key={item.id}
                className={cn(
                  index % 2 === 0 ? "bg-white" : "bg-gray-50",
                  isPastDue(item) && "relative before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-red-500 before:shadow-[0_0_8px_rgba(239,68,68,0.5)] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-red-500 after:shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                )}
              >
                {item.values.filter(value => visibleColumns.includes(value.columnName as ColumnTitles)).map((columnValue, cellIndex) => (
                  <TableCell 
                    key={`${item.id}-${columnValue.columnName}`} 
                    className={cn(
                      "border border-gray-200 p-0",
                      cellIndex === 0 ? "w-1/3" : "",
                      getStatusColor(columnValue)
                    )}
                  >
                    <CustomTableCell
                      item={item}
                      columnValue={columnValue}
                      board={board}
                      onUpdate={onUpdate}
                      isNameColumn={cellIndex === 0}
                    />
                  </TableCell>
                ))}
                <TableCell className="border border-gray-200 p-2 text-center">
                  <ItemActions
                    item={item}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onShip={onShip}
                    onMarkCompleted={onMarkCompleted}
                    onGetLabel={onGetLabel}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CollapsibleContent>
      <EditItemDialog
        editingItem={editingItem}
        setEditingItem={setEditingItem}
        handleSaveEdit={handleSaveEdit}
      />
      <DeleteConfirmationDialog
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        itemName={deletingItem?.values.find(v => v.columnName === ColumnTitles.Customer_Name)?.text || 'Unknown'}
      />
    </Collapsible>
  )
}

function getStatusColor(columnValue: { columnName: string; type: ColumnTypes; text?: string }): string {
  if (columnValue.type === ColumnTypes.Dropdown) {
    switch (columnValue.text?.toLowerCase()) {
      case 'done':
        return 'bg-green-200'
      case 'working on it':
        return 'bg-yellow-100'
      case "stuck":
        return "bg-red-200"
      default:
        return ''
    }
  }
  return ''
}