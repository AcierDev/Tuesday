import { create } from "zustand";
import { DayName, Item } from "@/typings/types";

interface ScheduleItem {
  day: DayName;
  item: Item;
}

interface ExcludedDays {
  [weekKey: string]: Set<DayName>;
}

interface AutoScheduleStore {
  proposedSchedule: Record<string, ScheduleItem[]>;
  excludedDays: ExcludedDays;
  setProposedSchedule: (weekKey: string, schedule: ScheduleItem[]) => void;
  clearProposedSchedule: () => void;
  excludeDay: (weekKey: string, day: DayName) => void;
  clearExcludedDays: () => void;
  isExcluded: (weekKey: string, day: DayName) => boolean;
  removeExcludedDay: (weekKey: string, day: DayName) => void;
}

export const useAutoScheduleStore = create<AutoScheduleStore>((set, get) => ({
  proposedSchedule: {},
  excludedDays: {},
  setProposedSchedule: (weekKey, schedule) =>
    set((state) => ({
      proposedSchedule: {
        ...state.proposedSchedule,
        [weekKey]: schedule,
      },
    })),
  clearProposedSchedule: () => set({ proposedSchedule: {} }),
  excludeDay: (weekKey, day) =>
    set((state) => {
      const weekExclusions = new Set(state.excludedDays[weekKey] || []);
      weekExclusions.add(day);
      return {
        excludedDays: {
          ...state.excludedDays,
          [weekKey]: weekExclusions,
        },
      };
    }),
  clearExcludedDays: () =>
    set((state) => ({
      ...state,
      excludedDays: {},
    })),
  isExcluded: (weekKey, day) => {
    const state = get();
    return state.excludedDays[weekKey]?.has(day) || false;
  },
  removeExcludedDay: (weekKey, day) =>
    set((state) => {
      const weekExclusions = new Set(state.excludedDays[weekKey] || []);
      weekExclusions.delete(day);
      return {
        excludedDays: {
          ...state.excludedDays,
          [weekKey]: weekExclusions,
        },
      };
    }),
}));
