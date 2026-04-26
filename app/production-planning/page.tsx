"use client";

import { useMemo, useState, useEffect } from "react";
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
  parseISO,
} from "date-fns";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { ProductionPlanningHeader } from "@/components/production-planning/ProductionPlanningHeader";
import { ProductionPlanningSidebar } from "@/components/production-planning/ProductionPlanningSidebar";
import { DroppableDayColumn } from "@/components/production-planning/DroppableDayColumn";
import { OrderCard } from "@/components/production-planning/OrderCard";
import { OrderMeta } from "@/components/production-planning/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { useWeeklyScheduleStore } from "@/stores/useWeeklyScheduleStore";
import { DayName, WeeklyScheduleData, ScheduledOrder } from "@/typings/types";

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

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const DAILY_CAPACITY_BLOCKS = 1000;
const SIDEBAR_MIN_COLUMNS_WIDTH = 1000;

const DAYS: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

// Day-of-week offsets from Sunday (week start). Used to compute a column's date.
const DAY_OFFSET_FROM_WEEK_START: Record<DayName, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

// Sat/Sun work folds into Monday's column for display.
const DAYS_FOLDED_INTO_MONDAY: DayName[] = ["Saturday", "Sunday"];

function classifyDueBucket(
  dueValue: string | null | undefined,
  today: Date,
  thisWeekEnd: Date,
  nextWeekStart: Date,
  nextWeekEnd: Date
): { dueDate: Date | null; bucket: OrderMeta["bucket"] } {
  if (!dueValue) return { dueDate: null, bucket: "noDue" };
  const parsed = new Date(dueValue);
  if (Number.isNaN(parsed.getTime())) return { dueDate: null, bucket: "noDue" };

  const dueDate = startOfDay(parsed);
  if (isBefore(dueDate, today)) return { dueDate, bucket: "overdue" };
  if (isWithinInterval(dueDate, { start: today, end: thisWeekEnd }))
    return { dueDate, bucket: "thisWeek" };
  if (isWithinInterval(dueDate, { start: nextWeekStart, end: nextWeekEnd }))
    return { dueDate, bucket: "nextWeek" };
  return { dueDate, bucket: "future" };
}

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
  const { items, doneItems, scheduledItems, fetchItemsByIds } = useOrderStore();
  const {
    schedules,
    updateSchedule,
    createWeek,
    removeItemFromDay,
    fetchSchedules,
  } = useWeeklyScheduleStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentWeekKey, setCurrentWeekKey] = useState(() =>
    format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd")
  );

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const today = useMemo(() => startOfDay(new Date()), []);

  // Calculate week boundaries
  const todayWeekStart = useMemo(
    () => startOfWeek(today, { weekStartsOn: 0 }),
    [today]
  );
  const todayWeekEnd = useMemo(
    () => endOfWeek(todayWeekStart, { weekStartsOn: 0 }),
    [todayWeekStart]
  );
  const todayNextWeekStart = useMemo(
    () => addWeeks(todayWeekStart, 1),
    [todayWeekStart]
  );
  const todayNextWeekEnd = useMemo(
    () => endOfWeek(todayNextWeekStart, { weekStartsOn: 0 }),
    [todayNextWeekStart]
  );

  const currentWeekStart = useMemo(
    () => startOfWeek(parseISO(currentWeekKey), { weekStartsOn: 0 }),
    [currentWeekKey]
  );
  const currentWeekEnd = useMemo(
    () => endOfWeek(currentWeekStart, { weekStartsOn: 0 }),
    [currentWeekStart]
  );

  // Filter orders
  const availableOrders = useMemo(
    () =>
      items.filter(
        (item) =>
          !item.deleted && (item.status === "New" || item.status === "On Deck")
      ),
    [items]
  );

  // Build metadata
  const baseData = useMemo(() => {
    const metaList: OrderMeta[] = [];
    const metaById = new Map<string, OrderMeta>();

    availableOrders.forEach((item) => {
      const { dueDate, bucket } = classifyDueBucket(
        item.dueDate,
        today,
        todayWeekEnd,
        todayNextWeekStart,
        todayNextWeekEnd
      );

      const meta: OrderMeta = {
        id: item.id,
        item,
        blocks: calculateBlocks(item),
        dueDate,
        bucket,
      };
      metaList.push(meta);
      metaById.set(item.id, meta);
    });

    return { metaList, metaById };
  }, [
    availableOrders,
    today,
    todayWeekEnd,
    todayNextWeekStart,
    todayNextWeekEnd,
  ]);

  // Get current schedule
  const currentSchedule = useMemo(
    () => schedules.find((s) => s.weekKey === currentWeekKey),
    [schedules, currentWeekKey]
  );

  // Fetch done orders from DB if they're not in the store (similar to weekly-planner)
  useEffect(() => {
    if (!currentSchedule) return;
    const allScheduledIds = Object.values(currentSchedule.schedule)
      .flat()
      .map((i) => i.id);

    if (allScheduledIds.length > 0) {
      fetchItemsByIds(allScheduledIds);
    }
  }, [currentSchedule, fetchItemsByIds]);

  // Combine all known items for looking up scheduled items (which might be done)
  const allKnownItems = useMemo(() => {
    const itemMap = new Map<string, (typeof items)[0]>();
    items.forEach((i) => itemMap.set(i.id, i));
    doneItems.forEach((i) => itemMap.set(i.id, i));
    scheduledItems.forEach((i) => itemMap.set(i.id, i));
    return Array.from(itemMap.values());
  }, [items, doneItems, scheduledItems]);

  // Scheduled items for all weeks
  const scheduledItemIds = useMemo(() => {
    const ids = new Set<string>();
    schedules.forEach((schedule) => {
      Object.values(schedule.schedule).forEach((dayItems) => {
        dayItems.forEach((item) => ids.add(item.id));
      });
    });
    return ids;
  }, [schedules]);

  // Unscheduled orders
  const unscheduledOrders = useMemo(
    () => baseData.metaList.filter((meta) => !scheduledItemIds.has(meta.id)),
    [baseData.metaList, scheduledItemIds]
  );

  // Create a combined ordersById map that includes all items (including done ones)
  const allOrdersById = useMemo(() => {
    const combined = new Map<string, OrderMeta>(baseData.metaById);

    allKnownItems.forEach((item) => {
      if (combined.has(item.id)) return;
      const { dueDate, bucket } = classifyDueBucket(
        item.dueDate,
        today,
        todayWeekEnd,
        todayNextWeekStart,
        todayNextWeekEnd
      );
      combined.set(item.id, {
        id: item.id,
        item,
        blocks: calculateBlocks(item),
        dueDate,
        bucket,
      });
    });

    return combined;
  }, [
    baseData.metaById,
    allKnownItems,
    today,
    todayWeekEnd,
    todayNextWeekStart,
    todayNextWeekEnd,
  ]);

  // Group scheduled orders by day
  const dayGroups = useMemo(() => {
    const groups: Record<
      DayName,
      { orders: ScheduledOrder[]; totalBlocks: number }
    > = {
      Sunday: { orders: [], totalBlocks: 0 },
      Monday: { orders: [], totalBlocks: 0 },
      Tuesday: { orders: [], totalBlocks: 0 },
      Wednesday: { orders: [], totalBlocks: 0 },
      Thursday: { orders: [], totalBlocks: 0 },
      Friday: { orders: [], totalBlocks: 0 },
      Saturday: { orders: [], totalBlocks: 0 },
    };

    if (currentSchedule) {
      Object.entries(currentSchedule.schedule).forEach(([day, items]) => {
        const dayName = day as DayName;
        // Sat/Sun work folds into Monday's display column.
        const targetDay: DayName = DAYS_FOLDED_INTO_MONDAY.includes(dayName)
          ? "Monday"
          : dayName;
        if (!groups[targetDay]) return;
        items.forEach((item) => {
          const meta = allOrdersById.get(item.id);
          if (!meta) return;
          groups[targetDay].orders.push({
            itemId: item.id,
            weekKey: currentWeekKey,
            day: dayName,
          });
          groups[targetDay].totalBlocks += meta.blocks;
        });
      });
    }

    return groups;
  }, [currentSchedule, allOrdersById, currentWeekKey]);

  // Stats
  const stats = useMemo(() => {
    let overdueBlocks = 0,
      overdueOrders = 0;
    let thisWeekBlocks = 0,
      thisWeekOrders = 0;
    let nextWeekBlocks = 0,
      nextWeekOrders = 0;
    let totalBlocks = 0;

    unscheduledOrders.forEach((meta) => {
      totalBlocks += meta.blocks;
      if (meta.bucket === "overdue") {
        overdueBlocks += meta.blocks;
        overdueOrders++;
      } else if (meta.bucket === "thisWeek") {
        thisWeekBlocks += meta.blocks;
        thisWeekOrders++;
      } else if (meta.bucket === "nextWeek") {
        nextWeekBlocks += meta.blocks;
        nextWeekOrders++;
      }
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
    if (unscheduledOrders.find((o) => o.id === id)) return "unscheduled";
    if (id === "unscheduled") return "unscheduled";

    // Check scheduled orders
    if (currentSchedule) {
      for (const [day, items] of Object.entries(currentSchedule.schedule)) {
        if (items.find((i) => i.id === id)) return day as DayName;
      }
    }

    // Check if it's a day column ID
    if (DAYS.includes(id as DayName)) return id as DayName;

    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
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
        await removeItemFromDay(
          currentWeekKey,
          activeContainer as DayName,
          activeId
        );
      }
      setActiveId(null);
      return;
    }

    // 2. Drop on a Day Column
    const targetDay = overContainer as DayName;

    // We need to construct the new schedule
    let newScheduleData: WeeklyScheduleData;

    if (!currentSchedule) {
      // Initialize if it doesn't exist
      newScheduleData = {
        weekKey: currentWeekKey,
        schedule: {
          Sunday: [],
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: [],
          Saturday: [],
        },
      };
      try {
        await createWeek(currentWeekKey);
      } catch (e) {
        console.error("Failed to create week", e);
        return;
      }
    } else {
      newScheduleData = structuredClone(currentSchedule);
    }

    // Moving from Unscheduled to Day
    if (activeContainer === "unscheduled") {
      const newItem = { id: activeId, done: false };

      // Calculate index
      let newIndex = newScheduleData.schedule[targetDay].length;
      if (overId !== targetDay) {
        const overIndex = newScheduleData.schedule[targetDay].findIndex(
          (item) => item.id === overId
        );
        if (overIndex !== -1) newIndex = overIndex;
      }

      // Insert
      newScheduleData.schedule[targetDay].splice(newIndex, 0, newItem);
    }
    // Moving between days or reordering within day
    else {
      const activeDay = activeContainer as DayName;
      const activeIndex = newScheduleData.schedule[activeDay].findIndex(
        (item) => item.id === activeId
      );

      if (activeIndex === -1) return; // Should not happen

      // Remove from old
      const deletedItems = newScheduleData.schedule[activeDay].splice(
        activeIndex,
        1
      );
      const movedItem = deletedItems[0];

      if (!movedItem) return;

      let overIndex;
      if (overId === targetDay) {
        overIndex = newScheduleData.schedule[targetDay].length;
      } else {
        overIndex = newScheduleData.schedule[targetDay].findIndex(
          (item) => item.id === overId
        );
      }

      if (overIndex === -1)
        overIndex = newScheduleData.schedule[targetDay].length;

      // Insert into new
      newScheduleData.schedule[targetDay].splice(overIndex, 0, movedItem);
    }

    await updateSchedule(currentWeekKey, newScheduleData);

    setActiveId(null);
  };

  const activeMeta = useMemo(() => {
    if (!activeId) return undefined;
    return allOrdersById.get(activeId);
  }, [activeId, allOrdersById]);

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
            isCurrentWeek={
              currentWeekKey ===
              format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd")
            }
            hasScheduledOrders={!!currentSchedule}
            stats={stats}
            onPreviousWeek={() => {
              const prev = subWeeks(parseISO(currentWeekKey), 1);
              setCurrentWeekKey(
                format(startOfWeek(prev, { weekStartsOn: 0 }), "yyyy-MM-dd")
              );
            }}
            onNextWeek={() => {
              const next = addWeeks(parseISO(currentWeekKey), 1);
              setCurrentWeekKey(
                format(startOfWeek(next, { weekStartsOn: 0 }), "yyyy-MM-dd")
              );
            }}
            onToday={() => {
              setCurrentWeekKey(
                format(
                  startOfWeek(new Date(), { weekStartsOn: 0 }),
                  "yyyy-MM-dd"
                )
              );
            }}
            onClearWeek={() => {
              if (currentSchedule) {
                const clearedSchedule = {
                  ...currentSchedule,
                  schedule: {
                    Sunday: [],
                    Monday: [],
                    Tuesday: [],
                    Wednesday: [],
                    Thursday: [],
                    Friday: [],
                    Saturday: [],
                  },
                };
                updateSchedule(currentWeekKey, clearedSchedule);
                toast.success("Week cleared");
              }
            }}
          />

          <div className="flex-1 p-6 overflow-x-auto overflow-y-hidden">
            <div
              className="flex gap-4 h-full"
              style={{ minWidth: SIDEBAR_MIN_COLUMNS_WIDTH }}
            >
              {DAYS.map((day) => {
                const date = addDays(
                  currentWeekStart,
                  DAY_OFFSET_FROM_WEEK_START[day]
                );

                return (
                  <div key={day} className="flex-1 min-w-[200px] h-full">
                    <DroppableDayColumn
                      day={day}
                      dateLabel={format(date, "MMM d")}
                      orders={dayGroups[day].orders}
                      ordersById={allOrdersById}
                      totalBlocks={dayGroups[day].totalBlocks}
                      capacity={DAILY_CAPACITY_BLOCKS}
                      onUnschedule={(id, actualDay) =>
                        removeItemFromDay(currentWeekKey, actualDay, id)
                      }
                      date={date}
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
            <OrderCard meta={activeMeta} isScheduled={true} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
