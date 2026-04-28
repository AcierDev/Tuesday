"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { parseMinecraftColors } from "@/parseMinecraftColors";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Angry,
  FileWarning,
  MessageCircleWarning,
  MoveVertical,
  Printer,
} from "lucide-react";
import { parseISO, isValid } from "date-fns";
import { cn } from "@/utils/functions";
import React from "react";
import { Item, ColumnTitles, ItemStatus } from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";
import { DueBadge } from "./DueBadge";
import {
  useTodayScheduledIds,
  useTomorrowScheduledIds,
} from "@/hooks/useTodayScheduledIds";

// // Add this style block right after imports
// const pulseKeyframes = `
//   @keyframes pulse {
//     0% {
//       transform: scale(1);
//     }
//     50% {
//       transform: scale(1.5);
//     }
//     100% {
//       transform: scale(1);
//     }
//   }
// `;

// // Add the style element to inject the keyframes
// const styleElement = document.createElement("style");
// styleElement.textContent = pulseKeyframes;
// if (typeof document !== "undefined") {
//   document.head.appendChild(styleElement);
// }

interface NameCellProps {
  item: Item;
  columnValue: {
    text: string;
    columnName: string;
  };
  tags?: {
    isDuplicate: boolean;
    isDifficultCustomer: boolean;
    isVertical: boolean;
    hasCustomerMessage: boolean;
  };
}

