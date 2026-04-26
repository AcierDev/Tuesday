import {
  CheckCircle,
  Edit,
  Ship,
  Trash2,
  Truck,
  Clipboard,
  MoreVertical,
} from "lucide-react";
import React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  type Item,
  ItemDesigns,
  ItemSizes,
  ColumnTitles,
  ColumnTypes,
} from "../../typings/types";

interface ItemActionsProps {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onShip: (itemId: string) => void;
  onMarkCompleted: (itemId: string) => void;
  onGetLabel: (item: Item) => void;
  showTrigger?: boolean;
}

export const ItemActions = ({
  item,
  onEdit,
  onDelete,
  onShip,
  onMarkCompleted,
  onGetLabel,
  showTrigger = true,
}: ItemActionsProps) => {
  const router = useRouter();

  const handleSetupUtility = () => {
    const design = item.design as ItemDesigns | undefined;
    const size = item.size as ItemSizes | undefined;

    if (design && size) {
      const queryParams = new URLSearchParams({
        design,
        size,
      }).toString();
      router.push(`/setup-utility?${queryParams}`);
    } else {
      console.error("Design or Size not found for this item");
    }
  };

  const menuContent = (
    <DropdownMenuContent
      align="end"
      className="dark:bg-gray-800 dark:border-gray-600"
    >
      <DropdownMenuLabel>Actions</DropdownMenuLabel>
      <DropdownMenuItem onClick={() => onEdit(item)}>
        <Edit className="mr-2 h-4 w-4" />
        Edit
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onDelete(item)}>
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </DropdownMenuItem>
      <DropdownMenuSeparator className="dark:bg-gray-600" />
      <DropdownMenuItem onClick={() => onMarkCompleted(item.id)}>
        <CheckCircle className="mr-2 h-4 w-4" />
        Mark as Completed
      </DropdownMenuItem>
      <DropdownMenuSeparator className="dark:bg-gray-600" />
      <DropdownMenuItem onClick={handleSetupUtility}>
        <Clipboard className="mr-2 h-4 w-4" />
        Setup Utility
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  if (!showTrigger) {
    return menuContent;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="h-6 w-[1.125rem] p-0 mx-auto text-gray-700 dark:text-gray-300"
          variant="ghost"
        >
          <span className="sr-only">Open actions menu</span>
          <MoreVertical className="h-[1.05rem] w-[1.05rem]" />
        </Button>
      </DropdownMenuTrigger>
      {menuContent}
    </DropdownMenu>
  );
};
