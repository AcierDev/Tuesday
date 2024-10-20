import { useState } from "react";
import { format } from "date-fns";
import { ArrowUpDown } from "lucide-react";
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
import { CuttingData } from "@/typings/interfaces";

interface RecentEntriesProps {
  data: CuttingData[];
}

export default function RecentEntries({ data }: RecentEntriesProps) {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const sortedData = [...data].sort((a, b) =>
    sortOrder === "asc"
      ? a.date.getTime() - b.date.getTime()
      : b.date.getTime() - a.date.getTime()
  );

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
        <Table className="dark:border-gray-200">
          <TableHeader className="dark:border-gray-200">
            <TableRow>
              <TableHead className="dark:text-gray-300">Date</TableHead>
              <TableHead className="dark:text-gray-300">2x4's Cut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.slice(0, 5).map((entry, index) => (
              <TableRow
                key={index}
                className="dark:hover:bg-gray-700 dark:border-gray-200"
              >
                <TableCell className="dark:text-gray-300">
                  {format(entry.date, "MM/dd/yyyy")}
                </TableCell>
                <TableCell className="dark:text-gray-300">
                  {entry.count}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </>
  );
}
