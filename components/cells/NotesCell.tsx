// NotesCell.jsx

import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { StickyNoteIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export const NotesCell = ({ item, columnValue, onUpdate }) => {
  const [notesValue, setNotesValue] = useState(columnValue.text || '');

  const handleUpdate = async () => {
    try {
      const updatedItem = {
        ...item,
        values: item.values.map((value) =>
          value.columnName === columnValue.columnName
            ? { ...value, text: notesValue, lastModifiedTimestamp: Date.now() }
            : value
        )
      };
      await onUpdate(updatedItem, columnValue.columnName);
      toast.success("Notes updated successfully");
    } catch (err) {
      console.error("Failed to update ColumnValue", err);
      toast.error("Failed to update the notes. Please try again.");
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Popover>
            <PopoverTrigger asChild>
              <Button className="w-8 h-8 p-0 text-gray-900 dark:text-gray-100" variant="ghost">
                <StickyNoteIcon
                  className={`h-4 w-4 ${
                    notesValue ? 'text-yellow-500' : 'text-gray-500 dark:text-gray-400'
                  }`}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              <div className="space-y-2">
                <h4 className="font-medium">Notes</h4>
                <Textarea
                  placeholder="Add your notes here..."
                  rows={4}
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <div className="flex justify-end">
                  <Button onClick={handleUpdate}>Save</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </TooltipTrigger>
        <TooltipContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
          <p>
            {notesValue
              ? notesValue.substring(0, 50) + (notesValue.length > 50 ? '...' : '')
              : 'No notes'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
