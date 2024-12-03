import {
  ColumnValue,
  Item,
  ColumnTypes,
  ProgressStatus,
  ColumnTitles,
  ItemSizes,
  EmployeeNames,
  ShippingStatus,
} from "../typings/types";
import { Badge } from "@/components/ui/badge";
import {
  format,
  addDays,
  isWithinInterval,
  isBefore,
  isToday,
  isEqual,
  parseISO,
  isAfter,
} from "date-fns";
import { boardConfig } from "../config/boardconfig";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Box } from "@/typings/interfaces";
import {
  CREDIT_COLORS,
  CreditOption,
  EMPLOYEE_MAP,
  INITIALS_MAP,
  OPTION_IMAGES,
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

export function getEmployeeInfo(credit: EmployeeNames) {
  const initials = INITIALS_MAP[credit];
  return {
    name: credit,
    initials,
    image: initials ? OPTION_IMAGES[initials] : null,
    color: initials ? CREDIT_COLORS[initials] : null,
  };
}

export function getEmployeeInfoFromInitials(initials: CreditOption) {
  const name = EMPLOYEE_MAP[initials];
  return {
    name,
    initials,
    image: OPTION_IMAGES[initials],
    color: CREDIT_COLORS[initials],
  };
}

export const getDueBadge = (dateString: string, range: number) => {
  const dueDate = parseISO(dateString);
  const now = new Date();
  const daysFromNow = addDays(now, range);

  if (isBefore(dueDate, now) || isEqual(dueDate, now)) {
    return <Badge variant="destructive">Overdue</Badge>;
  } else if (isAfter(dueDate, now) && isBefore(dueDate, daysFromNow)) {
    return <Badge variant="destructive">Due</Badge>;
  }
  return null;
};

export const isPastDue = (item: Item) => {
  const dueDateValue = item.values.find(
    (value) => value.columnName === ColumnTitles.Due
  );
  if (dueDateValue && dueDateValue.text) {
    const dueDate = parseISO(dueDateValue.text);
    return isBefore(dueDate, new Date());
  }
  return false;
};

export function getBoxData(size: ItemSizes): Box[] {
  const [width, length] = size.split(" x ").map(Number);

  const dimensionConfigs: { [key: string]: any } = {
    "14 x 7": [{ length: 44, width: 22, height: 4, weight: 12 }],
    "16 x 6": [{ length: 54, width: 22, height: 4, weight: 15 }],
    "16 x 10": [{ length: 39, width: 35, height: 7, weight: 40 }],
    "19 x 10": [{ length: 39, width: 35, height: 7, weight: 50 }],
    "22 x 10": [{ length: 39, width: 35, height: 7, weight: 60 }],
    "19 x 11": [{ length: 39, width: 35, height: 7, weight: 50 }],
    "22 x 11": [{ length: 41.5, width: 37, height: 6, weight: 65 }],
    "27 x 11": [
      { length: 39, width: 35, height: 7, weight: 50 },
      { length: 41, width: 32, height: 4, weight: 25 },
    ],
    "27 x 15": [
      { length: 54, width: 32, height: 5, weight: 35 },
      { length: 54, width: 32, height: 5, weight: 35 },
      { length: 54, width: 32, height: 5, weight: 35 },
    ],
    "31 x 15": [
      { length: 54, width: 32, height: 5, weight: 35 },
      { length: 54, width: 32, height: 5, weight: 35 },
      { length: 54, width: 26, height: 7, weight: 55 },
    ],
    "36 x 15": [
      { length: 54, width: 32, height: 5, weight: 35 },
      { length: 54, width: 32, height: 5, weight: 35 },
      { length: 54, width: 32, height: 5, weight: 35 },
      { length: 54, width: 32, height: 5, weight: 35 },
    ],
  };

  const key = `${width} x ${length}`;
  const configurations = dimensionConfigs[key];

  if (!configurations) {
    return [
      {
        length: "0",
        width: "0",
        height: "0",
        weight: "0",
      },
    ];
  } else {
    return configurations;
  }
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

export async function combineImages(
  imageUrl1: string,
  imageUrl2: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img1 = new Image();
    const img2 = new Image();

    img1.crossOrigin = "anonymous";
    img2.crossOrigin = "anonymous";

    img1.src = imageUrl1;
    img2.src = imageUrl2;

    img1.onload = () => {
      img2.onload = () => {
        const targetHeight = Math.max(img1.height, img2.height);
        const img1AspectRatio = img1.width / img1.height;
        const img2AspectRatio = img2.width / img2.height;
        const img1TargetWidth = targetHeight * img1AspectRatio;
        const img2TargetWidth = targetHeight * img2AspectRatio;

        const canvas = document.createElement("canvas");
        const totalWidth = img1TargetWidth + img2TargetWidth;
        canvas.width = totalWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img1, 0, 0, img1TargetWidth, targetHeight);
        ctx.drawImage(img2, img1TargetWidth, 0, img2TargetWidth, targetHeight);

        resolve(canvas.toDataURL("image/png"));
      };

      img2.onerror = () =>
        reject(new Error(`Failed to load image: ${imageUrl2}`));
    };

    img1.onerror = () =>
      reject(new Error(`Failed to load image: ${imageUrl1}`));
  });
}

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
  let uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
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
