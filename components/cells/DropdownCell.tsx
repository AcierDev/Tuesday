"use client";

import { useState, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { toast } from "sonner";
import { boardConfig } from "@/config/boardconfig";
import { ColumnTitles, GenericColumnValue, Item } from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";

interface DropdownCellProps {
  item: Item;
  columnValue: GenericColumnValue;
  disabled?: boolean;
}

export function DropdownCell({
  item,
  columnValue,
  disabled = false,
}: DropdownCellProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { updateItem } = useOrderStore();

  const handleUpdate = useCallback(
    async (newValue: string) => {
      try {
        const fieldMap: Record<string, keyof Item> = {
            [ColumnTitles.Design]: "design",
            [ColumnTitles.Size]: "size",
            [ColumnTitles.Painted]: "painted",
            [ColumnTitles.Backboard]: "backboard",
            [ColumnTitles.Glued]: "glued",
            [ColumnTitles.Packaging]: "packaging",
            [ColumnTitles.Boxes]: "boxes",
            [ColumnTitles.Shipping]: "shipping",
            [ColumnTitles.Labels]: "labels"
        };

        const key = fieldMap[columnValue.columnName];

        if (!key) {
             console.error("Unknown dropdown column:", columnValue.columnName);
             return;
        }

        const updatedItem: any = {
          ...item,
          [key]: newValue,
        };

        await updateItem(updatedItem, columnValue.columnName);
        toast.success("Value updated successfully");
      } catch (err) {
        console.error("Failed to update ColumnValue", err);
        toast.error("Failed to update the value. Please try again.");
      }
    },
    [item, columnValue.columnName, updateItem]
  );

  const buttonStyle =
    columnValue.columnName === "Design" || columnValue.columnName === "Size"
      ? `inline-flex items-center justify-center px-3 h-6 min-h-0 text-xs font-medium text-white rounded-[10px] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.10)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_48%)] ${
          columnValue.columnName === "Size"
            ? "bg-sky-500/80 dark:bg-sky-600/80 hover:bg-sky-500/80 dark:hover:bg-sky-600/80 focus-visible:ring-sky-600 dark:focus-visible:ring-sky-500"
            : "bg-primary"
        }`
      : "w-full h-full justify-center p-2 text-foreground";

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button className={buttonStyle} variant="ghost">
          <span>{columnValue.text || "⠀"}</span>
        </Button>
      </DropdownMenuTrigger>
      {!disabled && (
        <DropdownMenuContent>
          {boardConfig.columns[columnValue.columnName].options?.map(
            (option) => (
              <DropdownMenuItem
                key={option}
                onSelect={() => handleUpdate(option)}
              >
                {option}
              </DropdownMenuItem>
            )
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => handleUpdate("")}>
            <XCircle className="mr-2 h-4 w-4" />
            Reset Value
          </DropdownMenuItem>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
