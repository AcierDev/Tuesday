"use client"

import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit, X } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Item } from '../app/typings/types'

interface ItemActionsProps {
  item: Item
  onEdit: (item: Item) => void
  onDelete: (itemId: string) => Promise<void>
  onShip: (itemId: string) => Promise<void>
  onMarkCompleted: (itemId: string) => Promise<void>
}

export function ItemActions({ item, onEdit, onDelete, onShip, onMarkCompleted }: ItemActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(item)}>
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
  )
}