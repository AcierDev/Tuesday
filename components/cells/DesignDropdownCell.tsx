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

const createBackground = (option: string) => {
  const colors = DesignBlends[option as keyof typeof DesignBlends];
  if (colors && colors.length > 0) {
    return `linear-gradient(to right, ${colors.join(", ")})`;
  }
  // Fallback to a solid color if no gradient is found
  return "#000000";
};

export const DesignDropdownCell = ({ item, columnValue, onUpdate, board }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredDesign, setHoveredDesign] = useState(null);
  const [showPopover, setShowPopover] = useState(false);
  const hoverTimeoutRef = useRef(null);

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
        values: item.values.map((value) =>
          value.columnName === columnValue.columnName
            ? { ...value, text: newValue, lastModifiedTimestamp: Date.now() }
            : value
        ),
      };
      await onUpdate(updatedItem, columnValue.columnName);
      toast.success("Design updated successfully");
    } catch (err) {
      console.error("Failed to update ColumnValue", err);
      toast.error("Failed to update the design. Please try again.");
    }
  };

  const currentDesign = columnValue.text as keyof typeof DesignBlends;
  const backgroundStyle = createBackground(currentDesign);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        asChild
        onClick={() => setIsOpen(true)}
        onPointerDown={(e) => e.preventDefault()}
      >
        <Button
          className="inline-flex items-center justify-center px-3 h-6 min-h-0 text-xs font-medium text-white rounded-full hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors"
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
