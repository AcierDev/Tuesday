"use client";

import { useMemo } from "react";
import { OrderMeta } from "./types";
import { DraggableOrderCard } from "./DraggableOrderCard";
import { OrderCard } from "./OrderCard";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/utils/functions";

interface ProductionPlanningSidebarProps {
  orders: OrderMeta[];
  allOrdersById: Map<string, OrderMeta>;
  excludedItemIds: Set<string>;
  onToggleExcluded: (itemId: string, excluded: boolean) => void;
  onContextMenu?: (e: React.MouseEvent, itemId: string) => void;
}

export function ProductionPlanningSidebar({
  orders,
  allOrdersById,
  excludedItemIds,
  onToggleExcluded,
  onContextMenu,
}: ProductionPlanningSidebarProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "unscheduled",
  });

  // Mirror the day-column ghost: when the user drags a scheduled card into
  // the sidebar, render a faded preview at the top so they get the same
  // "card will land here" affordance the day columns have.
  const { active, over } = useDndContext();
  const activeId = active?.id != null ? String(active.id) : undefined;
  const overId = over?.id != null ? String(over.id) : null;
  const activeMeta = activeId ? allOrdersById.get(activeId) : undefined;
  const activeAlreadyHere = activeId
    ? orders.some((o) => o.id === activeId)
    : false;
  const isTargetingSidebar =
    !!overId &&
    (overId === "unscheduled" || orders.some((o) => o.id === overId));
  const showGhost =
    isTargetingSidebar && !!activeMeta && !activeAlreadyHere;

  // Sort by due-date urgency (least urgent at top, overdue at bottom), then
  // push pinned-to-sidebar items to the bottom so the auto-plan candidates
  // dominate the visible top of the list.
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aPinned = excludedItemIds.has(a.id);
      const bPinned = excludedItemIds.has(b.id);
      if (aPinned !== bPinned) return aPinned ? 1 : -1;

      if (!a.dueDate && b.dueDate) return 1;
      if (a.dueDate && !b.dueDate) return -1;
      if (a.dueDate && b.dueDate) return b.dueDate.getTime() - a.dueDate.getTime();
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
        "hidden lg:flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-colors w-60 shrink-0",
        isOver && "bg-gray-50 dark:bg-gray-800/50"
      )}
    >
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
            Unscheduled
          </h2>
          <p className="text-[0.6875rem] text-gray-500 dark:text-gray-400 leading-snug mt-0.5">
            Items not yet placed. Drag onto a day to schedule.
          </p>
        </div>
        <span className="text-xs font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-gray-600 dark:text-gray-400 shrink-0">
          {orders.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <SortableContext items={orderIds} strategy={verticalListSortingStrategy}>
          {sortedOrders.length === 0 ? (
            showGhost && activeMeta ? (
              <div className="opacity-40 pointer-events-none mb-2.5">
                <OrderCard meta={activeMeta} isScheduled={false} />
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-gray-400">
                No orders found
              </div>
            )
          ) : (
            <>
              {showGhost && activeMeta && (
                <div className="opacity-40 pointer-events-none mb-2.5">
                  <OrderCard meta={activeMeta} isScheduled={false} />
                </div>
              )}
              {unpinnedOrders.map((meta) => (
                <DraggableOrderCard
                  key={meta.id}
                  id={meta.id}
                  meta={meta}
                  isPinned={false}
                  onTogglePin={() => onToggleExcluded(meta.id, true)}
                  onContextMenu={
                    onContextMenu
                      ? (e) => onContextMenu(e, meta.id)
                      : undefined
                  }
                />
              ))}
              {pinnedOrders.length > 0 && (
                <div className="pt-3 mt-1 border-t border-dashed border-amber-300/60 dark:border-amber-700/40">
                  <div className="text-[0.625rem] uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400 px-1 pb-2 flex items-center gap-1">
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
                      onContextMenu={
                        onContextMenu
                          ? (e) => onContextMenu(e, meta.id)
                          : undefined
                      }
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
