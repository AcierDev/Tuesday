"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Board, ColumnTitles, ColumnValue, Item } from "@/typings/types";
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
  board,
  timeRange,
  selectedEmployee,
}: {
  board: Board;
  timeRange: TimeRange;
  selectedEmployee: string | null;
}) {
  const { theme } = useTheme();
  const [selectedDay, setSelectedDay] = useState<GluingActivityData | null>(
    null,
  );

  const data = useMemo(() => {
    const groupedData: { [key: string]: GluingActivityData } = {};

    board.items_page.items.forEach((item: Item) => {
      const gluedColumn = item.values.find((value: ColumnValue) =>
        value.columnName === ColumnTitles.Glued
      );
      const sizeColumn = item.values.find((value: ColumnValue) =>
        value.columnName === ColumnTitles.Size
      );
      const designColumn = item.values.find((value: ColumnValue) =>
        value.columnName === ColumnTitles.Design
      );
      const customerNameColumn = item.values.find((value: ColumnValue) =>
        value.columnName === ColumnTitles.Customer_Name
      );

      if (
        gluedColumn && !item.deleted && "credit" in gluedColumn &&
        Array.isArray(gluedColumn.credit) &&
        sizeColumn && "text" in sizeColumn &&
        designColumn && "text" in designColumn &&
        customerNameColumn && "text" in customerNameColumn
      ) {
        const [width, height] = sizeColumn.text?.split("x").map((dim) =>
          parseInt(dim.trim(), 10)
        )!;
        const squares = width * height;

        gluedColumn.credit.forEach((employee: string) => {
          if (selectedEmployee && employee !== selectedEmployee) return;

          const date = new Date(gluedColumn.lastModifiedTimestamp || "");
          let key: string;

          switch (timeRange) {
            case "daily":
              key = date.toISOString().split("T")[0];
              break;
            case "weekly":
              const weekStart = new Date(
                date.setDate(date.getDate() - date.getDay()),
              );
              key = weekStart.toISOString().split("T")[0];
              break;
            case "monthly":
              key = `${date.getFullYear()}-${
                (date.getMonth() + 1).toString().padStart(2, "0")
              }`;
              break;
            case "yearly":
              key = date.getFullYear().toString();
              break;
          }

          if (!groupedData[key]) {
            groupedData[key] = { date: key, squares: 0, items: [] };
          }

          groupedData[key].squares += squares;
          groupedData[key].items.push({
            customerName: customerNameColumn.text!,
            design: designColumn.text!,
            size: sizeColumn.text!,
            completedDate: date.toISOString().split("T")[0],
            gluedBy: gluedColumn.credit!,
          });
        });
      }
    });

    return Object.values(groupedData).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [board.items_page.items, timeRange, selectedEmployee]);

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
                          const employeeInfo = getEmployeeInfo(employee);
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
