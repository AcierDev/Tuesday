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
import { cn, getDueBadge } from "../../utils/functions";
import { useOrderSettings } from "../../contexts/OrderSettingsContext";
import { toast } from "sonner";
import {
  ColumnTitles,
  ColumnValue,
  Item,
  ItemStatus,
} from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { useUser } from "@/contexts/UserContext";

interface DateCellProps {
  item: Item;
  columnValue: ColumnValue;
}

export const DateCell = ({ item, columnValue }: DateCellProps) => {
  const [date, setDate] = useState<Date | null>(null);
  const { settings } = useOrderSettings();
  const { updateItem } = useOrderStore();
  const { user } = useUser();

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
      await updateItem(updatedItem, columnValue.columnName, user || undefined);
      toast.success("Date updated successfully");
    } catch (err) {
      console.error("Failed to update ColumnValue", err);
      toast.error("Failed to update the date. Please try again.");
    }
  };

  const formattedDate = date && isValid(date) ? format(date, "MM/dd/yyyy") : "";

  return (
    <div className={"flex items-center justify-center space-x-2 h-full"}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            className="w-full h-full justify-center p-2 dark:text-white"
            variant="ghost"
          >
            <CalendarIcon
              className={cn(
                "mr-2 h-4 w-4",
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
      {date &&
        isValid(date) &&
        item.status !== ItemStatus.Done &&
        getDueBadge(date.toISOString(), settings.dueBadgeDays)}
    </div>
  );
};
