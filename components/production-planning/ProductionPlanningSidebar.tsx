"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderMeta } from "./types";
import { DraggableOrderCard } from "./DraggableOrderCard";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/utils/functions";

interface ProductionPlanningSidebarProps {
  orders: OrderMeta[];
}

type FilterOption = "all" | "overdue" | "thisWeek" | "nextWeek" | "future" | "noDue";

const filterOptions: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All Orders" },
  { value: "overdue", label: "Overdue" },
  { value: "thisWeek", label: "Due This Week" },
  { value: "nextWeek", label: "Due Next Week" },
  { value: "future", label: "Future" },
  { value: "noDue", label: "No Due Date" },
];

export function ProductionPlanningSidebar({ orders }: ProductionPlanningSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");
  
  const { setNodeRef, isOver } = useDroppable({
    id: "unscheduled",
  });

  const filteredOrders = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    return orders.filter((meta) => {
      if (filter !== "all" && meta.bucket !== filter) return false;
      if (!normalized) return true;
      const customerName = (meta.item.customerName || "").toLowerCase();
      const size = (meta.item.size || "").toLowerCase();
      return customerName.includes(normalized) || size.includes(normalized);
    });
  }, [orders, filter, searchTerm]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      if (a.bucket === "overdue" && b.bucket !== "overdue") return -1;
      if (b.bucket === "overdue" && a.bucket !== "overdue") return 1;
      if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.blocks - a.blocks;
    });
  }, [filteredOrders]);

  const orderIds = sortedOrders.map(o => o.id);

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-colors w-80 shrink-0",
        isOver && "bg-gray-50 dark:bg-gray-800/50"
      )}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Unscheduled</h2>
          <span className="text-xs font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-gray-600 dark:text-gray-400">
            {orders.length}
          </span>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search orders..."
            className="pl-9 h-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          />
        </div>

        <Select value={filter} onValueChange={(v: FilterOption) => setFilter(v)}>
          <SelectTrigger className="h-8 text-xs w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <SortableContext items={orderIds} strategy={verticalListSortingStrategy}>
          {sortedOrders.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">
              No orders found
            </div>
          ) : (
            sortedOrders.map((meta) => (
              <DraggableOrderCard
                key={meta.id}
                id={meta.id}
                meta={meta}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
