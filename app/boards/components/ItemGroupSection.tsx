"use client"

import { useState, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, MoreHorizontal, Edit, X } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { toast } from 'sonner'
import { Board, Group, Item, ColumnTitles } from '../../typings/types'
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import CustomTableCell from './CustomTableCell'
import { isPastDue } from '../../utils/functions'

interface ItemGroupProps {
  group: Group
  board: Board
  onUpdate: (itemId: string, columnName: string, newValue: string) => Promise<void>
  onDelete: (itemId: string) => Promise<void>
  onShip: (itemId: string) => Promise<void>
  onMarkCompleted: (itemId: string) => Promise<void>
}

export default function ItemGroupSection({ group, board, onUpdate, onDelete, onShip, onMarkCompleted }: ItemGroupProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [editingItem, setEditingItem] = useState<Item | null>(null)

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
              {Object.values(ColumnTitles).map((title) => (
                <TableHead key={title} className={title === ColumnTitles.Customer_Name ? "w-1/3" : ""}>
                  {title}
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
                  isPastDue(item) && "relative before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-red-500 before:shadow-[0_0_8px_rgba(239,68,68,0.5)] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-red-500 after:shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                )}
              >
                {item.values.map((columnValue, index) => (
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(item)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(item.id)}>
                        <X className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onShip(item.id)}>
                        Ship
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onMarkCompleted(item.id)}>
                        Mark Completed
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CollapsibleContent>
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {editingItem?.values.map((value) => (
              <div key={value.columnName} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={value.columnName} className="text-right">
                  {value.columnName}
                </Label>
                <Input
                  id={value.columnName}
                  value={value.text || ''}
                  onChange={(e) => {
                    const newValues = editingItem.values.map(v =>
                      v.columnName === value.columnName ? { ...v, text: e.target.value } : v
                    )
                    setEditingItem({ ...editingItem, values: newValues })
                  }}
                  className="col-span-3"
                />
              </div>
            ))}
          </div>
          <Button onClick={handleSaveEdit}>Save changes</Button>
        </DialogContent>
      </Dialog>
    </Collapsible>
  )
}