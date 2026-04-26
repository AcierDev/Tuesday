"use client";

import { Fragment } from "react";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DayName, ScheduledOrder } from "@/typings/types";
import { OrderMeta } from "./types";
import { DraggableOrderCard } from "./DraggableOrderCard";
import { OrderCard } from "./OrderCard";
import { CapacityIndicator } from "./CapacityIndicator";
import { Checkbox } from "@/components/ui/checkbox";
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
  autoPlanEnabled: boolean;
  onToggleAutoPlan: () => void;
  // Item IDs the auto-plan run just landed in any day — used to trigger a
  // one-shot "drop in" animation on those cards.
  recentlyPlacedIds?: Set<string>;
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
  autoPlanEnabled,
  onToggleAutoPlan,
  recentlyPlacedIds,
}: DroppableDayColumnProps) {
  const { setNodeRef } = useDroppable({
    id: day,
    data: { day, totalBlocks },
  });

  // Pinned entries always sit at the bottom of the column. Within each
  // partition the original order is preserved so manual reordering still works.
  const unpinned = orders.filter((o) => !o.pinned);
  const pinned = orders.filter((o) => o.pinned);
  const orderedIds = [...unpinned, ...pinned].map((o) => o.itemId);

  // The column's own `useDroppable.isOver` flips off whenever the cursor is
  // sitting on a card inside the column (cards register as their own
  // droppables via `useSortable`). Derive a wider "is this column the drop
  // target" from the active `over.id` instead, so the highlight and ghost
  // preview both stay on while hovering anywhere inside the column.
  const { active, over } = useDndContext();
  const overId = over?.id != null ? String(over.id) : null;
  const isTargetingThisColumn =
    !!overId &&
    (overId === day || orders.some((o) => o.itemId === overId));

  const activeId = active?.id != null ? String(active.id) : undefined;
  const activeMeta = activeId ? ordersById.get(activeId) : undefined;
  const activeAlreadyHere = activeId
    ? orders.some((o) => o.itemId === activeId)
    : false;
  const showGhost =
    isTargetingThisColumn && !!activeMeta && !activeAlreadyHere;

  // The ghost lands immediately before the unpinned card the cursor is on.
  // Anywhere else (column body, pinned card, gap) puts it at the end of
  // unpinned. handleDragEnd uses the same rule so the drop matches the preview.
  const ghostIdx = (() => {
    if (!showGhost) return -1;
    if (overId && overId !== day) {
      const idx = unpinned.findIndex((o) => o.itemId === overId);
      if (idx !== -1) return idx;
    }
    return unpinned.length;
  })();

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full rounded-xl border transition-colors bg-gray-50/50 dark:bg-gray-900/50",
        isTargetingThisColumn ? "border-primary/50 bg-primary/5 ring-2 ring-primary/20" : "border-transparent hover:border-gray-200 dark:hover:border-gray-800"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "p-3 pb-2 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-t-xl sticky top-0 z-10 transition-opacity duration-200",
          !autoPlanEnabled && "opacity-50"
        )}
      >
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{day}</h3>
          <span className="text-xs text-gray-500 font-medium">{dateLabel}</span>
        </div>
        <CapacityIndicator current={totalBlocks} max={capacity} />
      </div>

      {/* List — sized to content. Items pile from the top and the auto-plan
          checkbox is pinned to the column bottom via mt-auto, so the section
          ends right at the last order. */}
      <div
        className={cn(
          "p-2 overflow-y-auto min-h-[150px] transition-opacity duration-200",
          !autoPlanEnabled && "opacity-50"
        )}
      >
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          {orders.length === 0 ? (
            showGhost && activeMeta ? (
              <div className="opacity-40 pointer-events-none mb-2.5">
                <OrderCard
                  meta={activeMeta}
                  isScheduled
                  scheduledDay={day}
                  referenceDate={date}
                />
              </div>
            ) : (
              <div
                className={cn(
                  "h-[120px] border-2 border-dashed rounded-lg m-1 transition-colors",
                  isTargetingThisColumn
                    ? "border-primary/60 bg-primary/5"
                    : "border-gray-200 dark:border-gray-800"
                )}
              />
            )
          ) : (
            <div className="space-y-2">
              {pinned.length > 0 && (
                <div className="pb-3 mb-1 border-b border-dashed border-amber-300/60 dark:border-amber-700/40">
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
              {unpinned.map((order, idx) => {
                const meta = ordersById.get(order.itemId);
                if (!meta) return null;
                return (
                  <Fragment key={order.itemId}>
                    {showGhost && idx === ghostIdx && activeMeta && (
                      <div className="opacity-40 pointer-events-none">
                        <OrderCard
                          meta={activeMeta}
                          isScheduled
                          scheduledDay={day}
                          referenceDate={date}
                        />
                      </div>
                    )}
                    <DraggableOrderCard
                      id={order.itemId}
                      meta={meta}
                      isScheduled
                      scheduledDay={day}
                      onUnschedule={() => onUnschedule(order.itemId, order.day)}
                      onTogglePin={() => onTogglePin(order.itemId, order.day)}
                      isPinned={false}
                      referenceDate={date}
                      justPlaced={recentlyPlacedIds?.has(order.itemId) ?? false}
                      placeIndex={idx}
                    />
                  </Fragment>
                );
              })}
              {showGhost && ghostIdx === unpinned.length && activeMeta && (
                <div className="opacity-40 pointer-events-none">
                  <OrderCard
                    meta={activeMeta}
                    isScheduled
                    scheduledDay={day}
                    referenceDate={date}
                  />
                </div>
              )}
            </div>
          )}
        </SortableContext>
      </div>

      {/* Auto-plan opt-in. Faded column body above signals when this day is
          excluded from the next auto-plan run. mt-auto keeps it pinned to the
          column bottom now that the list is content-sized. */}
      <div className="mt-auto flex items-center justify-center px-3 py-2 border-t border-gray-100 dark:border-gray-800 rounded-b-xl">
        <Checkbox
          checked={autoPlanEnabled}
          onCheckedChange={() => onToggleAutoPlan()}
          aria-label={`Include ${day} in auto-plan`}
          className="cursor-pointer border-gray-300 dark:border-gray-700 opacity-60 hover:opacity-100 transition-opacity data-[state=checked]:bg-gray-400 data-[state=checked]:border-gray-400 dark:data-[state=checked]:bg-gray-600 dark:data-[state=checked]:border-gray-600 data-[state=checked]:text-white"
        />
      </div>
    </div>
  );
}
