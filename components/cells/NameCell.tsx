"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { parseMinecraftColors } from "../../parseMinecraftColors";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileWarning } from "lucide-react";

interface NameCellProps {
  item: any;
  columnValue: {
    text: string;
    columnName: string;
  };
  onUpdate: (updatedItem: any, columnName: string) => Promise<void>;
  isDuplicate?: boolean;
}

export const NameCell: React.FC<NameCellProps> = ({
  item,
  columnValue,
  onUpdate,
  isDuplicate,
}) => {
  const [inputValue, setInputValue] = useState(columnValue.text || "");
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  useEffect(() => {
    setInputValue(columnValue.text || "");
  }, [columnValue.text]);

  const handleUpdate = useCallback(async () => {
    if (inputValue !== columnValue.text) {
      try {
        const updatedItem = {
          ...item,
          values: item.values.map(
            (value: { columnName: string; text: string }) =>
              value.columnName === columnValue.columnName
                ? {
                    ...value,
                    text: inputValue,
                    lastModifiedTimestamp: Date.now(),
                  }
                : value
          ),
        };
        await onUpdate(updatedItem, columnValue.columnName);
        toast.success("Name updated successfully");
      } catch (err) {
        console.error("Failed to update ColumnValue", err);
        toast.error("Failed to update the name. Please try again.");
      }
    }
  }, [inputValue, columnValue.text, columnValue.columnName, item, onUpdate]);

  return (
    <div className="flex items-center w-full h-full relative group">
      <div className="flex items-center space-x-2 w-full pl-2">
        <Input
          className="font-medium border-0 p-2 bg-transparent w-full text-center text-transparent caret-black dark:caret-white"
          value={inputValue}
          onBlur={handleUpdate}
          onChange={(e) => setInputValue(e.target.value)}
        />
        {item.vertical && (
          <Badge variant="secondary" className="whitespace-nowrap">
            Vertical
          </Badge>
        )}
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-900 dark:text-gray-100">
        <span className="whitespace-pre-wrap">
          {parseMinecraftColors(inputValue, isDarkMode)}
        </span>
      </div>
      {isDuplicate && (
        <Tooltip>
          <TooltipTrigger>
            <FileWarning className="h-4 w-4 text-muted-foreground text-orange-500" />{" "}
            {/* Changed from Copy to Warning */}
          </TooltipTrigger>
          <TooltipContent>
            <p>Multiple orders with this customer name</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
