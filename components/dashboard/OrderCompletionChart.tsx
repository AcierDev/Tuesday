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
import {
  Board,
  ColumnTitles,
  ColumnValue,
  Item,
  ItemStatus,
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

type TimeRange = "daily" | "weekly" | "monthly" | "yearly";

interface OrderCompletionData {
  date: string;
  completions: number;
  items: Array<{
    customerName: string;
    design: string;
    size: string;
    completedDate: string;
  }>;
}

export function OrderCompletionChart(
  { board, timeRange }: { board: Board; timeRange: TimeRange },
) {
  const { theme } = useTheme();
  const [selectedDay, setSelectedDay] = useState<OrderCompletionData | null>(
    null,
  );

  const data = useMemo(() => {
    const completedItems = board.items_page.items.filter((item) =>
      item.status === ItemStatus.Done && !item.deleted
    );
    const groupedData: { [key: string]: OrderCompletionData } = {};

    completedItems.forEach((item: Item) => {
      const dueColumn = item.values.find((value: ColumnValue) =>
        value.columnName === ColumnTitles.Due
      );
      const designColumn = item.values.find((value: ColumnValue) =>
        value.columnName === ColumnTitles.Design
      );
      const sizeColumn = item.values.find((value: ColumnValue) =>
        value.columnName === ColumnTitles.Size
      );
      const customerNameColumn = item.values.find((value: ColumnValue) =>
        value.columnName === ColumnTitles.Customer_Name
      );

      if (
        dueColumn && "text" in dueColumn &&
        designColumn && "text" in designColumn &&
        sizeColumn && "text" in sizeColumn &&
        customerNameColumn && "text" in customerNameColumn
      ) {
        const date = new Date(dueColumn.text || "");
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
          groupedData[key] = { date: key, completions: 0, items: [] };
        }

        groupedData[key].completions += 1;
        groupedData[key].items.push({
          customerName: customerNameColumn.text!,
          design: designColumn.text!,
          size: sizeColumn.text!,
          completedDate: date.toISOString().split("T")[0],
        });
      }
    });

    return Object.values(groupedData).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [board.items_page.items, timeRange]);

  const chartColors = {
    light: {
      stroke: "#f0f0f0",
      text: "#888888",
      line: "#8884d8",
    },
    dark: {
      stroke: "#374151",
      text: "#9CA3AF",
      line: "#A78BFA",
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
            dataKey="completions"
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
              Order Completions for {selectedDay?.date}
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
                  <TableHead className="text-muted-foreground dark:text-gray-300 last:rounded-tr-md">
                    Completed Date
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
