import { CheckCircle, Edit, MoreHorizontal, Ship, Trash2, Truck, Clipboard } from 'lucide-react'
import React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { type Item, ItemDesigns, ItemSizes, ColumnTitles, ColumnTypes } from '../../typings/types'

interface ItemActionsProps {
  item: Item
  onEdit: (item: Item) => void
  onDelete: (item: Item) => void
  onShip: (itemId: string) => void
  onMarkCompleted: (itemId: string) => void
  onGetLabel: (item: Item) => void
  showTrigger?: boolean
}

export const ItemActions = ({ 
  item, 
  onEdit, 
  onDelete, 
  onShip, 
  onMarkCompleted, 
  onGetLabel,
  showTrigger = true 
}: ItemActionsProps) => {
  const router = useRouter()

  const getItemValue = (columnName: ColumnTitles, type: ColumnTypes): string | undefined => {
    const value = item.values.find(value => value.columnName === columnName && value.type === type)
    return value?.text
  }

  const handleSetupUtility = () => {
  const design = getItemValue(ColumnTitles.Design, ColumnTypes.Dropdown) as ItemDesigns | undefined
  const size = getItemValue(ColumnTitles.Size, ColumnTypes.Dropdown) as ItemSizes | undefined

  if (design && size) {
    const queryParams = new URLSearchParams({
      design,
      size,
    }).toString()
    router.push(`/utilities?${queryParams}`)
  } else {
    console.error('Design or Size not found for this item')
  }
}

  const menuContent = (
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
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleSetupUtility}>
        <Clipboard className="mr-2 h-4 w-4" />
        Setup Utility
      </DropdownMenuItem>
    </DropdownMenuContent>
  )

  if (!showTrigger) {
    return menuContent
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="h-8 w-8 p-0" variant="ghost">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      {menuContent}
    </DropdownMenu>
  )
}