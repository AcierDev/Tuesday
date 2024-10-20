"use client";

import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { getDueBadge } from "../../utils/functions";
import { useOrderSettings } from "../../contexts/OrderSettingsContext";
import { toast } from "sonner";
import { ItemStatus } from "@/typings/types";

export const DateCell = ({ item, columnValue, onUpdate }) => {
  const [date, setDate] = useState(null);
  const { settings } = useOrderSettings();

  useEffect(() => {
    if (columnValue.text) {
      const parsedDate = parseISO(columnValue.text);
      setDate(isValid(parsedDate) ? parsedDate : null);
    } else {
      setDate(null);
    }
  }, [columnValue.text]);

  const handleUpdate = async (newDate) => {
    try {
      const newValue = newDate ? newDate.toISOString() : "";
      const updatedItem = {
        ...item,
        values: item.values.map((value) =>
          value.columnName === columnValue.columnName
            ? { ...value, text: newValue, lastModifiedTimestamp: Date.now() }
            : value
        ),
      };
      await onUpdate(updatedItem, columnValue.columnName);
      toast.success("Date updated successfully");
    } catch (err) {
      console.error("Failed to update ColumnValue", err);
      toast.error("Failed to update the date. Please try again.");
    }
  };

  const formattedDate = date && isValid(date) ? format(date, "MM/dd/yyyy") : "";

  return (
    <div className="flex items-center justify-center space-x-2 h-full">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            className="w-full h-full justify-center p-2 text-gray-900 dark:text-gray-100"
            variant="ghost"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
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
            onSelect={(newDate) => {
              setDate(newDate);
              handleUpdate(newDate);
            }}
            className="text-gray-900 dark:text-gray-100"
          />
        </PopoverContent>
      </Popover>
      {date && isValid(date) && item.status !== ItemStatus.Done &&
        getDueBadge(date.toISOString(), settings.dueBadgeDays)}
    </div>
  );
};
