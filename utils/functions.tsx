import {
  ColumnValue,
  Item,
  ColumnTypes,
  ProgressStatus,
  ColumnTitles,
  ItemSizes,
  ShippingStatus,
  ItemDesigns,
} from "../typings/types";
import { Badge } from "@/components/ui/badge";
import {
  addDays,
  differenceInCalendarDays,
  isBefore,
  isEqual,
  parseISO,
  isAfter,
} from "date-fns";
import { boardConfig } from "../config/boardconfig";
import { DEFAULT_PACKAGE_PRESETS_BY_SIZE } from "@/config/shipping-defaults";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Box } from "@/typings/interfaces";
import {
  DESIGN_COLOR_NAMES,
  SIZE_MULTIPLIERS,
} from "../typings/constants";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Package,
  Terminal,
  Truck,
} from "lucide-react";
import React from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getCellClassName = (columnValue: ColumnValue): string => {
  if (columnValue.type === ColumnTypes.Dropdown) {
    switch (columnValue.text) {
      case ProgressStatus.Done:
        return "bg-green-100";
      case ProgressStatus.Working_On_It:
        return "bg-yellow-100";
      case ProgressStatus.Didnt_Start:
        return "bg-white";
      case ProgressStatus.Stuck:
        return "bg-red-100";
      default:
        return "bg-white";
    }
  }
  return "bg-white";
};

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📅 DUE-DATE DELTA BADGE                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// Renders a small solid pill on the right of the due date showing the
// signed delta in calendar days (e.g. "+2", "-3", "0"):
//   • delta < 0          → red    ( -N — past due)
//   • delta === 0        → yellow ( 0  — due today, treated as warning)
//   • 0 < delta ≤ range  → yellow (+N  — within the configurable warning window)
//   • delta > range      → green  (+N  — comfortably ahead)
// The `range` arg is `OrderSettings.dueBadgeDays` (set in Settings →
// Due Badge Settings). Signature is preserved for backwards compatibility
// with existing callers.
export const getDueBadge = (dateString: string, range: number) => {
  const dueDate = parseISO(dateString);
  const today = new Date();
  const delta = differenceInCalendarDays(dueDate, today);

  let colorClasses: string;
  if (delta < 0) {
    colorClasses = "bg-red-500/70 hover:bg-red-500/70 text-white";
  } else if (delta === 0 || delta <= range) {
    colorClasses = "bg-yellow-500/70 hover:bg-yellow-500/70 text-white";
  } else {
    colorClasses = "bg-green-500/70 hover:bg-green-500/70 text-white";
  }

  const label = delta === 0 ? "0" : delta > 0 ? `+${delta}` : `${delta}`;

  return (
    <Badge
      className={cn(
        "tabular-nums text-[12.9px] px-2 py-0.5 min-w-[2.475rem] justify-center rounded-[10px] border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_28%)]",
        colorClasses
      )}
    >
      {label}
    </Badge>
  );
};

export const isPastDue = (item: Item) => {
  const dueDateText = item.dueDate;
  if (dueDateText) {
    const dueDate = parseISO(dueDateText);
    return isBefore(dueDate, new Date());
  }
  return false;
};

export function getBoxData(size: ItemSizes): Box[] {
  const configurations = DEFAULT_PACKAGE_PRESETS_BY_SIZE[size];

  if (!configurations?.length) {
    return [{ length: "0", width: "0", height: "0", weight: "0" }];
  }

  return configurations.map((configuration) => ({
    length: configuration.length.toString(),
    width: configuration.width.toString(),
    height: configuration.height.toString(),
    weight: configuration.weight.toString(),
  }));
}

export const getInputTypeForField = (field: string) => {
  const column = boardConfig.columns[field as ColumnTitles];
  if (!column) return "text";

  switch (column.type) {
    case ColumnTypes.Dropdown:
      return "select";
    case ColumnTypes.Date:
      return "date";
    case ColumnTypes.Number:
      return "number";
    default:
      return "text";
  }
};

export const getStatusIcon = (status: ShippingStatus) => {
  switch (status) {
    case "unshipped":
      return <Package className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
    case "pre_transit":
      return <Clock className="h-5 w-5 text-yellow-500" />;
    case "in_transit":
      return <Truck className="h-5 w-5 text-blue-500" />;
    case "delivered":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-red-500" />;
  }
};

export const EmptyLogs = React.memo(() => (
  <div className="flex flex-col items-center justify-center h-[200px] text-center">
    <Terminal className="w-12 h-12 mb-4 opacity-50 text-gray-400 dark:text-gray-500" />
    <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
      No System Logs
    </p>
    <p className="text-xs text-gray-400 dark:text-gray-500">
      System logs will appear here when available
    </p>
  </div>
));

function generateFallbackUUID(): string {
  const timestamp = new Date().getTime();
  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (timestamp + Math.random() * 16) % 16 | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
  return uuid;
}

