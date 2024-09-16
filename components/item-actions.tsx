import React from 'react'
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit, Trash2, Ship, CheckCircle, Truck } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Item } from '../app/typings/types'

interface ItemActionsProps {
  item: Item
  onEdit: (item: Item) => void
  onDelete: (item: Item) => void
  onShip: (itemId: string) => void
  onMarkCompleted: (itemId: string) => void
  onGetLabel: (item: Item) => void
}

export function ItemActions({ item, onEdit, onDelete, onShip, onMarkCompleted, onGetLabel }: ItemActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEdit(item)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(item)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onGetLabel(item)}>
          <Truck className="mr-2 h-4 w-4" />
          Shipping Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onShip(item.id)}>
          <Ship className="mr-2 h-4 w-4" />
          Mark as Shipped
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMarkCompleted(item.id)}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Mark as Completed
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}