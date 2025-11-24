"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { parseMinecraftColors } from "@/parseMinecraftColors";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Angry,
  FileWarning,
  MessageCircleWarning,
  MoveVertical,
} from "lucide-react";
import { cn } from "@/utils/functions";
import React from "react";
import { Item, ColumnTitles } from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { useUser } from "@/contexts/UserContext";

// // Add this style block right after imports
// const pulseKeyframes = `
//   @keyframes pulse {
//     0% {
//       transform: scale(1);
//     }
//     50% {
//       transform: scale(1.5);
//     }
//     100% {
//       transform: scale(1);
//     }
//   }
// `;

// // Add the style element to inject the keyframes
// const styleElement = document.createElement("style");
// styleElement.textContent = pulseKeyframes;
// if (typeof document !== "undefined") {
//   document.head.appendChild(styleElement);
// }

interface NameCellProps {
  item: Item;
  columnValue: {
    text: string;
    columnName: string;
  };
  tags?: {
    isDuplicate: boolean;
    isDifficultCustomer: boolean;
    isVertical: boolean;
    hasCustomerMessage: boolean;
  };
}

export const NameCell: React.FC<NameCellProps> = ({
  item,
  columnValue,
  tags,
}) => {
  const [inputValue, setInputValue] = useState(columnValue.text || "");
  const [isEditing, setIsEditing] = useState(false);
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const previousValueRef = useRef(columnValue.text);

  const { updateItem } = useOrderStore();
  const { user } = useUser();

  useEffect(() => {
    if (columnValue.text !== previousValueRef.current) {
      setInputValue(columnValue.text || "");
      previousValueRef.current = columnValue.text;
    }
  }, [columnValue.text]);

  const handleUpdate = useCallback(async () => {
    if (inputValue === columnValue.text) return;

    try {
      const updatedItem = {
        ...item,
        customerName: inputValue,
        // We can rely on the store to handle metadata like timestamps if needed,
        // or pass a separate metadata object if we really need to track lastModified per field.
        // For now, simple update.
      };
      await updateItem(
        updatedItem,
        ColumnTitles.Customer_Name,
        user || undefined
      );
      toast.success("Name updated successfully");
    } catch (err) {
      console.error("Failed to update ColumnValue", err);
      toast.error("Failed to update the name. Please try again.");
      setInputValue(columnValue.text || "");
    }
  }, [inputValue, columnValue.text, item, updateItem, user]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        setIsEditing(false);
        handleUpdate();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setInputValue(columnValue.text || "");
        setIsEditing(false);
      }
    },
    [columnValue.text, handleUpdate]
  );

  const handleBlur = useCallback(async () => {
    setIsEditing(false);
    await handleUpdate();
  }, [handleUpdate]);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
  }, []);

  return (
    <div className="flex items-center w-full h-full relative group">
      <div className="flex items-center space-x-2 w-full pl-2">
        {tags?.isDuplicate && (
          <Tooltip>
            <TooltipTrigger>
              <FileWarning className="h-4 w-4 text-orange-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Multiple orders with this customer name</p>
            </TooltipContent>
          </Tooltip>
        )}
        {tags?.isDifficultCustomer && (
          <Tooltip>
            <TooltipTrigger>
              <Angry
                className="h-4 w-4 text-red-500 animate-[pulse_3s_ease-in-out_infinite]"
                style={{
                  animation: "pulse 3s ease-in-out infinite",
                  transformOrigin: "center",
                }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Difficult customer</p>
            </TooltipContent>
          </Tooltip>
        )}
        {tags?.isVertical && (
          <Tooltip>
            <TooltipTrigger>
              <MoveVertical className="h-4 w-4 text-blue-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Vertical Order</p>
            </TooltipContent>
          </Tooltip>
        )}
        {tags?.hasCustomerMessage && (
          <Tooltip>
            <TooltipTrigger>
              <MessageCircleWarning className="h-4 w-4 text-blue-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Customer messaged</p>
            </TooltipContent>
          </Tooltip>
        )}

        {isEditing ? (
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={cn(
              "min-w-0 flex-1 p-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "font-medium text-center break-words",
              "transition-shadow duration-200",
              "rounded-md",
              "bg-background border border-input"
            )}
            autoFocus
          />
        ) : (
          <div
            className={cn(
              "min-w-0 flex-1 p-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "font-medium text-center break-words",
              "cursor-text select-text",
              "transition-shadow duration-200",
              "hover:ring-1 hover:ring-ring/50",
              "rounded-md",
              "flex items-center justify-center"
            )}
            onClick={() => {
              console.log("clicked");
              handleFocus();
            }}
          >
            {parseMinecraftColors(inputValue, isDarkMode)}
          </div>
        )}
      </div>
    </div>
  );
};
