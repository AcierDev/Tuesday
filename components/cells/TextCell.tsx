// TextCell.jsx

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ColumnValue, Item } from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";
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
        const updatedItem = {
          ...item,
          values: item.values.map((value) =>
            value.columnName === columnValue.columnName
              ? {
                  ...value,
                  text: inputValue,
                  lastModifiedTimestamp: Date.now(),
                }
              : value
          ),
        };
        await updateItem(updatedItem, columnValue.columnName);
        toast.success("Value updated successfully");
      } catch (err) {
        console.error("Failed to update ColumnValue", err);
        toast.error("Failed to update the value. Please try again.");
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
