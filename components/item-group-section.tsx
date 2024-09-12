"use client"

import { useState, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { toast } from 'sonner'
import { Group, Item, Board } from '../app/typings/types'
import { ColumnTitles } from '../app/typings/types'
import { cn } from "@/lib/utils"
import { CustomTableCell } from './custom-table-cell'
import { ItemActions } from './item-actions'
import { EditItemDialog } from './edit-item-dialog'
import { isPastDue } from '../app/utils/functions'
import { useOrderSettings } from './contexts-order-settings-context'

interface ItemGroupProps {
  group: Group
  board: Board
  onUpdate: (itemId: string, columnName: string, newValue: string) => Promise<void>
  onDelete: (itemId: string) => Promise<void>
  onShip: (itemId: string) => Promise<void>
  onMarkCompleted: (itemId: string) => Promise<void>
}

export function ItemGroupSection({ group, board, onUpdate, onDelete, onShip, onMarkCompleted }: ItemGroupProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const { settings } = useOrderSettings()

  const handleEdit = useCallback((item: Item) => {
    setEditingItem(item)
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (editingItem) {
      for (const value of editingItem.values) {
        await onUpdate(editingItem.id, value.columnName, value.text || '')
      }
      setEditingItem(null)
      toast.success("Item updated successfully", {
        style: { background: '#10B981', color: 'white' }
      })
    }
  }, [editingItem, onUpdate])

  const visibleColumns = Object.entries(settings.columnVisibility[group.title] || {})
    .filter(([_, isVisible]) => isVisible)
    .map(([columnName]) => columnName)

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
                <TableHead key={columnName} className={columnName === ColumnTitles.Customer_Name ? "w-1/3" : ""}>
                  {columnName}
                </TableHead>
              ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.items.map((item) => (
              <TableRow 
                key={item.id}
                className={cn(
                  isPastDue(item) && "relative before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-red-500 before:shadow-[0_0_8px_rgba(239,68,68,0.5)] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-red-500 after:shadow-[0_0_8px_rgba(239,68,68,0.5)]",
                  settings.statusColors[item.status]
                )}
              >
                {item.values.filter(value => visibleColumns.includes(value.columnName)).map((columnValue, index) => (
                  <TableCell 
                    key={`${item.id}-${columnValue.columnName}`} 
                    className={`${index === 0 ? "w-1/3" : ""} p-0 border-0 px-2`}
                  >
                    <CustomTableCell
                      item={item}
                      columnValue={columnValue}
                      board={board}
                      onUpdate={onUpdate}
                      isNameColumn={index === 0}
                    />
                  </TableCell>
                ))}
                <TableCell className="border-0 px-2">
                  <ItemActions
                    item={item}
                    onEdit={handleEdit}
                    onDelete={onDelete}
                    onShip={onShip}
                    onMarkCompleted={onMarkCompleted}
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
    </Collapsible>
  )
}