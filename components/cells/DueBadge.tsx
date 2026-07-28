"use client";

import { useState } from "react";
import {
  differenceInCalendarDays,
  format,
  parseISO,
  isValid,
} from "date-fns";
import { Pause, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn, formatDueDelta } from "@/utils/functions";
import { Item, ItemStatus } from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";
import {
  canPauseDueDate,
  getEffectiveDueDateKey,
  pauseDueDate,
  resumeDueDate,
  updatePausedDueDate,
} from "@/lib/due-date-pause";
import { isWithinDueBadgeWarningWindow } from "@/config/due-badge";

interface DueBadgeProps {
  item: Item;
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
  referenceDate,
  interactive = true,
}: DueBadgeProps) => {
  const [open, setOpen] = useState(false);
  const { updateItem } = useOrderStore();

  const dueDateString = getEffectiveDueDateKey(item);
  if (!dueDateString) return null;

  const parsed = parseISO(dueDateString);
  if (!isValid(parsed)) return null;

  const ref = referenceDate ?? new Date();
  const delta = differenceInCalendarDays(parsed, ref);

  const { primary, suffix } = formatDueDelta(delta);
  const isWeekMode = suffix !== undefined;
  const isSingleDigit = !isWeekMode && primary.length === 1;
  const onHold = !!item.onHold;
  // An already-paused item can always be resumed even if its status somehow
  // drifted, so the toggle remains reachable.
  const canPause = canPauseDueDate(item.status);

  let toneClasses: string;
  if (onHold) {
    // Held items read as "paused": muted slate, independent of due urgency.
    toneClasses = interactive
      ? "bg-slate-500/80 hover:bg-slate-500/95 text-white"
      : "bg-slate-500/80 text-white";
  } else if (delta < 0) {
    toneClasses = interactive
      ? "bg-red-500/70 hover:bg-red-500/90 text-white"
      : "bg-red-500/70 text-white";
  } else if (isWithinDueBadgeWarningWindow(delta)) {
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
    isSingleDigit && !onHold
      ? "px-1 sm:px-1.5 min-w-[1.25rem] sm:min-w-[1.65rem]"
      : "px-1.5 sm:px-2 min-w-[1.875rem] sm:min-w-[2.475rem]",
    interactive &&
      "cursor-pointer transition-transform hover:scale-105 outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
    toneClasses
  );

  const inner = suffix ? (
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

  // Paused badges carry a small glyph so the state is glanceable.
  const content = onHold ? (
    <span className="flex items-center gap-0.5">
      <Pause className="h-2.5 w-2.5 flex-shrink-0 fill-current" />
      {inner}
    </span>
  ) : (
    inner
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
      const updated = updatePausedDueDate(
        item,
        format(newDate, "yyyy-MM-dd")
      );
      await updateItem(updated);
      setOpen(false);
    } catch (err) {
      console.error("Failed to update due date", err);
    }
  };

  // Toggle the due-date pause. Pre-production items are also parked at the
  // bottom of On Deck; Packaging / At The Door items stay in their section.
  const handleToggleHold = async () => {
    const next = !onHold;
    // The button is hidden for unsupported statuses, but stay defensive.
    if (next && !canPause) return;
    try {
      const updated = next ? pauseDueDate(item) : resumeDueDate(item);
      if (
        next &&
        (item.status === ItemStatus.New || item.status === ItemStatus.OnDeck)
      ) {
        updated.status = ItemStatus.OnDeck;
        updated.prevStatus = null;
      }
      await updateItem(updated);
      setOpen(false);
    } catch (err) {
      console.error("Failed to toggle hold", err);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={slotClasses}
          // Stop propagation here (not on the Badge inside) so PopoverTrigger's
          // own click handler — attached to this div via asChild — still fires
          // while the click doesn't bubble to NameCell's row-edit handler.
          onClick={(e) => e.stopPropagation()}
        >
          <Badge
            role="button"
            tabIndex={0}
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
        {(canPause || onHold) && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant={onHold ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleToggleHold}
              >
                {onHold ? (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    Resume due date
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 fill-current" />
                    Pause due date
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
