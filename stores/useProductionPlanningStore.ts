import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { format, startOfWeek } from "date-fns";
import { DayName, WeeklyScheduleData } from "@/typings/types";

export interface ScheduledOrder {
  itemId: string;
  weekKey: string; // Format: "yyyy-MM-dd"
  day: DayName;
}

interface ProductionPlanningState {
  // Scheduled orders for all loaded weeks
  scheduledOrders: ScheduledOrder[];
  
  // Current active week being planned
  currentWeekKey: string;
  
  // Loading state
  isLoading: boolean;
  
  // Actions
  scheduleOrder: (itemId: string, weekKey: string, day: DayName) => void;
  unscheduleOrder: (itemId: string) => void;
  setCurrentWeek: (weekKey: string) => void;
  getOrdersForDay: (weekKey: string, day: DayName) => ScheduledOrder[];
  clearWeek: () => void;
  init: () => void;
  reorderDay: (weekKey: string, day: DayName, newOrderIds: string[]) => void;
  moveOrder: (itemId: string, weekKey: string, day: DayName, newIndex?: number) => void;
}

const getWeekKey = (date: Date): string => {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  return format(weekStart, "yyyy-MM-dd");
};

export const useProductionPlanningStore = create<ProductionPlanningState>()(
    (set, get) => ({
      scheduledOrders: [],
      currentWeekKey: getWeekKey(new Date()),
      isLoading: false,

      scheduleOrder: (itemId: string, weekKey: string, day: DayName) => {
        (get() as unknown as ProductionPlanningState).moveOrder(itemId, weekKey, day);
      },

      moveOrder: (itemId: string, weekKey: string, day: DayName, newIndex?: number) => {
        const state = get();
        
        // 1. Remove the order from its current position (if it exists in the schedule)
        const otherOrders = state.scheduledOrders.filter(
          (o) => o.itemId !== itemId
        );

        // 2. Get the orders for the target day (excluding the item we just removed)
        const targetDayOrders = otherOrders.filter(
          (o) => o.weekKey === weekKey && o.day === day
        );

        // 3. Create the new order object
        const newOrder: ScheduledOrder = {
          itemId,
          weekKey,
          day,
        };

        // 4. Insert at the correct position
        let newTargetDayOrders = [...targetDayOrders];
        if (typeof newIndex === 'number' && newIndex >= 0 && newIndex <= targetDayOrders.length) {
          newTargetDayOrders.splice(newIndex, 0, newOrder);
        } else {
          newTargetDayOrders.push(newOrder);
        }

        // 5. Reconstruct the full list
        // We keep "other orders" (not in target day) + "new target day orders"
        const finalOrders = [
          ...otherOrders.filter((o) => !(o.weekKey === weekKey && o.day === day)),
          ...newTargetDayOrders
        ];

        set({
          scheduledOrders: finalOrders,
        });

        // Trigger save
        (get() as unknown as ProductionPlanningState).saveWeek(weekKey);
      },

      reorderDay: (weekKey: string, day: DayName, newOrderIds: string[]) => {
        const state = get();
        
        // Keep orders not in this day
        const otherOrders = state.scheduledOrders.filter(
            (o) => !(o.weekKey === weekKey && o.day === day)
        );

        // Create new orders in order
        const newDayOrders = newOrderIds.map(id => ({
            itemId: id,
            weekKey,
            day
        }));

        set({
            scheduledOrders: [...otherOrders, ...newDayOrders]
        });
        
        (get() as unknown as ProductionPlanningState).saveWeek(weekKey);
      },

      unscheduleOrder: (itemId: string) => {
        const state = get();
        const order = state.scheduledOrders.find((o) => o.itemId === itemId);
        
        if (order) {
          set((state) => ({
            scheduledOrders: state.scheduledOrders.filter(
              (o) => o.itemId !== itemId
            ),
          }));
          
          // Trigger save for the week it was removed from
          (get() as unknown as ProductionPlanningState).saveWeek(order.weekKey);
        }
      },

      setCurrentWeek: (weekKey: string) => {
        set({ currentWeekKey: weekKey });
        (get() as unknown as ProductionPlanningState).fetchWeek(weekKey);
      },

      getOrdersForDay: (weekKey: string, day: DayName) => {
        return get().scheduledOrders.filter(
          (o) => o.weekKey === weekKey && o.day === day
        );
      },

      clearWeek: () => {
        const state = get();
        const currentWeekKey = state.currentWeekKey;
        
        set({
          scheduledOrders: state.scheduledOrders.filter(
            (o) => o.weekKey !== currentWeekKey
          ),
        });

        (get() as unknown as ProductionPlanningState).saveWeek(currentWeekKey);
      },

      init: () => {
        const { currentWeekKey } = get();
        (get() as unknown as ProductionPlanningState).fetchWeek(currentWeekKey);
      },

      fetchWeek: async (weekKey: string) => {
        set({ isLoading: true });
        try {
          const res = await fetch(`/api/weekly-schedules?weekKey=${weekKey}`);
          if (!res.ok) throw new Error("Failed to fetch schedule");
          
          const data: WeeklyScheduleData[] = await res.json();
          
          // Transform API data to ScheduledOrder[]
          const newOrders: ScheduledOrder[] = [];
          if (data.length > 0 && data[0].schedule) {
             const schedule = data[0].schedule;
             Object.entries(schedule).forEach(([day, items]) => {
                 if (Array.isArray(items)) {
                    items.forEach((item) => {
                        newOrders.push({
                            itemId: item.id,
                            weekKey: weekKey,
                            day: day as DayName
                        });
                    });
                 }
             });
          }

          set((state) => ({
            scheduledOrders: [
              ...state.scheduledOrders.filter((o) => o.weekKey !== weekKey),
              ...newOrders,
            ],
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error fetching week:", error);
          set({ isLoading: false });
        }
      },

      saveWeek: async (weekKey: string) => {
        const { scheduledOrders } = get();
        
        // We need to preserve the order from scheduledOrders
        const weekOrders = scheduledOrders.filter((o) => o.weekKey === weekKey);

        const schedule: WeeklyScheduleData["schedule"] = {
            Sunday: [],
            Monday: [],
            Tuesday: [],
            Wednesday: [],
            Thursday: [],
            Friday: [],
            Saturday: []
        };

        // Since weekOrders is filtered from scheduledOrders, it preserves the relative order
        weekOrders.forEach((o) => {
            const daySchedule = schedule[o.day];
            if (daySchedule) {
                daySchedule.push({ id: o.itemId, done: false });
            }
        });

        try {
            await fetch("/api/weekly-schedules", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    weekKey,
                    schedule
                })
            });
        } catch (error) {
            console.error("Error saving week:", error);
        }
      },
    })
);
