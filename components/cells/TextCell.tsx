// TextCell.jsx

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ColumnValue, Item, ColumnTitles } from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";

// Helper to map column name to property
const getPropertyKey = (columnName: string): keyof Item | undefined => {
    const fieldMap: Record<string, keyof Item> = {
        [ColumnTitles.Notes]: "notes",
        // Add others if TextCell is used for them
    };
    return fieldMap[columnName];
};

export const TextCell = ({
  item,
  columnValue,
}: {
  item: Item;
  columnValue: ColumnValue;
}) => {
  const [inputValue, setInputValue] = useState(columnValue.text || "");
  const { updateItem } = useOrderStore();

  useEffect(() => {
    setInputValue(columnValue.text || "");
  }, [columnValue.text]);

  const handleUpdate = async () => {
    if (inputValue !== columnValue.text) {
      try {
        const key = getPropertyKey(columnValue.columnName);
        
        // If it's a mapped field, update directly
        if (key) {
             const updatedItem = {
                ...item,
                [key]: inputValue
             };
             await updateItem(updatedItem, columnValue.columnName);
        } else {
            // Fallback for unknown columns (shouldn't happen with strict types but safe to keep)
             console.warn("Updating unknown column in TextCell:", columnValue.columnName);
        }
      } catch (err) {
        console.error("Failed to update ColumnValue", err);
      }
    }
  };

  return (
    <Input
      className="border-0 p-2 bg-transparent text-center h-full w-full text-gray-900 dark:text-gray-100"
      value={inputValue}
      onBlur={handleUpdate}
      onChange={(e) => setInputValue(e.target.value)}
    />
  );
};
