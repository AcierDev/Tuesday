import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowUpDown, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/utils/functions";
import { Skeleton } from "../ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import { useCuttingData } from "@/contexts/CuttingContext";

export default function RecentEntries() {
  const { data, isLoading } = useCuttingData();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const sortedData = useMemo(
    () =>
      [...data]
        .sort((a, b) =>
          sortOrder === "asc"
            ? a.date.getTime() - b.date.getTime()
            : b.date.getTime() - a.date.getTime()
        )
        .slice(0, 6),
    [data, sortOrder]
  );

  const getChangeIndicator = (current: number, previous: number) => {
    if (current === previous) return null;
    const change = ((current - previous) / previous) * 100;
    return (
      <div
        className={cn(
          "flex items-center text-xs ml-2",
          change > 0 ? "text-green-500" : "text-red-500"
        )}
      >
        {change > 0 ? (
          <TrendingUp className="h-3 w-3 mr-1" />
        ) : (
          <TrendingDown className="h-3 w-3 mr-1" />
        )}
        {Math.abs(change).toFixed(1)}%
      </div>
    );
  };

  if (isLoading) {
    return (
      <>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Entries</CardTitle>
          <Skeleton className="h-9 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Entries</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          <ArrowUpDown className="mr-2 h-4 w-4" />
          {sortOrder === "asc" ? "Oldest First" : "Newest First"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border dark:border-gray-700">
          <Table>
            <TableHeader>
              <TableRow className="dark:hover:bg-gray-800/50">
                <TableHead className="dark:text-gray-400">Date</TableHead>
                <TableHead className="dark:text-gray-400">Count</TableHead>
                <TableHead className="dark:text-gray-400">Change</TableHead>
                <TableHead className="dark:text-gray-400 text-right">
                  Daily Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="wait">
                {sortedData.map((entry, index) => {
                  const previousEntry = sortedData[index + 1];
                  return (
                    <motion.tr
                      key={entry.date.toISOString()}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      onHoverStart={() => setHoveredRow(index)}
                      onHoverEnd={() => setHoveredRow(null)}
                      className={cn(
                        "group transition-colors",
                        "dark:hover:bg-gray-800/50",
                        hoveredRow === index && "dark:bg-gray-800/30"
                      )}
                    >
                      <TableCell className="dark:text-gray-300 font-medium">
                        {format(entry.date, "PP")}
                      </TableCell>
                      <TableCell className="dark:text-gray-300">
                        <div className="flex items-center">
                          {entry.count}
                          {previousEntry &&
                            getChangeIndicator(
                              entry.count,
                              previousEntry.count
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="dark:text-gray-300">
                        {previousEntry ? (
                          <span
                            className={cn(
                              entry.count - previousEntry.count > 0
                                ? "text-green-500"
                                : entry.count - previousEntry.count < 0
                                ? "text-red-500"
                                : "text-gray-500"
                            )}
                          >
                            {entry.count - previousEntry.count > 0 ? "+" : ""}
                            {entry.count - previousEntry.count}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right dark:text-gray-300">
                        <motion.div
                          initial={{ scale: 1 }}
                          animate={{
                            scale: hoveredRow === index ? 1.05 : 1,
                            color:
                              hoveredRow === index
                                ? "rgb(59, 130, 246)"
                                : "currentColor",
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          {entry.count.toLocaleString()}
                        </motion.div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>

        {sortedData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center dark:text-gray-400">
            <p>No cutting data available</p>
            <p className="text-sm mt-1">
              Start tracking your daily cuts to see them here
            </p>
          </div>
        )}
      </CardContent>
    </>
  );
}
