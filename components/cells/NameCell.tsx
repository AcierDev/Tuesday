"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { parseMinecraftColors } from "@/parseMinecraftColors";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileWarning, MessageCircleWarning } from "lucide-react";
import { parseISO, isValid } from "date-fns";
import { cn, splitFirstTwoWords } from "@/utils/functions";
import React from "react";
import { Item, ColumnTitles, ItemStatus } from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";
import { DueBadge } from "./DueBadge";
import {
  useTodayScheduledIds,
  useTomorrowScheduledIds,
} from "@/hooks/useTodayScheduledIds";
import {
  BrandTag,
  LocalTag,
  parseNameTokens,
  PrintMarkerTag,
  RushedTag,
  VerticalTag,
} from "@/components/orders/name-tokens";

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
    } catch (err) {
      console.error("Failed to update ColumnValue", err);
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
      <DueBadge item={item} range={settings.dueBadgeDays} />
    ) : null;

  const scheduleBadge = scheduleTag ? (
    <span
      aria-label={`Planned for ${scheduleTag.label.toLowerCase()}`}
      className={cn(
        "inline-flex items-center justify-center h-[0.89375rem] px-1.5 rounded-sm whitespace-nowrap flex-shrink-0",
        "text-white text-[0.5rem] leading-none font-bold uppercase tracking-wider",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]",
        "[text-shadow:_0_1px_2px_rgb(0_0_0_/_28%)]",
        scheduleTag.classes
      )}
    >
      {scheduleTag.label}
    </span>
  ) : null;

  const {
    displayName,
    isRushed,
    isLocal,
    isVertical,
    brandPrefix,
    isPrintMarker,
  } = parseNameTokens(inputValue);

  const [firstTwoWords, restOfName] = splitFirstTwoWords(displayName);

  const brandTag = brandPrefix ? <BrandTag prefix={brandPrefix} /> : null;
  const rushedTag = isRushed ? <RushedTag /> : null;
  const localTag = isLocal ? <LocalTag /> : null;
  const verticalTag = isVertical ? <VerticalTag /> : null;

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
            <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
              {scheduleBadge}
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={cn(
                  "w-full py-2 pr-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  "font-medium text-left break-words",
                  "transition-shadow duration-200",
                  "rounded-md",
                  "bg-background border border-input"
                )}
                autoFocus
              />
            </div>
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
            <div className="flex flex-col items-start gap-0.5">
              {scheduleBadge}
              <span className="inline-flex items-center gap-2">
                {isPrintMarker ? (
                  <PrintMarkerTag />
                ) : (
                  <span>
                    {parseMinecraftColors(firstTwoWords)}
                    <span className="opacity-55 text-[0.92em]">
                      {parseMinecraftColors(restOfName)}
                    </span>
                  </span>
                )}
                {brandTag}
                {rushedTag}
                {localTag}
                {verticalTag}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
