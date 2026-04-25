import { useState, useRef, useCallback, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { XCircleIcon } from "lucide-react";
import { boardConfig } from "../../config/boardconfig";
import { DesignBlends, ItemDesignImages } from "@/typings/constants";
import { toast } from "sonner";
import { ColumnTitles, ColumnValue, Item } from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { useUser } from "@/contexts/UserContext";

const DESIGN_TAG_ALPHA = 0.8;

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createBackground = (option: string, alpha = 1) => {
  const colors = DesignBlends[option as keyof typeof DesignBlends];
  if (colors && colors.length > 0) {
    const stops =
      alpha < 1 ? colors.map((c) => hexToRgba(c, alpha)) : colors;
    return `linear-gradient(to right, ${stops.join(", ")})`;
  }
  // Fallback to a solid color if no gradient is found
  return alpha < 1 ? `rgba(0, 0, 0, ${alpha})` : "#000000";
};

export const DesignDropdownCell = ({
  item,
  columnValue,
  disabled = false,
}: {
  item: Item;
  columnValue: ColumnValue;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredDesign, setHoveredDesign] = useState(null);
  const [showPopover, setShowPopover] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const { updateItem } = useOrderStore();
  const { user } = useUser();

  const handleMouseEnter = useCallback((option) => {
    setHoveredDesign(option);
    hoverTimeoutRef.current = setTimeout(() => {
      setShowPopover(true);
    }, 1000); // 1-second delay
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredDesign(null);
    setShowPopover(false);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleUpdate = async (newValue) => {
    try {
      const updatedItem = {
        ...item,
        design: newValue,
      };
      await updateItem(updatedItem, columnValue.columnName, user || undefined);
      toast.success("Design updated successfully");
    } catch (err) {
      console.error("Failed to update ColumnValue", err);
      toast.error("Failed to update the design. Please try again.");
    }
  };

  const currentDesign = columnValue.text as keyof typeof DesignBlends;
  const backgroundStyle = createBackground(currentDesign, DESIGN_TAG_ALPHA);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        asChild
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
          }
        }}
        onPointerDown={(e) => e.preventDefault()}
      >
        <Button
          className="inline-flex items-center justify-center px-3 h-6 min-h-0 text-xs font-medium text-white rounded-[10px] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.10)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_48%)]"
          style={{ background: backgroundStyle }}
        >
          {columnValue.text || "Select Design"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 overflow-y-auto custom-scrollbar"
        style={{ maxHeight: "60vh" }}
      >
        {boardConfig.columns[columnValue.columnName].options?.map((option) => (
          <Popover
            key={option}
            open={showPopover && hoveredDesign === option}
            onOpenChange={setShowPopover}
          >
            <PopoverTrigger asChild>
              <DropdownMenuItem
                onSelect={() => handleUpdate(option)}
                onMouseEnter={() => handleMouseEnter(option)}
                onMouseLeave={handleMouseLeave}
                className="hover:bg-gray-100 dark:hover:bg-gray-700 py-3 my-1 rounded-md"
                style={{ background: createBackground(option) }}
              >
                {option}
              </DropdownMenuItem>
            </PopoverTrigger>
            {showPopover && hoveredDesign === option && (
              <PopoverContent
                side="right"
                sideOffset={5}
                className="bg-white dark:bg-gray-800"
              >
                <Image
                  src={ItemDesignImages[option]}
                  alt={`${option} design`}
                  width={300}
                  height={200}
                  objectFit="contain"
                />
              </PopoverContent>
            )}
          </Popover>
        ))}
        <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-600 my-2" />
        <DropdownMenuItem
          onSelect={() => handleUpdate("")}
          className="hover:bg-gray-100 dark:hover:bg-gray-700 py-3 my-1 rounded-md"
        >
          <XCircleIcon className="mr-2 h-4 w-4" />
          Reset
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
