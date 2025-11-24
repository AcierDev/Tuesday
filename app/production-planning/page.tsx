"use client";

import { useMemo, useCallback, useState } from "react";
import {
  addWeeks,
  subWeeks,
  endOfWeek,
  format,
  isBefore,
  isWithinInterval,
  startOfDay,
  startOfWeek,
  addDays,
} from "date-fns";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { ProductionPlanningHeader } from "@/components/production-planning/ProductionPlanningHeader";
import { ProductionPlanningSidebar } from "@/components/production-planning/ProductionPlanningSidebar";
import { DroppableDayColumn } from "@/components/production-planning/DroppableDayColumn";
import { DraggableOrderCard } from "@/components/production-planning/DraggableOrderCard";
import { OrderCard } from "@/components/production-planning/OrderCard";
import { OrderMeta } from "@/components/production-planning/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { useProductionPlanningStore } from "@/stores/useProductionPlanningStore";
import { DayName } from "@/typings/types";

function calculateBlocks(item: { size?: string }): number {
  const sizeStr = item.size || "";
  const parts = sizeStr.split("x").slice(0, 2);
  const [width, height] = parts.map((part) => {
    const value = parseFloat(part.trim());
    return Number.isFinite(value) ? value : null;
  });

  if (width && height) {
    return width * height;
  }

  if (width || height) {
    return (width || height) ?? 0;
  }

  return 0;
}

const DAYS: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5",
      },
    },
  }),
};

