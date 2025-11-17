import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { format, startOfWeek } from "date-fns";
import { DayName } from "@/typings/types";

export interface ScheduledOrder {
  itemId: string;
  weekKey: string; // Format: "yyyy-MM-dd"
  day: DayName;
}

interface ProductionPlanningState {
  // Scheduled orders for all weeks
  scheduledOrders: ScheduledOrder[];
  
  // Current active week being planned
  currentWeekKey: string;
  
  // Actions
  scheduleOrder: (itemId: string, weekKey: string, day: DayName) => void;
  unscheduleOrder: (itemId: string) => void;
  setCurrentWeek: (weekKey: string) => void;
  getOrdersForDay: (weekKey: string, day: DayName) => ScheduledOrder[];
  clearWeek: () => void;
  init: () => void;
}

const getWeekKey = (date: Date): string => {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  return format(weekStart, "yyyy-MM-dd");
};

export const useProductionPlanningStore = create<ProductionPlanningState>()(
  devtools(
    (set, get) => ({
      scheduledOrders: [],
      currentWeekKey: getWeekKey(new Date()),

      scheduleOrder: (itemId: string, weekKey: string, day: DayName) => {
        const state = get();
        
        // Remove existing schedule for this item if any
        const filtered = state.scheduledOrders.filter(
          (o) => o.itemId !== itemId
        );
        
        // Add new schedule
        const newSchedule: ScheduledOrder = {
          itemId,
          weekKey,
          day,
        };
        
        set({
          scheduledOrders: [...filtered, newSchedule],
        });
      },

      unscheduleOrder: (itemId: string) => {
        set((state) => ({
          scheduledOrders: state.scheduledOrders.filter(
            (o) => o.itemId !== itemId
          ),
        }));
      },

      setCurrentWeek: (weekKey: string) => {
        set({ currentWeekKey: weekKey });
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
      },

      init: () => {
        // Load from localStorage if needed (only on client)
        if (typeof window === "undefined") return;
        
        const stored = localStorage.getItem("production-planning-store");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            set({
              scheduledOrders: parsed.scheduledOrders || [],
              currentWeekKey: parsed.currentWeekKey || getWeekKey(new Date()),
            });
          } catch (e) {
            console.error("Failed to restore production planning store:", e);
          }
        }
      },
    }),
    { name: "production-planning-store" }
  )
);

// Persist to localStorage (only on client)
if (typeof window !== "undefined") {
  useProductionPlanningStore.subscribe(
    (state) => {
      try {
        localStorage.setItem(
          "production-planning-store",
          JSON.stringify({
            scheduledOrders: state.scheduledOrders,
            currentWeekKey: state.currentWeekKey,
          })
        );
      } catch (e) {
        console.error("Failed to persist production planning store:", e);
      }
    }
  );

  // Initialize on load
  useProductionPlanningStore.getState().init();
}

