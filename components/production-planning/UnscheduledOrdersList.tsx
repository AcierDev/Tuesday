"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderMeta, DueBucket } from "./types";
import { OrderCard } from "./OrderCard";
import { DayName } from "@/typings/types";
import { ColumnTitles } from "@/typings/types";

interface UnscheduledOrdersListProps {
  orders: OrderMeta[];
  onSchedule: (itemId: string, day: DayName) => void;
}

type FilterOption = "all" | "overdue" | "thisWeek" | "nextWeek" | "future" | "noDue";

const filterOptions: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "thisWeek", label: "Due This Week" },
  { value: "nextWeek", label: "Due Next Week" },
  { value: "future", label: "Future" },
  { value: "noDue", label: "No Due Date" },
];

export function UnscheduledOrdersList({
  orders,
  onSchedule,
}: UnscheduledOrdersListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");

  const filteredOrders = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    return orders.filter((meta) => {
      // Filter by bucket
      if (filter !== "all" && meta.bucket !== filter) {
        return false;
      }

      // Search filter
      if (!normalized) return true;

      const customerName = (meta.item.customerName || "").toLowerCase();
      const size = (meta.item.size || "").toLowerCase();

      return customerName.includes(normalized) || size.includes(normalized);
    });
  }, [orders, filter, searchTerm]);

  // Sort by due date (most urgent first)
  const sortedOrders = useMemo(() => {
    const copy = [...filteredOrders];
    
    return copy.sort((a, b) => {
      // Overdue first
      if (a.bucket === "overdue" && b.bucket !== "overdue") return -1;
      if (b.bucket === "overdue" && a.bucket !== "overdue") return 1;
      
      // Then by due date
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      
      // Then by blocks (larger first)
      return b.blocks - a.blocks;
    });
  }, [filteredOrders]);

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 p-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="pl-9 h-9"
            />
          </div>
          <Select
            value={filter}
            onValueChange={(value: FilterOption) => setFilter(value)}
          >
            <SelectTrigger className="w-full sm:w-[140px] h-9">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 p-3">
        {sortedOrders.length === 0 ? (
          <div className="text-center text-xs text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg py-12">
            No orders found
          </div>
        ) : (
          sortedOrders.map((meta) => (
            <OrderCard
              key={meta.id}
              meta={meta}
              showScheduleButtons
              onSchedule={(day) => onSchedule(meta.id, day)}
            />
          ))
        )}
      </div>
    </div>
  );
}

