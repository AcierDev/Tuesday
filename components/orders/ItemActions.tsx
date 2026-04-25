import {
  CheckCircle,
  Edit,
  Ship,
  Trash2,
  Truck,
  Clipboard,
} from "lucide-react";
import React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

const INLINE_ICON_BUTTON_CLASS = "h-8 w-8 p-0";
const INLINE_ICON_CLASS = "h-4 w-4";

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

  if (!showTrigger) {
    return (
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
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={INLINE_ICON_BUTTON_CLASS}
            variant="ghost"
            onClick={() => onEdit(item)}
          >
            <span className="sr-only">Edit</span>
            <Edit className={INLINE_ICON_CLASS} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={INLINE_ICON_BUTTON_CLASS}
            variant="ghost"
            onClick={() => onMarkCompleted(item.id)}
          >
            <span className="sr-only">Mark as Completed</span>
            <CheckCircle className={INLINE_ICON_CLASS} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Mark as Completed</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={INLINE_ICON_BUTTON_CLASS}
            variant="ghost"
            onClick={handleSetupUtility}
          >
            <span className="sr-only">Setup Utility</span>
            <Clipboard className={INLINE_ICON_CLASS} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Setup Utility</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={INLINE_ICON_BUTTON_CLASS}
            variant="ghost"
            onClick={() => onDelete(item)}
          >
            <span className="sr-only">Delete</span>
            <Trash2 className={INLINE_ICON_CLASS} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete</TooltipContent>
      </Tooltip>
    </div>
  );
};
