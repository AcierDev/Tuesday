import {
  CheckCircle,
  Edit,
  Ship,
  Trash2,
  Truck,
  Clipboard,
  MoreVertical,
} from "lucide-react";
import React, { useRef, useState } from "react";
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

  return <ItemActionsTrigger>{menuContent}</ItemActionsTrigger>;
};

// Radix's DropdownMenuTrigger opens the menu on pointer-down by default —
// fast on mouse, but on touch this fires *before* the swipe-to-move gesture
// can take over, so a horizontal swipe that starts on the kebab accidentally
// pops the menu. Switching to controlled mode and gating the open behind a
// click event (which the browser only emits on pointer-up *without*
// significant movement) lets a swipe stay a swipe.
function ItemActionsTrigger({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const movedRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          className="h-6 w-[1.125rem] p-0 mx-auto text-gray-700 dark:text-gray-300 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          variant="ghost"
          onPointerDown={(e) => {
            if (e.pointerType === "touch") {
              // Block Radix's pointer-down auto-open on touch. Click will
              // open the menu instead — only fires on a clean tap, so a
              // horizontal swipe that starts here stays a swipe.
              e.preventDefault();
              startRef.current = { x: e.clientX, y: e.clientY };
              movedRef.current = false;
            }
          }}
          onPointerMove={(e) => {
            const start = startRef.current;
            if (!start) return;
            if (
              Math.abs(e.clientX - start.x) > 6 ||
              Math.abs(e.clientY - start.y) > 6
            ) {
              movedRef.current = true;
            }
          }}
          onClick={(e) => {
            // For touch, decide based on whether the gesture moved.
            // For mouse/pen Radix already handled it via pointer-down, so
            // a synthetic click here would just toggle it back closed —
            // skip in that case.
            if (startRef.current) {
              startRef.current = null;
              if (movedRef.current) {
                e.preventDefault();
                return;
              }
              setOpen((o) => !o);
            }
          }}
        >
          <span className="sr-only">Open actions menu</span>
          <MoreVertical className="h-[1.05rem] w-[1.05rem]" />
        </Button>
      </DropdownMenuTrigger>
      {children}
    </DropdownMenu>
  );
}
