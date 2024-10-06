// NameCell.jsx

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { parseMinecraftColors } from '../../parseMinecraftColors';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

export const NameCell = ({ item, columnValue, onUpdate }) => {
  const [inputValue, setInputValue] = useState(columnValue.text || '');
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  useEffect(() => {
    setInputValue(columnValue.text || '');
  }, [columnValue.text]);

  const handleUpdate = async () => {
    if (inputValue !== columnValue.text) {
      try {
        const updatedItem = {
          ...item,
          values: item.values.map((value) =>
            value.columnName === columnValue.columnName
              ? { ...value, text: inputValue, lastModifiedTimestamp: Date.now() }
              : value
          )
        };
        await onUpdate(updatedItem, columnValue.columnName);
        toast.success("Name updated successfully");
      } catch (err) {
        console.error("Failed to update ColumnValue", err);
        toast.error("Failed to update the name. Please try again.");
      }
    }
  };

  return (
    <div className="flex items-center justify-center w-full h-full relative">
      <div className="flex items-center space-x-2 w-full">
        <Input
          className="font-medium border-0 p-2 bg-transparent w-full text-center text-transparent caret-black dark:caret-white"
          value={inputValue}
          onBlur={handleUpdate}
          onChange={(e) => setInputValue(e.target.value)}
        />
        {item.vertical ? (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-700 whitespace-nowrap">
            Vertical
          </Badge>
        ) : null}
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-900 dark:text-gray-100">
        <span className="whitespace-pre-wrap">
          {parseMinecraftColors(inputValue, isDarkMode)}
        </span>
      </div>
    </div>
  );
};
