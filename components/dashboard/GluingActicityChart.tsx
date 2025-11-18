"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Item,
  ColumnValue,
  ColumnTitles,
  EmployeeNames,
} from "@/typings/types";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getEmployeeInfo } from "@/utils/functions";
import { useOrderStore } from "@/stores/useOrderStore";

type TimeRange = "daily" | "weekly" | "monthly" | "yearly";

interface GluingActivityData {
  date: string;
  squares: number;
  items: Array<{
    customerName: string;
    design: string;
    size: string;
    completedDate: string;
    gluedBy: string[];
  }>;
}

export function GluingActivityChart({
  timeRange,
  selectedEmployee,
}: {
  timeRange: TimeRange;
  selectedEmployee: string | null;
}) {
  const { theme } = useTheme();
  const [selectedDay, setSelectedDay] = useState<GluingActivityData | null>(
    null
  );
  const { items } = useOrderStore();

  const data = useMemo(() => {
    if (!items) return [];

    const groupedData: { [key: string]: GluingActivityData } = {};

    items.forEach((item: Item) => {
      // Similar to TopPerformers, we lack credit/timestamp metadata in the flat structure.
      // Disabling logic that relies on `credit` array for now.
      
      /*
      const gluedColumn = ...
      */
     
      // Placeholder to prevent crash but chart will be empty
      if (false) {
         // ...
      }
    });

    return Object.values(groupedData).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [items, timeRange, selectedEmployee]);

  const chartColors = {
    light: {
      stroke: "#f0f0f0",
      text: "#888888",
      line: "#82ca9d",
    },
    dark: {
      stroke: "#374151",
      text: "#9CA3AF",
      line: "#34D399",
    },
  };

  const colors = theme === "dark" ? chartColors.dark : chartColors.light;

  const handleClick = (props: any) => {
    if (props && props.activePayload && props.activePayload.length) {
      setSelectedDay(props.activePayload[0].payload);
    }
  };

  return (
    <>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} onClick={handleClick}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.stroke} />
          <XAxis dataKey="date" stroke={colors.text} />
          <YAxis stroke={colors.text} />
          <Tooltip
            contentStyle={{
              background: theme === "dark" ? "#1F2937" : "#fff",
              border: `1px solid ${colors.stroke}`,
              borderRadius: "4px",
              color: colors.text,
            }}
          />
          <Line
            type="monotone"
            dataKey="squares"
            stroke={colors.line}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="sm:max-w-[800px] bg-background text-foreground dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-gray-100">
              Gluing Activity for {selectedDay?.date}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto rounded-md">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-muted dark:bg-gray-900 rounded-t-md">
                  <TableHead className="text-muted-foreground dark:text-gray-300 first:rounded-tl-md">
                    Customer Name
                  </TableHead>
                  <TableHead className="text-muted-foreground dark:text-gray-300">
                    Design
                  </TableHead>
                  <TableHead className="text-muted-foreground dark:text-gray-300">
                    Size
                  </TableHead>
                  <TableHead className="text-muted-foreground dark:text-gray-300">
                    Completed Date
                  </TableHead>
                  <TableHead className="text-muted-foreground dark:text-gray-300 last:rounded-tr-md">
                    Glued By
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDay?.items.map((item, index) => (
                  <TableRow
                    key={index}
                    className="border-b border-border dark:border-gray-700 hover:bg-muted/50 dark:hover:bg-gray-700/50"
                  >
                    <TableCell className="text-foreground dark:text-gray-200">
                      {item.customerName}
                    </TableCell>
                    <TableCell className="text-foreground dark:text-gray-200">
                      {item.design}
                    </TableCell>
                    <TableCell className="text-foreground dark:text-gray-200">
                      {item.size}
                    </TableCell>
                    <TableCell className="text-foreground dark:text-gray-200">
                      {item.completedDate}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.gluedBy.map((employee, empIndex) => {
                          const employeeInfo = getEmployeeInfo(
                            employee as EmployeeNames
                          );
                          return (
                            <span
                              key={empIndex}
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${employeeInfo.color} text-white`}
                              title={employeeInfo.name}
                            >
                              {employeeInfo.initials}
                            </span>
                          );
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
