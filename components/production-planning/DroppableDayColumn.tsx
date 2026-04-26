"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DayName, ScheduledOrder } from "@/typings/types";
import { OrderMeta } from "./types";
import { DraggableOrderCard } from "./DraggableOrderCard";
import { CapacityIndicator } from "./CapacityIndicator";
import { cn } from "@/utils/functions";

type DayColumnOrder = ScheduledOrder & { pinned: boolean };

interface DroppableDayColumnProps {
  day: DayName;
  dateLabel: string;
  orders: DayColumnOrder[];
  ordersById: Map<string, OrderMeta>;
  totalBlocks: number;
  capacity: number;
  onUnschedule: (itemId: string, actualDay: DayName) => void;
  onTogglePin: (itemId: string, actualDay: DayName) => void;
  date: Date;
}

export function DroppableDayColumn({
  day,
  dateLabel,
  orders,
  ordersById,
  totalBlocks,
  capacity,
  onUnschedule,
  onTogglePin,
  date,
}: DroppableDayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: day,
    data: { day, totalBlocks },
  });

  // Pinned entries always sit at the bottom of the column. Within each
  // partition the original order is preserved so manual reordering still works.
  const unpinned = orders.filter((o) => !o.pinned);
  const pinned = orders.filter((o) => o.pinned);
  const orderedIds = [...unpinned, ...pinned].map((o) => o.itemId);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full rounded-xl border transition-colors bg-gray-50/50 dark:bg-gray-900/50",
        isOver ? "border-primary/50 bg-primary/5 ring-2 ring-primary/20" : "border-transparent hover:border-gray-200 dark:hover:border-gray-800"
      )}
    >
      {/* Header */}
      <div className="p-3 pb-2 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-t-xl sticky top-0 z-10">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{day}</h3>
          <span className="text-xs text-gray-500 font-medium">{dateLabel}</span>
        </div>
        <CapacityIndicator current={totalBlocks} max={capacity} />
      </div>

      {/* List */}
      <div className="flex-1 p-2 overflow-y-auto min-h-[150px]">
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          {orders.length === 0 ? (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg m-1">
              <span className="text-xs text-gray-400 font-medium">Drop here</span>
            </div>
          ) : (
            <div className="space-y-2">
              {unpinned.map((order) => {
                const meta = ordersById.get(order.itemId);
                if (!meta) return null;
                return (
                  <DraggableOrderCard
                    key={order.itemId}
                    id={order.itemId}
                    meta={meta}
                    isScheduled
                    scheduledDay={day}
                    onUnschedule={() => onUnschedule(order.itemId, order.day)}
                    onTogglePin={() => onTogglePin(order.itemId, order.day)}
                    isPinned={false}
                    referenceDate={date}
                  />
                );
              })}
              {pinned.length > 0 && (
                <div className="pt-3 mt-1 border-t border-dashed border-amber-300/60 dark:border-amber-700/40">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400 px-1 pb-2 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-amber-500" />
                    Pinned
                  </div>
                  <div className="space-y-2">
                    {pinned.map((order) => {
                      const meta = ordersById.get(order.itemId);
                      if (!meta) return null;
                      return (
                        <DraggableOrderCard
                          key={order.itemId}
                          id={order.itemId}
                          meta={meta}
                          isScheduled
                          scheduledDay={day}
                          onUnschedule={() =>
                            onUnschedule(order.itemId, order.day)
                          }
                          onTogglePin={() =>
                            onTogglePin(order.itemId, order.day)
                          }
                          isPinned
                          referenceDate={date}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
