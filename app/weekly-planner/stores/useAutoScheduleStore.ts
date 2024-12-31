import { create } from "zustand";
import { Item, DayName } from "@/typings/types";

interface ScheduleItem {
  day: DayName;
  item: Item;
}

interface AutoScheduleState {
  proposedSchedule: { [weekKey: string]: ScheduleItem[] };
  setProposedSchedule: (weekKey: string, schedule: ScheduleItem[]) => void;
  clearProposedSchedule: () => void;
}

export const useAutoScheduleStore = create<AutoScheduleState>((set) => ({
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
