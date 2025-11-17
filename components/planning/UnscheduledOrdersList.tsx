"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColumnTitles } from "@/typings/types";

import {
  FilterOption,
  OrderMeta,
  ScheduledPlacement,
  SortOption,
} from "@/components/planning/types";
import { OrderListItem } from "@/components/planning/OrderListItem";

interface UnscheduledOrdersListProps {
  orders: OrderMeta[];
  onSchedule: (itemId: string, placement: ScheduledPlacement) => void;
}

const filterOptions: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "thisWeek", label: "Due This Week" },
  { value: "nextWeek", label: "Due Next Week" },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "dueDate", label: "Due Date" },
  { value: "blocks", label: "Block Count" },
  { value: "status", label: "Status" },
];

const bucketOrder: Record<string, number> = {
  overdue: 0,
  thisWeek: 1,
  nextWeek: 2,
  future: 3,
  noDue: 4,
};

export function UnscheduledOrdersList({
  orders,
  onSchedule,
}: UnscheduledOrdersListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [sort, setSort] = useState<SortOption>("dueDate");

  const filteredOrders = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    return orders.filter((meta) => {
      if (filter !== "all" && meta.bucket !== filter) {
        return false;
      }

      if (!normalized) return true;

      const customerName =
        meta.item.values
          .find((v) => v.columnName === ColumnTitles.Customer_Name)
          ?.text?.toLowerCase() || "";
      const design =
        meta.item.values
          .find((v) => v.columnName === ColumnTitles.Design)
          ?.text?.toLowerCase() || "";
      const size =
        meta.item.values
          .find((v) => v.columnName === ColumnTitles.Size)
          ?.text?.toLowerCase() || "";

      return (
        customerName.includes(normalized) ||
        design.includes(normalized) ||
        size.includes(normalized)
      );
    });
  }, [orders, filter, searchTerm]);

  const sortedOrders = useMemo(() => {
    const copy = [...filteredOrders];

    copy.sort((a, b) => {
      if (sort === "dueDate") {
        if (a.dueDate && b.dueDate) {
          return a.dueDate.getTime() - b.dueDate.getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return a.blocks - b.blocks;
      }

      if (sort === "blocks") {
        return b.blocks - a.blocks;
      }

      const orderA = bucketOrder[a.bucket];
      const orderB = bucketOrder[b.bucket];
      if (orderA === orderB) {
        return b.blocks - a.blocks;
      }
      return orderA - orderB;
    });

    return copy;
  }, [filteredOrders, sort]);

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-4 border-b border-gray-200 dark:border-gray-800 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative lg:w-1/2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by customer, design, or size"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Select
              value={filter}
              onValueChange={(value: FilterOption) => setFilter(value)}
            >
              <SelectTrigger className="w-[170px]">
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
            <Select
              value={sort}
              onValueChange={(value: SortOption) => setSort(value)}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {sortedOrders.length === 0 ? (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg py-10">
            No orders match your filters.
          </div>
        ) : (
          sortedOrders.map((meta) => (
            <OrderListItem key={meta.id} meta={meta} onSchedule={onSchedule} />
          ))
        )}
      </div>
    </div>
  );
}