// Safe UUID generation function with fallbacks
export function generateUUID(): string {
  try {
    // First try the native crypto.randomUUID()
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Second try using crypto.getRandomValues()
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);

      // Convert to UUID format
      return Array.from(array)
        .map((b, i) => {
          if (i === 6) return ((b & 0x0f) | 0x40).toString(16);
          if (i === 8) return ((b & 0x3f) | 0x80).toString(16);
          return b.toString(16).padStart(2, "0");
        })
        .join("")
        .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
    }

    // Fallback to timestamp-based UUID
    return generateFallbackUUID();
  } catch (error) {
    // Final fallback
    console.warn("Using fallback UUID generation due to error:", error);
    return generateFallbackUUID();
  }
}

export const calculateTotalSquares = (
  dayItems: { id: string; done: boolean }[],
  items: Item[],
  // Deprecated getItemValue for compatibility
  getItemValue: (item: Item, columnName: ColumnTitles) => string
): { count: number; hasIndeterminate: boolean } => {
  return dayItems.reduce<{ count: number; hasIndeterminate: boolean }>(
    (acc, scheduleItem) => {
      const item = items.find((i) => i.id === scheduleItem.id);
      if (item) {
        const size = item.size || "";

        // Split by 'x' to get width and height, but be more careful about extra content
        const parts = size.split("x");
        const dimensions = parts.slice(0, 2).map((dim) => {
          const trimmed = dim.trim().toLowerCase();
          if (
            trimmed === "n/a" ||
            trimmed === "" ||
            isNaN(parseFloat(trimmed))
          ) {
            return null;
          }
          return parseFloat(trimmed);
        });

        const width = dimensions[0] || null;
        const height = dimensions[1] || null;

        // If either dimension is indeterminate, we have an indeterminate count
        const hasIndeterminate = width === null || height === null;

        // Calculate base blocks from known dimensions
        let baseBlocks = 0;
        if (
          width !== null &&
          height !== null &&
          !isNaN(width) &&
          !isNaN(height)
        ) {
          baseBlocks = width * height;
        } else if (
          width !== null &&
          !isNaN(width) &&
          (height === null || isNaN(height))
        ) {
          // Width known, height unknown - use width as minimum
          baseBlocks = width;
        } else if (
          height !== null &&
          !isNaN(height) &&
          (width === null || isNaN(width))
        ) {
          // Height known, width unknown - use height as minimum
          baseBlocks = height;
        }

        // Ensure baseBlocks is never NaN
        if (isNaN(baseBlocks)) {
          baseBlocks = 0;
        }

        // Look for additional blocks in other fields (like a +122 value)
        const additionalBlocksPattern = /\+(\d+)/;
        let additionalBlocks = 0;

        // Check various fields for additional blocks
        const fieldsToCheck = [
          item.size || "",
          item.design || "",
          item.customerName || "",
        ];

        for (const field of fieldsToCheck) {
          const match = field.match(additionalBlocksPattern);
          if (match?.[1]) {
            additionalBlocks += parseInt(match[1], 10);
          }
        }

        const itemTotal = baseBlocks + additionalBlocks;
        const safeItemTotal = isNaN(itemTotal) ? 0 : itemTotal;

        return {
          count: acc.count + safeItemTotal,
          hasIndeterminate: acc.hasIndeterminate || hasIndeterminate,
        };
      }
      return acc;
    },
    { count: 0, hasIndeterminate: false }
  );
};

export function calculateAmountRequiredPerColor(
  design: ItemDesigns,
  size: ItemSizes
) {
  return SIZE_MULTIPLIERS[size] / DESIGN_COLOR_NAMES[design]?.length || 1;
}

export type BadgeStatus = {
  text: string;
  classes: string;
};

export const getDueDateStatus = (
  dueDate: Date | null,
  useNumber: boolean,
  scheduledDate?: Date
): BadgeStatus => {
  if (!dueDate) {
    return {
      text: "?",
      classes: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    };
  }

  const referenceDate = scheduledDate || new Date();
  referenceDate.setHours(0, 0, 0, 0);
  const dueDateStart = new Date(dueDate);
  dueDateStart.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (dueDateStart.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return {
      text: useNumber
        ? diffDays.toString()
        : diffDays === -1
        ? "Yesterday"
        : diffDays === -2
        ? "2 days ago"
        : diffDays > -7 // Less than a week ago
        ? "3+ days ago"
        : diffDays > -30 // Less than a month ago
        ? "Week+ ago"
        : "Month+ ago",
      classes: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
  } else if (diffDays === 0) {
    return {
      text: useNumber ? "0" : "Today",
      classes:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
  } else if (diffDays === 1) {
    return {
      text: useNumber ? "+1" : "Tomorrow",
      classes:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
  } else if (diffDays === 2) {
    return {
      text: useNumber ? "+2" : "2 days",
      classes:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
  } else if (diffDays < 7) {
    return {
      text: useNumber ? `+${diffDays}` : "3+ days",
      classes:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
  } else if (diffDays < 30) {
    return {
      text: useNumber ? `+${diffDays}` : "Week+",
      classes:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
  } else {
    return {
      text: useNumber ? `+${diffDays}` : "Month+",
      classes:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
  }
};
