"use client";

import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "../../utils/functions";
import { ColumnTitles, ColumnValue, Item } from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";

interface DateCellProps {
  item: Item;
  columnValue: ColumnValue;
}

export const DateCell = ({ item, columnValue }: DateCellProps) => {
  const [date, setDate] = useState<Date | null>(null);
  const { updateItem } = useOrderStore();

  useEffect(() => {
    if (columnValue.text) {
      // Try parsing as ISO string first
      const parsedDate = parseISO(columnValue.text);

      if (isValid(parsedDate)) {
        setDate(parsedDate);
      } else {
        // If not valid ISO string, try parsing as milliseconds
        const msDate = new Date(Number(columnValue.text));
        setDate(isValid(msDate) ? msDate : null);
      }
    } else {
      setDate(null);
    }
  }, [columnValue.text]);

  const handleUpdate = async (newDate: Date | null) => {
    try {
      const newValue = newDate ? newDate.toISOString() : "";
      const updatedItem = {
        ...item,
        dueDate: newValue,
      };
      await updateItem(updatedItem, columnValue.columnName);
    } catch (err) {
      console.error("Failed to update ColumnValue", err);
    }
  };

  const formattedDate = date && isValid(date) ? format(date, "MM/dd/yyyy") : "";

  return (
    <div className={"flex items-center justify-center space-x-2 h-full"}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            className="w-full h-full justify-center p-1 sm:p-2 text-[0.6875rem] sm:text-sm dark:text-white"
            variant="ghost"
          >
            <CalendarIcon
              className={cn(
                "mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4",
                item.isScheduled && "text-yellow-500"
              )}
            />
            {formattedDate || ""}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto p-0 bg-white dark:bg-gray-800"
        >
          <Calendar
            initialFocus
            mode="single"
            selected={date}
            onSelect={(newDate: Date | null) => {
              setDate(newDate);
              handleUpdate(newDate);
            }}
            className="text-gray-900 dark:text-gray-100"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
