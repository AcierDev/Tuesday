import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { DayName, Item, WeeklyScheduleData } from "@/typings/types";
import { toast } from "sonner";
import { useOrderStore } from "./useOrderStore";

interface WeeklyScheduleState {
  schedules: WeeklyScheduleData[];
  isLoading: boolean;
  error: string | null;
  eventSource: EventSource | null;
  currentWeek: string | null;

  // Actions
  fetchSchedules: () => Promise<void>;
  updateSchedule: (
    weekKey: string,
    schedule: WeeklyScheduleData
  ) => Promise<void>;
  addItemToDay: (
    weekKey: string,
    day: DayName,
    itemId: string
  ) => Promise<void>;
  removeItemFromDay: (
    weekKey: string,
    day: DayName,
    itemId: string
  ) => Promise<void>;
  toggleItemDone: (
    weekKey: string,
    day: DayName,
    itemId: string
  ) => Promise<void>;
  startWatchingChanges: () => void;
  stopWatchingChanges: () => void;
  setCurrentWeek: (weekKey: string) => void;
  createWeek: (weekKey: string) => Promise<void>;
  init: () => Promise<void>;
  markDone: (item: Item, weekKey: string) => Promise<void>;
}

export const useWeeklyScheduleStore = create<WeeklyScheduleState>()(
  devtools(
    (set, get) => ({
      schedules: [],
      isLoading: false,
      error: null,
      eventSource: null,
      currentWeek: null,

      setCurrentWeek: (weekKey: string) => {
        set({ currentWeek: weekKey });
      },

      createWeek: async (weekKey: string) => {
        try {
          const emptySchedule: WeeklyScheduleData = {
            weekKey,
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

          const response = await fetch("/api/weekly-schedules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(emptySchedule),
          });

          if (!response.ok) throw new Error("Failed to create week schedule");

          set((state) => ({
            schedules: [...state.schedules, emptySchedule],
            currentWeek: weekKey,
          }));

          toast.success("Created new week schedule");
        } catch (error) {
          toast.error("Failed to create week schedule");
          throw error;
        }
      },

      fetchSchedules: async () => {
        try {
          set({ isLoading: true });
          const response = await fetch("/api/weekly-schedules");
          if (!response.ok) throw new Error("Failed to fetch schedules");

          const schedules = await response.json();
          set({ schedules, isLoading: false });

          // Notify OrderStore to update `isScheduled`
          const orderStore = useOrderStore.getState();
          orderStore.updateIsScheduled();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "An error occurred";
          set({ error: errorMessage, isLoading: false });
          toast.error("Failed to fetch schedules");
        }
      },

      updateSchedule: async (weekKey: string, schedule: WeeklyScheduleData) => {
        try {
          const response = await fetch("/api/weekly-schedules", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(schedule),
          });

          if (!response.ok) throw new Error("Failed to update schedule");

          set((state) => ({
            schedules: state.schedules.map((s) =>
              s.weekKey === weekKey ? schedule : s
            ),
          }));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "An error occurred";
          set({ error: errorMessage });
          toast.error("Failed to update schedule");
          throw error;
        }
      },

      addItemToDay: async (weekKey: string, day: DayName, itemId: string) => {
        try {
          const schedule = get().schedules.find((s) => s.weekKey === weekKey);
          if (!schedule) throw new Error("Schedule not found");

          const updatedSchedule = {
            ...schedule,
            schedule: {
              ...schedule.schedule,
              [day]: [...schedule.schedule[day], { id: itemId, done: false }],
            },
          };

          await get().updateSchedule(weekKey, updatedSchedule);
          toast.success("Item added to schedule");
        } catch (error) {
          toast.error("Failed to add item to schedule");
          throw error;
        }
      },

      removeItemFromDay: async (
        weekKey: string,
        day: DayName,
        itemId: string
      ) => {
        try {
          const schedule = get().schedules.find((s) => s.weekKey === weekKey);
          if (!schedule) throw new Error("Schedule not found");

          const updatedSchedule = {
            ...schedule,
            schedule: {
              ...schedule.schedule,
              [day]: schedule.schedule[day].filter(
                (item) => item.id !== itemId
              ),
            },
          };

          await get().updateSchedule(weekKey, updatedSchedule);
          toast.success("Item removed from schedule");
        } catch (error) {
          toast.error("Failed to remove item from schedule");
          throw error;
        }
      },

      toggleItemDone: async (weekKey: string, day: DayName, itemId: string) => {
        try {
          const schedule = get().schedules.find((s) => s.weekKey === weekKey);
          if (!schedule) throw new Error("Schedule not found");

          const updatedSchedule = {
            ...schedule,
            schedule: {
              ...schedule.schedule,
              [day]: schedule.schedule[day].map((item) =>
                item.id === itemId ? { ...item, done: !item.done } : item
              ),
            },
          };

          await get().updateSchedule(weekKey, updatedSchedule);
        } catch (error) {
          toast.error("Failed to update item status");
          throw error;
        }
      },

      startWatchingChanges: () => {
        // // Clean up existing connection if any
        // get().stopWatchingChanges();
        // const eventSource = new EventSource("/api/weekly-schedules/changes");
        // eventSource.onmessage = (event) => {
        //   try {
        //     const change = JSON.parse(event.data);
        //     if (change.type === "update") {
        //       get().fetchSchedules();
        //     }
        //   } catch (error) {
        //     console.error("Failed to process change:", error);
        //   }
        // };
        // eventSource.onerror = (error) => {
        //   console.error("EventSource failed:", error);
        //   get().stopWatchingChanges();
        //   // Try to reconnect after a delay
        //   setTimeout(() => {
        //     get().startWatchingChanges();
        //   }, 5000);
        // };
        // set({ eventSource });
      },

      stopWatchingChanges: () => {
        const { eventSource } = get();
        if (eventSource) {
          eventSource.close();
          set({ eventSource: null });
        }
      },

      init: async () => {
        const store = get();
        await store.fetchSchedules();
        store.startWatchingChanges();

        // Set current week to the most recent week
        const schedules = get().schedules;
        if (schedules.length > 0) {
          const sortedWeeks = schedules
            .map((s) => s.weekKey)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
          store.setCurrentWeek(sortedWeeks[0]!);
        }
      },

      markDone: async (item: Item, weekKey: string) => {
        const week = get().schedules.find((s) => s.weekKey === weekKey);
        if (!week) throw new Error("Schedule not found");

        // Find the day containing the item
        const day: DayName = Object.entries(week.schedule).find((pair) =>
          // Fix: Compare using the passed item's id
          pair[1].some((scheduleItem) => scheduleItem.id === item.id)
        )?.[0] as DayName;

        if (!day) throw new Error("Day not found");

        const updatedSchedule = {
          ...week,
          schedule: {
            ...week.schedule,
            [day]: week.schedule[day].map((scheduleItem) =>
              // Fix: Compare using the passed item's id
              scheduleItem.id === item.id
                ? { ...scheduleItem, done: true }
                : scheduleItem
            ),
          },
        };

        await get().updateSchedule(weekKey, updatedSchedule);
      },
    }),
    { name: "weekly-schedule-store" }
  )
);

// Initialize the store after creation
useWeeklyScheduleStore.getState().init().catch(console.error);
