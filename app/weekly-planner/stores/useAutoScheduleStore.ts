import { create } from "zustand";
import { DayName, Item } from "@/typings/types";

interface ScheduleItem {
  day: DayName;
  item: Item;
}

interface AutoScheduleStore {
  proposedSchedule: Record<string, ScheduleItem[]>;
  setProposedSchedule: (weekKey: string, schedule: ScheduleItem[]) => void;
  clearProposedSchedule: () => void;
}

export const useAutoScheduleStore = create<AutoScheduleStore>((set) => ({
  proposedSchedule: {},
  setProposedSchedule: (weekKey, schedule) =>
    set((state) => ({
      proposedSchedule: {
        ...state.proposedSchedule,
        [weekKey]: schedule,
      },
    })),
  clearProposedSchedule: () => set({ proposedSchedule: {} }),
}));