export default function ProductionPlanningPage() {
  const { items } = useOrderStore();
  const {
    scheduledOrders,
    currentWeekKey,
    scheduleOrder,
    unscheduleOrder,
    setCurrentWeek,
    clearWeek,
    moveOrder,
    reorderDay,
  } = useProductionPlanningStore();

  const [activeId, setActiveId] = useState<string | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);
  
  // Calculate week boundaries
  const todayWeekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 0 }), [today]);
  const todayWeekEnd = useMemo(() => endOfWeek(todayWeekStart, { weekStartsOn: 0 }), [todayWeekStart]);
  const todayNextWeekStart = useMemo(() => addWeeks(todayWeekStart, 1), [todayWeekStart]);
  const todayNextWeekEnd = useMemo(() => endOfWeek(todayNextWeekStart, { weekStartsOn: 0 }), [todayNextWeekStart]);

  const currentWeekStart = useMemo(() => startOfWeek(new Date(currentWeekKey), { weekStartsOn: 0 }), [currentWeekKey]);
  const currentWeekEnd = useMemo(() => endOfWeek(currentWeekStart, { weekStartsOn: 0 }), [currentWeekStart]);

  // Filter orders
  const availableOrders = useMemo(
    () => items.filter(item => !item.deleted), // Show all non-deleted items for now, or filter by status if needed
    [items]
  );

  // Build metadata
  const baseData = useMemo(() => {
    const metaList: OrderMeta[] = [];
    const metaById = new Map<string, OrderMeta>();

    availableOrders.forEach((item) => {
      const blocks = calculateBlocks(item);
      const dueValue = item.dueDate;
      let dueDate: Date | null = null;
      let bucket: "overdue" | "thisWeek" | "nextWeek" | "future" | "noDue" = "noDue";

      if (dueValue) {
        const parsed = new Date(dueValue);
        if (!Number.isNaN(parsed.getTime())) {
          dueDate = startOfDay(parsed);
          if (isBefore(dueDate, today)) bucket = "overdue";
          else if (isWithinInterval(dueDate, { start: today, end: todayWeekEnd })) bucket = "thisWeek";
          else if (isWithinInterval(dueDate, { start: todayNextWeekStart, end: todayNextWeekEnd })) bucket = "nextWeek";
          else bucket = "future";
        }
      }

      const meta: OrderMeta = { id: item.id, item, blocks, dueDate, bucket };
      metaList.push(meta);
      metaById.set(item.id, meta);
    });

    return { metaList, metaById };
  }, [availableOrders, today, todayWeekEnd, todayNextWeekStart, todayNextWeekEnd]);

  // Scheduled items for current week
  const scheduledItemIds = useMemo(() => {
    const ids = new Set<string>();
    scheduledOrders.forEach((order) => {
      if (order.weekKey === currentWeekKey) ids.add(order.itemId);
    });
    return ids;
  }, [scheduledOrders, currentWeekKey]);

  // Unscheduled orders
  const unscheduledOrders = useMemo(
    () => baseData.metaList.filter((meta) => !scheduledItemIds.has(meta.id)),
    [baseData.metaList, scheduledItemIds]
  );

  // Group scheduled orders by day
  const dayGroups = useMemo(() => {
    const groups: Record<DayName, { orders: any[]; totalBlocks: number }> = {
      Sunday: { orders: [], totalBlocks: 0 },
      Monday: { orders: [], totalBlocks: 0 },
      Tuesday: { orders: [], totalBlocks: 0 },
      Wednesday: { orders: [], totalBlocks: 0 },
      Thursday: { orders: [], totalBlocks: 0 },
      Friday: { orders: [], totalBlocks: 0 },
      Saturday: { orders: [], totalBlocks: 0 },
    };

    scheduledOrders.forEach((scheduled) => {
      if (scheduled.weekKey === currentWeekKey && groups[scheduled.day]) {
        const meta = baseData.metaById.get(scheduled.itemId);
        if (meta) {
          groups[scheduled.day].orders.push(scheduled);
          groups[scheduled.day].totalBlocks += meta.blocks;
        }
      }
    });

    return groups;
  }, [scheduledOrders, currentWeekKey, baseData.metaById]);

  // Stats
  const stats = useMemo(() => {
    let overdueBlocks = 0, overdueOrders = 0;
    let thisWeekBlocks = 0, thisWeekOrders = 0;
    let nextWeekBlocks = 0, nextWeekOrders = 0;
    let totalBlocks = 0;

    unscheduledOrders.forEach((meta) => {
      totalBlocks += meta.blocks;
      if (meta.bucket === "overdue") { overdueBlocks += meta.blocks; overdueOrders++; }
      else if (meta.bucket === "thisWeek") { thisWeekBlocks += meta.blocks; thisWeekOrders++; }
      else if (meta.bucket === "nextWeek") { nextWeekBlocks += meta.blocks; nextWeekOrders++; }
    });

    return {
      overdue: { blocks: overdueBlocks, orders: overdueOrders },
      thisWeek: { blocks: thisWeekBlocks, orders: thisWeekOrders },
      nextWeek: { blocks: nextWeekBlocks, orders: nextWeekOrders },
      total: { blocks: totalBlocks, orders: unscheduledOrders.length },
    };
  }, [unscheduledOrders]);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findContainer = (id: string) => {
    if (unscheduledOrders.find(o => o.id === id)) return "unscheduled";
    if (id === "unscheduled") return "unscheduled";

    // Check scheduled orders
    const scheduled = scheduledOrders.find(o => o.itemId === id && o.weekKey === currentWeekKey);
    if (scheduled) return scheduled.day;

    // Check if it's a day column ID
    if (DAYS.includes(id as DayName)) return id as DayName;

    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id as string;
    const overId = over?.id as string;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) {
      setActiveId(null);
      return;
    }

    // 1. Drop on Unscheduled (Sidebar)
    if (overContainer === "unscheduled") {
      if (activeContainer !== "unscheduled") {
        unscheduleOrder(activeId);
      }
      setActiveId(null);
      return;
    }

    // 2. Drop on a Day Column
    const targetDay = overContainer as DayName;
    
    // Moving from Unscheduled to Day
    if (activeContainer === "unscheduled") {
      // Calculate index if dropped over a specific item
      let newIndex = dayGroups[targetDay].orders.length;
      if (overId !== targetDay) {
         const overIndex = dayGroups[targetDay].orders.findIndex(o => o.itemId === overId);
         if (overIndex !== -1) newIndex = overIndex;
      }
      
      moveOrder(activeId, currentWeekKey, targetDay, newIndex);
    } 
    // Moving between days or reordering within day
    else {
      const activeDay = activeContainer as DayName;
      const activeIndex = dayGroups[activeDay].orders.findIndex(o => o.itemId === activeId);
      
      let overIndex;
      if (overId === targetDay) {
        overIndex = dayGroups[targetDay].orders.length;
      } else {
        overIndex = dayGroups[targetDay].orders.findIndex(o => o.itemId === overId);
      }

      if (activeDay !== targetDay) {
        // Move to different day
        moveOrder(activeId, currentWeekKey, targetDay, overIndex >= 0 ? overIndex : undefined);
      } else if (activeIndex !== overIndex) {
        // Reorder within same day
        const oldOrders = dayGroups[activeDay].orders.map(o => o.itemId);
        const newOrders = arrayMove(oldOrders, activeIndex, overIndex);
        reorderDay(currentWeekKey, activeDay, newOrders);
      }
    }

    setActiveId(null);
  };

  const activeMeta = useMemo(() => baseData.metaById.get(activeId || ""), [activeId, baseData.metaById]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
        {/* Sidebar */}
        <ProductionPlanningSidebar orders={unscheduledOrders} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <ProductionPlanningHeader
            currentWeekStart={currentWeekStart}
            currentWeekEnd={currentWeekEnd}
            isCurrentWeek={currentWeekKey === format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd")}
            hasScheduledOrders={scheduledOrders.some(o => o.weekKey === currentWeekKey)}
            stats={stats}
            onPreviousWeek={() => {
                const prev = subWeeks(new Date(currentWeekKey), 1);
                setCurrentWeek(format(startOfWeek(prev, { weekStartsOn: 0 }), "yyyy-MM-dd"));
            }}
            onNextWeek={() => {
                const next = addWeeks(new Date(currentWeekKey), 1);
                setCurrentWeek(format(startOfWeek(next, { weekStartsOn: 0 }), "yyyy-MM-dd"));
            }}
            onToday={() => {
                setCurrentWeek(format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd"));
            }}
            onClearWeek={() => {
                clearWeek();
                toast.success("Week cleared");
            }}
          />

          <div className="flex-1 p-6 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 h-full min-w-[1000px]">
              {DAYS.map((day) => {
                // Calculate date for this day
                // Week starts on Sunday (0). Monday is 1.
                // DAYS array is [Monday, Tuesday...]
                // So index 0 -> Monday -> +1 day from startOfWeek
                const dayIndex = DAYS.indexOf(day) + 1;
                const date = addDays(currentWeekStart, dayIndex);

                return (
                  <div key={day} className="flex-1 min-w-[200px] h-full">
                    <DroppableDayColumn
                      day={day}
                      dateLabel={format(date, "MMM d")}
                      orders={dayGroups[day].orders}
                      ordersById={baseData.metaById}
                      totalBlocks={dayGroups[day].totalBlocks}
                      capacity={1000}
                      onUnschedule={unscheduleOrder}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeId && activeMeta ? (
          <div className="opacity-80 rotate-2 cursor-grabbing">
            <OrderCard
              meta={activeMeta}
              isScheduled={true} // Or derive from activeContainer
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
