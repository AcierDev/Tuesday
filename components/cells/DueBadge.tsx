"use client";

import { useState } from "react";
import { differenceInCalendarDays, parseISO, isValid } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn, formatDueDelta } from "@/utils/functions";
import { Item } from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";

interface DueBadgeProps {
  item: Item;
  range: number;
}

export const DueBadge = ({ item, range }: DueBadgeProps) => {
  const [open, setOpen] = useState(false);
  const { updateItem } = useOrderStore();

  const dueDateString = item.dueDate;
  if (!dueDateString) return null;

  const parsed = parseISO(dueDateString);
  if (!isValid(parsed)) return null;

  const today = new Date();
  const delta = differenceInCalendarDays(parsed, today);

  let colorClasses: string;
  if (delta < 0) {
    colorClasses = "bg-red-500/70 hover:bg-red-500/90 text-white";
  } else if (delta === 0 || delta <= range) {
    colorClasses = "bg-yellow-500/70 hover:bg-yellow-500/90 text-white";
  } else {
    colorClasses = "bg-green-500/70 hover:bg-green-500/90 text-white";
  }

  const { primary, suffix } = formatDueDelta(delta);

  const handleSelect = async (newDate: Date | undefined) => {
    if (!newDate) return;
    try {
      const updated = { ...item, dueDate: newDate.toISOString() };
      await updateItem(updated);
      setOpen(false);
    } catch (err) {
      console.error("Failed to update due date", err);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge
          role="button"
          tabIndex={0}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "tabular-nums text-[0.625rem] sm:text-[0.80625rem] px-1.5 sm:px-2 py-0.5 min-w-[1.875rem] sm:min-w-[2.475rem] justify-center rounded-md sm:rounded-[10px] border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_28%)] cursor-pointer transition-transform hover:scale-105",
            "outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
            colorClasses
          )}
        >
          {suffix ? (
            <span className="flex flex-col items-center leading-[0.95]">
              <span>{primary}</span>
              <span className="text-[0.4375rem] sm:text-[0.5625rem] font-medium tracking-wide opacity-95">
                {suffix}
              </span>
            </span>
          ) : (
            primary
          )}
        </Badge>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-0 bg-white dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 pt-2 pb-1 text-lg font-medium text-gray-700 dark:text-gray-200 tabular-nums">
          Due {parsed.toLocaleDateString()}
        </div>
        <Calendar
          initialFocus
          mode="single"
          selected={parsed}
          onSelect={handleSelect}
          className="text-gray-900 dark:text-gray-100"
        />
      </PopoverContent>
    </Popover>
  );
};