export const NameCell: React.FC<NameCellProps> = ({
  item,
  columnValue,
  tags,
}) => {
  const [inputValue, setInputValue] = useState(columnValue.text || "");
  const [isEditing, setIsEditing] = useState(false);
  const previousValueRef = useRef(columnValue.text);

  const { updateItem } = useOrderStore();
  const { settings } = useOrderSettings();

  useEffect(() => {
    if (columnValue.text !== previousValueRef.current) {
      setInputValue(columnValue.text || "");
      previousValueRef.current = columnValue.text;
    }
  }, [columnValue.text]);

  const handleUpdate = useCallback(async () => {
    if (inputValue === columnValue.text) return;

    try {
      const updatedItem = {
        ...item,
        customerName: inputValue,
        // We can rely on the store to handle metadata like timestamps if needed,
        // or pass a separate metadata object if we really need to track lastModified per field.
        // For now, simple update.
      };
      await updateItem(updatedItem, ColumnTitles.Customer_Name);
      toast.success("Name updated successfully");
    } catch (err) {
      console.error("Failed to update ColumnValue", err);
      toast.error("Failed to update the name. Please try again.");
      setInputValue(columnValue.text || "");
    }
  }, [inputValue, columnValue.text, item, updateItem]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        setIsEditing(false);
        handleUpdate();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setInputValue(columnValue.text || "");
        setIsEditing(false);
      }
    },
    [columnValue.text, handleUpdate]
  );

  const handleBlur = useCallback(async () => {
    setIsEditing(false);
    await handleUpdate();
  }, [handleUpdate]);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
  }, []);

  const isToday = useTodayScheduledIds().has(item.id);
  const isTomorrowRaw = useTomorrowScheduledIds().has(item.id);
  const isTomorrow = !isToday && isTomorrowRaw;
  const scheduleTag = isToday
    ? { label: "Today", classes: "bg-amber-500/80 hover:bg-amber-500/90" }
    : isTomorrow
    ? { label: "Tomorrow", classes: "bg-sky-500/70 hover:bg-sky-500/80" }
    : null;
  const parsedDueDate = item.dueDate ? parseISO(item.dueDate) : null;
  const dueBadge =
    parsedDueDate &&
    isValid(parsedDueDate) &&
    item.status !== ItemStatus.Done ? (
      <span className="inline-flex flex-shrink-0 items-center gap-1">
        {scheduleTag && (
          <span
            aria-label={`Planned for ${scheduleTag.label.toLowerCase()}`}
            className={cn(
              "inline-flex items-center justify-center h-[0.89375rem] px-1 rounded-sm whitespace-nowrap",
              "text-white text-[0.5rem] font-bold uppercase tracking-wider",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]",
              "[text-shadow:_0_1px_2px_rgb(0_0_0_/_28%)]",
              scheduleTag.classes
            )}
          >
            {scheduleTag.label}
          </span>
        )}
        <DueBadge item={item} range={settings.dueBadgeDays} />
      </span>
    ) : null;

  const isPrintMarker = inputValue.trim().toLowerCase() === "print";

  // Brand prefix ([EW]/[WF]/[SH]) is stripped from the displayed name and
  // shown as a tag to the right of the text.
  const brandPrefixMatch = inputValue.match(/^\[(EW|WF|SH)\]\s*/);
  const brandPrefix = brandPrefixMatch ? brandPrefixMatch[1] : null;
  const displayName = brandPrefixMatch
    ? inputValue.slice(brandPrefixMatch[0].length)
    : inputValue;

  // Split off the first two real words. Color codes (&a) and brand prefixes
  // ([EW]/[WF]/[SH]) don't count as words but stay grouped with the head.
  const splitFirstTwoWords = (text: string): [string, string] => {
    let wordCount = 0;
    let inWord = false;
    let i = 0;
    let splitAt = text.length;
    while (i < text.length) {
      if (/^&[0-9a-f]/i.test(text.slice(i, i + 2))) {
        i += 2;
        continue;
      }
      const prefixMatch = text.slice(i).match(/^\[(EW|WF|SH)\]/);
      if (prefixMatch) {
        i += prefixMatch[0].length;
        continue;
      }
      const isSpace = /\s/.test(text[i]!);
      if (!isSpace && !inWord) {
        wordCount++;
        if (wordCount > 2) {
          splitAt = i;
          break;
        }
        inWord = true;
      } else if (isSpace) {
        inWord = false;
      }
      i++;
    }
    return [text.slice(0, splitAt), text.slice(splitAt)];
  };
  const [firstTwoWords, restOfName] = splitFirstTwoWords(displayName);

  const brandTag = brandPrefix ? (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5",
        "bg-slate-200 text-slate-700 ring-1 ring-slate-300",
        "dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600",
        "text-[0.7rem] font-bold uppercase tracking-wide flex-shrink-0"
      )}
    >
      {brandPrefix}
    </span>
  ) : null;

  const verticalIcon = tags?.isVertical && (
    <Tooltip>
      <TooltipTrigger>
        <span className="inline-flex items-center justify-center rounded-md bg-blue-500 p-0.5">
          <MoveVertical
            className="h-4 w-4 text-black"
            strokeWidth={2.42}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Vertical Order</p>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <div className="flex items-center w-full h-full relative group -translate-x-[13px]">
      <div className="flex items-center space-x-2 w-full">
        {tags?.isDuplicate && (
          <Tooltip>
            <TooltipTrigger>
              <FileWarning className="h-4 w-4 text-orange-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Multiple orders with this customer name</p>
            </TooltipContent>
          </Tooltip>
        )}
        {tags?.isDifficultCustomer && (
          <Tooltip>
            <TooltipTrigger>
              <Angry
                className="h-4 w-4 text-red-500 animate-[pulse_3s_ease-in-out_infinite]"
                style={{
                  animation: "pulse 3s ease-in-out infinite",
                  transformOrigin: "center",
                }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Difficult customer</p>
            </TooltipContent>
          </Tooltip>
        )}
        {tags?.hasCustomerMessage && (
          <Tooltip>
            <TooltipTrigger>
              <MessageCircleWarning className="h-4 w-4 text-blue-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Customer messaged</p>
            </TooltipContent>
          </Tooltip>
        )}

        {isEditing ? (
          <div className="flex flex-1 min-w-0 items-center justify-start gap-2">
            {dueBadge}
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={cn(
                "min-w-0 flex-1 py-2 pr-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "font-medium text-left break-words",
                "transition-shadow duration-200",
                "rounded-md",
                "bg-background border border-input"
              )}
              autoFocus
            />
            {verticalIcon}
          </div>
        ) : (
          <div
            className={cn(
              "min-w-0 flex-1 py-2 pr-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "font-medium text-left break-words",
              "rounded-md",
              "flex items-center justify-start gap-2"
            )}
            onClick={() => {
              console.log("clicked");
              handleFocus();
            }}
          >
            {dueBadge}
            {isPrintMarker ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5",
                  "bg-amber-100 text-amber-900 ring-1 ring-amber-300",
                  "dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-400/40",
                  "text-xs font-bold uppercase tracking-wider"
                )}
              >
                <Printer className="h-3.5 w-3.5" strokeWidth={2.5} />
                Print
              </span>
            ) : (
              <>
                {parseMinecraftColors(firstTwoWords)}
                <span className="opacity-55 text-[0.92em]">
                  {parseMinecraftColors(restOfName)}
                </span>
              </>
            )}
            {brandTag}
            {verticalIcon}
          </div>
        )}
      </div>
    </div>
  );
};
