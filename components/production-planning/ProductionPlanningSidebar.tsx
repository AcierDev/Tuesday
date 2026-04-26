"use client";

import { useMemo } from "react";
import { OrderMeta } from "./types";
import { DraggableOrderCard } from "./DraggableOrderCard";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/utils/functions";

interface ProductionPlanningSidebarProps {
  orders: OrderMeta[];
  excludedItemIds: Set<string>;
  onToggleExcluded: (itemId: string, excluded: boolean) => void;
}

export function ProductionPlanningSidebar({
  orders,
  excludedItemIds,
  onToggleExcluded,
}: ProductionPlanningSidebarProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "unscheduled",
  });

  // Sort by due-date urgency, then push pinned-to-sidebar items to the bottom
  // so the auto-plan candidates dominate the visible top of the list.
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aPinned = excludedItemIds.has(a.id);
      const bPinned = excludedItemIds.has(b.id);
      if (aPinned !== bPinned) return aPinned ? 1 : -1;

      if (a.bucket === "overdue" && b.bucket !== "overdue") return -1;
      if (b.bucket === "overdue" && a.bucket !== "overdue") return 1;
      if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.blocks - a.blocks;
    });
  }, [orders, excludedItemIds]);

  const unpinnedOrders = sortedOrders.filter((o) => !excludedItemIds.has(o.id));
  const pinnedOrders = sortedOrders.filter((o) => excludedItemIds.has(o.id));
  const orderIds = sortedOrders.map((o) => o.id);

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-colors w-80 shrink-0",
        isOver && "bg-gray-50 dark:bg-gray-800/50"
      )}
    >
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex justify-end">
        <span className="text-xs font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-gray-600 dark:text-gray-400">
          {orders.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <SortableContext items={orderIds} strategy={verticalListSortingStrategy}>
          {sortedOrders.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">
              No orders found
            </div>
          ) : (
            <>
              {unpinnedOrders.map((meta) => (
                <DraggableOrderCard
                  key={meta.id}
                  id={meta.id}
                  meta={meta}
                  isPinned={false}
                  onTogglePin={() => onToggleExcluded(meta.id, true)}
                />
              ))}
              {pinnedOrders.length > 0 && (
                <div className="pt-3 mt-1 border-t border-dashed border-amber-300/60 dark:border-amber-700/40">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400 px-1 pb-2 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-amber-500" />
                    Pinned (skipped by auto-plan)
                  </div>
                  {pinnedOrders.map((meta) => (
                    <DraggableOrderCard
                      key={meta.id}
                      id={meta.id}
                      meta={meta}
                      isPinned
                      onTogglePin={() => onToggleExcluded(meta.id, false)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
