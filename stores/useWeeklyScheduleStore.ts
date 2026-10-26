import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { DayName, Item, WeeklyScheduleData } from "@/typings/types";
import { invalidateGluedStats } from "@/lib/stats-shared";
import {
  HTTP_CONFLICT,
  scheduleVersion,
  type VersionedWeeklySchedule,
} from "@/app/api/weekly-schedules/version";
import { useOrderStore } from "./useOrderStore";
import { shouldBootAppData } from "@/lib/app-boot";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🔢 PER-WEEK WRITE QUEUE (optimistic concurrency)                     ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// PATCHes for one week are sent one at a time, each naming the version its
// edit was derived from. Rapid drags therefore chain v → v+1 → v+2 instead of
// racing each other into a self-inflicted 409.
const weekWriteQueue = new Map<string, Promise<void>>();
// Bumped when a week's local state is replaced from the server after a
// failed/conflicting write; queued edits derived from the old state are
// dropped instead of being sent on top of the refreshed doc.
const weekWriteEpoch = new Map<string, number>();

export class ScheduleConflictError extends Error {
  constructor(weekKey: string) {
    super(`Week ${weekKey} changed elsewhere; reloaded the latest schedule`);
    this.name = "ScheduleConflictError";
  }
}

function enqueueWeekWrite(weekKey: string, write: () => Promise<void>) {
  const previous = weekWriteQueue.get(weekKey) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(write);
  const settled = next.catch(() => undefined);
  weekWriteQueue.set(weekKey, settled);
  void settled.then(() => {
    if (weekWriteQueue.get(weekKey) === settled) weekWriteQueue.delete(weekKey);
  });
  return next;
}

interface WeeklyScheduleState {
  schedules: WeeklyScheduleData[];
  isLoading: boolean;
  error: string | null;
  eventSource: EventSource | null;
  currentWeek: string | null;

  // Actions
  fetchSchedules: () => Promise<void>;
  refreshSchedules: () => Promise<void>;
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
  toggleItemPinned: (
    weekKey: string,
    day: DayName,
    itemId: string
  ) => Promise<void>;
  pinItemToDay: (
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
        const emptySchedule: VersionedWeeklySchedule = {
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

        // Idempotent server-side: returns the stored week (possibly created
        // a moment ago by another tab) instead of failing.
        const response = await fetch("/api/weekly-schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emptySchedule),
        });

        if (!response.ok) throw new Error("Failed to create week schedule");
        const stored = (await response
          .json()
          .catch(() => null)) as VersionedWeeklySchedule | null;
        const week = stored?.weekKey === weekKey ? stored : emptySchedule;

        set((state) => ({
          schedules: state.schedules.some((s) => s.weekKey === weekKey)
            ? state.schedules
            : [...state.schedules, week],
          currentWeek: weekKey,
        }));
      },

      // Plain reload from the server (no reconcile pass).
      refreshSchedules: async () => {
        const response = await fetch("/api/weekly-schedules");
        if (!response.ok) throw new Error("Failed to fetch schedules");
        const schedules: VersionedWeeklySchedule[] = await response.json();
        set({ schedules, isLoading: false });
        useOrderStore.getState().updateIsScheduled();
      },

      fetchSchedules: async () => {
        try {
          set({ isLoading: true });
          // Best-effort: a failed reconcile pass must not block loading the
          // planner — overdue entries are simply pulled on the next load.
          try {
            const reconciliation = await fetch(
              "/api/weekly-schedules/reconcile-overdue",
              { method: "POST" }
            );
            if (!reconciliation.ok) {
              console.warn(
                `Overdue schedule reconcile failed (HTTP ${reconciliation.status}); loading schedules anyway`
              );
            }
          } catch (reconcileError) {
            console.warn(
              "Overdue schedule reconcile failed; loading schedules anyway",
              reconcileError
            );
          }
          await get().refreshSchedules();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "An error occurred";
          set({ error: errorMessage, isLoading: false });
        }
      },

