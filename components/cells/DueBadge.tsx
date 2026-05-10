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
  // Yellow-threshold cutoff, in days. Matches OrderSettings.dueBadgeDays.
  range: number;
  // Reference date for the delta. Defaults to today; the planner passes the
  // scheduled day so a card shows "due on/by this scheduled day", not "due
  // from today".
  referenceDate?: Date;
  // false → render as a static badge (no popover, no hover lift). Used by
  // the planner card where the date isn't editable from the card itself.
  interactive?: boolean;
}

// Single source of truth for the colored due-date badge. Both the orders
// board (interactive, today-relative) and the planner card (read-only,
// reference-day-relative) render through this component.
//
// Edit colors / shadows / sizing here and every site that shows a due badge
// updates with it.
export const DueBadge = ({
  item,
  range,
  referenceDate,
  interactive = true,
}: DueBadgeProps) => {
  const [open, setOpen] = useState(false);
  const { updateItem } = useOrderStore();

  const dueDateString = item.dueDate;
  if (!dueDateString) return null;

  const parsed = parseISO(dueDateString);
  if (!isValid(parsed)) return null;

  const ref = referenceDate ?? new Date();
  const delta = differenceInCalendarDays(parsed, ref);

  const { primary, suffix } = formatDueDelta(delta);
  const isWeekMode = suffix !== undefined;
  const isSingleDigit = !isWeekMode && primary.length === 1;

  let toneClasses: string;
  if (delta < 0) {
    toneClasses = interactive
      ? "bg-red-500/70 hover:bg-red-500/90 text-white"
      : "bg-red-500/70 text-white";
  } else if (delta === 0 || delta <= range) {
    toneClasses = interactive
      ? "bg-yellow-500/70 hover:bg-yellow-500/90 text-white"
      : "bg-yellow-500/70 text-white";
  } else if (isWeekMode) {
    toneClasses = interactive
      ? "bg-blue-500/70 hover:bg-blue-500/90 text-white"
      : "bg-blue-500/70 text-white";
  } else {
    toneClasses = interactive
      ? "bg-green-500/70 hover:bg-green-500/90 text-white"
      : "bg-green-500/70 text-white";
  }

  const badgeClasses = cn(
    "tabular-nums text-[0.625rem] sm:text-[0.80625rem] py-0.5 justify-center rounded-md sm:rounded-[10px] border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_28%)]",
    isSingleDigit
      ? "px-1 sm:px-1.5 min-w-[1.25rem] sm:min-w-[1.65rem]"
      : "px-1.5 sm:px-2 min-w-[1.875rem] sm:min-w-[2.475rem]",
    interactive &&
      "cursor-pointer transition-transform hover:scale-105 outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
    toneClasses
  );

  const content = suffix ? (
    <span className="flex flex-col items-center leading-[0.95]">
      <span className="text-[0.78125rem] sm:text-[1.0078125rem]">
        {primary}
      </span>
      <span className="text-[0.4375rem] sm:text-[0.5625rem] font-medium tracking-wide opacity-95">
        {suffix}
      </span>
    </span>
  ) : (
    primary
  );

  const slotClasses =
    "inline-flex justify-center flex-shrink-0 min-w-[1.875rem] sm:min-w-[2.475rem]";

  if (!interactive) {
    return (
      <div className={slotClasses}>
        <Badge className={badgeClasses}>
          {content}
        </Badge>
      </div>
    );
  }

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
        <div className={slotClasses}>
          <Badge
            role="button"
            tabIndex={0}
            onClick={(e) => e.stopPropagation()}
            className={badgeClasses}
          >
            {content}
          </Badge>
        </div>
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
