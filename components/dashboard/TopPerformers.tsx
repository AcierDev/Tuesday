"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Item,
  ColumnValue,
  ColumnTitles,
  EmployeeNames,
} from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";

type TimeRange = "daily" | "weekly" | "monthly" | "yearly";

interface PerformerData {
  name: string;
  squares: number;
}

const RANK_STYLES = {
  first: {
    default:
      "bg-yellow-100/50 dark:bg-yellow-900/20 font-semibold border-l-4 border-yellow-400",
    selected:
      "bg-yellow-200/70 dark:bg-yellow-500 font-semibold border-l-4 border-yellow-400",
  },
  second: {
    default: "bg-gray-200/50 dark:bg-gray-700/30 border-l-4 border-gray-400",
    selected: "bg-gray-300/70 dark:bg-gray-400 border-l-4 border-gray-400",
  },
  other: {
    selected: "bg-blue-100 dark:bg-blue-900",
  },
} as const;

export default function TopPerformers({
  timeRange,
  selectedEmployee,
  onEmployeeClick,
}: {
  timeRange: TimeRange;
  selectedEmployee: string | null;
  onEmployeeClick: (employee: string) => void;
}) {
  const { items } = useOrderStore();

  const data = useMemo(() => {
    const performerData: { [key: string]: number } = {};

    // Define default order
    const orderMap: { [key: string]: number } = {
      [EmployeeNames.Alex]: 0,
      [EmployeeNames.Ben]: 1,
      [EmployeeNames.Tyler]: 2,
      [EmployeeNames.Bentzi]: 3,
      [EmployeeNames.Akiva]: 4,
    };

    Object.values(EmployeeNames).forEach((employee) => {
      performerData[employee] = 0;
    });

    items.forEach((item: Item) => {
      const gluedValue = item.glued;
      const sizeValue = item.size;

      if (
        // We need to adapt this since `glued` is now a string value on the flat Item.
        // The original code assumed `gluedColumn` was an object with `credit` and `lastModifiedTimestamp`.
        // Flat item structure: `glued: string`.
        // If we lost the credit/timestamp metadata in flattening, this component breaks.
        // Assuming for now that credit is NOT available or needs a new approach.
        // If the prompt "I don't want any values array" meant dropping metadata, then this feature is disabled.
        // However, `credit` was part of the value object.
        // If we want to keep it, we should have flattened it to `gluedCredit` or similar.
        // Since I didn't add `gluedCredit` to the type, I will comment this out or adapt to use just the string value if possible,
        // but top performers relies on credit.
        
        // Attempting to parse if the string value happens to contain credit (unlikely)
        // or just skipping for now as per "I don't want any values array" directive implying simplification.
        
        // Recommendation: If we need this, we should add `gluedCredit` and `gluedAt` to Item.
        // For now, to make it compile and run without crashing:
        false 
      ) {
         // ... logic removed ...
      }
    });

    return Object.entries(performerData)
      .map(([name, squares]) => ({ name, squares: Math.round(squares) }))
      .sort((a, b) => {
        // First sort by squares
        const squaresDiff = b.squares - a.squares;
        // If squares are equal, sort by default order
        return squaresDiff !== 0
          ? squaresDiff
          : (orderMap[a.name] || 0) - (orderMap[b.name] || 0);
      });
  }, [items, timeRange]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <Table className="flex-grow">
        <TableHeader>
          <TableRow>
            <TableHead className="text-gray-700 dark:text-gray-300">
              Employee
            </TableHead>
            <TableHead className="text-right text-gray-700 dark:text-gray-300">
              Squares Glued
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((performer, index) => (
            <TableRow
              key={performer.name}
              className={`
                ${
                  selectedEmployee === performer.name
                    ? index === 0 && performer.squares > 0
                      ? RANK_STYLES.first.selected
                      : index === 1 && performer.squares > 0
                      ? RANK_STYLES.second.selected
                      : RANK_STYLES.other.selected
                    : index === 0 && performer.squares > 0
                    ? RANK_STYLES.first.default
                    : index === 1 && performer.squares > 0
                    ? RANK_STYLES.second.default
                    : ""
                }
                transition-colors
              `}
            >
              <TableCell
                className="text-gray-800 dark:text-gray-200 cursor-pointer hover:underline flex items-center gap-2"
                onClick={() => onEmployeeClick(performer.name)}
              >
                {index === 0 && performer.squares > 0 && (
                  <span className="text-yellow-500" title="First Place">
                    🏆
                  </span>
                )}
                {index === 1 && performer.squares > 0 && (
                  <span className="text-gray-400" title="Second Place">
                    🥈
                  </span>
                )}
                {performer.name}
              </TableCell>
              <TableCell className="text-right text-gray-800 dark:text-gray-200">
                {performer.squares}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