      updateSchedule: async (weekKey: string, schedule: WeeklyScheduleData) => {
        // The version this edit was derived from: the caller's copy (cloned
        // from store state) when it carries one, else the local doc's.
        const previous = get().schedules.find((s) => s.weekKey === weekKey) as
          | VersionedWeeklySchedule
          | undefined;
        const derived = schedule as VersionedWeeklySchedule;
        const baseVersion =
          typeof derived.version === "number"
            ? scheduleVersion(derived)
            : scheduleVersion(previous);
        const optimistic: VersionedWeeklySchedule = {
          ...schedule,
          version: baseVersion + 1,
        };
        const epoch = weekWriteEpoch.get(weekKey) ?? 0;

        // Optimistic: apply locally first so the planner reflects the drop
        // immediately. Without this, dnd-kit's drop animation flies the card
        // back to its old DOM slot before the PATCH resolves, producing a
        // visible snap-back on every reorder.
        set((state) => ({
          schedules: state.schedules.some((s) => s.weekKey === weekKey)
            ? state.schedules.map((s) => (s.weekKey === weekKey ? optimistic : s))
            : [...state.schedules, optimistic],
        }));
        useOrderStore.getState().updateIsScheduled();

        const discardLocalWeekState = () =>
          weekWriteEpoch.set(weekKey, (weekWriteEpoch.get(weekKey) ?? 0) + 1);

        await enqueueWeekWrite(weekKey, async () => {
          if ((weekWriteEpoch.get(weekKey) ?? 0) !== epoch) {
            // An earlier write for this week failed and the week was reloaded;
            // this edit was built on the discarded state.
            throw new ScheduleConflictError(weekKey);
          }
          let response: Response | null = null;
          try {
            response = await fetch("/api/weekly-schedules", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...schedule, version: baseVersion }),
            });
          } catch (error) {
            console.error("Failed to update schedule", error);
          }

          if (response?.status === HTTP_CONFLICT) {
            // Someone else (another tab, reconcile-overdue) changed this week.
            // Take the server's version rather than overwriting it.
            // The 409 body carries the stored week; replace only that week so
            // other weeks' in-flight edits keep their optimistic state.
            discardLocalWeekState();
            const body = (await response
              .json()
              .catch(() => null)) as { current?: VersionedWeeklySchedule | null } | null;
            const current = body?.current;
            if (current?.weekKey === weekKey) {
              set((state) => ({
                schedules: state.schedules.map((s) =>
                  s.weekKey === weekKey ? current : s
                ),
              }));
              useOrderStore.getState().updateIsScheduled();
            } else {
              await get()
                .refreshSchedules()
                .catch((refreshError) =>
                  console.error("Failed to reload schedules", refreshError)
                );
            }
            const conflict = new ScheduleConflictError(weekKey);
            set({ error: conflict.message });
            throw conflict;
          }

          if (!response?.ok) {
            // Roll back the optimistic update.
            discardLocalWeekState();
            set((state) => ({
              schedules: previous
                ? state.schedules.map((s) =>
                    s.weekKey === weekKey ? previous : s
                  )
                : state.schedules.filter((s) => s.weekKey !== weekKey),
              error: "Failed to update schedule",
            }));
            useOrderStore.getState().updateIsScheduled();
            throw new Error("Failed to update schedule");
          }

          // Planner placement decides glue attribution; refresh glued stats.
          invalidateGluedStats();
        });
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

          // Notify OrderStore to update `isScheduled`
          useOrderStore.getState().updateIsScheduled();

          await get().updateSchedule(weekKey, updatedSchedule);
        } catch (error) {
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

          // Notify OrderStore to update `isScheduled`
          useOrderStore.getState().updateIsScheduled();
        } catch (error) {
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
          throw error;
        }
      },

      toggleItemPinned: async (
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
              [day]: schedule.schedule[day].map((item) =>
                item.id === itemId ? { ...item, pinned: !item.pinned } : item
              ),
            },
          };

          await get().updateSchedule(weekKey, updatedSchedule);
        } catch (error) {
          throw error;
        }
      },

      // Move (or insert) an item into a target day with pinned=true. Strips the
      // entry out of every other day in the same week first, so pinning from
      // anywhere — sidebar, another day — converges on a single placement.
      pinItemToDay: async (
        weekKey: string,
        day: DayName,
        itemId: string
      ) => {
        try {
          let schedule = get().schedules.find((s) => s.weekKey === weekKey);
          if (!schedule) {
            await get().createWeek(weekKey);
            schedule = get().schedules.find((s) => s.weekKey === weekKey);
            if (!schedule) throw new Error("Failed to create week");
          }

          const stripped = Object.fromEntries(
            (Object.keys(schedule.schedule) as DayName[]).map((d) => [
              d,
              schedule!.schedule[d].filter((entry) => entry.id !== itemId),
            ])
          ) as WeeklyScheduleData["schedule"];

          stripped[day] = [
            ...stripped[day],
            { id: itemId, done: false, pinned: true },
          ];

          await get().updateSchedule(weekKey, {
            ...schedule,
            schedule: stripped,
          });
        } catch (error) {
          throw error;
        }
      },

      // Schedule change streaming is not implemented; kept as a no-op so
      // existing callers (init) stay valid.
      startWatchingChanges: () => {},

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

// Initialize the store after creation on the client only
if (shouldBootAppData()) {
  useWeeklyScheduleStore
    .getState()
    .init()
    .catch((error) => {
      console.error("Failed to initialize weekly schedule store", error);
    });
}
