import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { OrderTrackingInfo, Tracker } from "@/typings/types";
import { shouldBootAppData } from "@/lib/app-boot";
import { afterBoardBoot } from "@/lib/deferred-boot";

const TRACKING_CHANGES_URL = "/api/tracking/changes";
const ORDER_TRACKING_URL = "/api/order-tracking";
const RECONNECT_DELAY_MS = 5000;

interface TrackingState {
  /** Lean trackers (status + delivered scan only); see /api/order-tracking. */
  trackingInfo: OrderTrackingInfo[];
  trackingByOrderId: Record<string, OrderTrackingInfo>;
  isLoading: boolean;
  error: string | null;
  eventSource: EventSource | null;

  // Actions
  fetchTrackingInfo: () => Promise<void>;
  /** Full scan history for one order (not kept in the shared list). */
  fetchOrderTrackingDetails: (orderId: string) => Promise<OrderTrackingInfo | null>;
  addTrackingInfo: (tracking: OrderTrackingInfo) => Promise<void>;
  updateTrackingInfo: (tracking: OrderTrackingInfo) => Promise<void>;
  startWatchingChanges: () => void;
  stopWatchingChanges: () => void;
  init: () => Promise<void>;
}

function indexByOrderId(
  trackingInfo: OrderTrackingInfo[]
): Record<string, OrderTrackingInfo> {
  const index: Record<string, OrderTrackingInfo> = {};
  for (const info of trackingInfo) index[info.orderId] = info;
  return index;
}

function mergeTrackers(existing: Tracker[], incoming: Tracker[]): Tracker[] {
  const isReplaced = (tracker: Tracker) =>
    incoming.some(
      (next) =>
        next.id === tracker.id || next.tracking_code === tracker.tracking_code
    );
  return [...existing.filter((tracker) => !isReplaced(tracker)), ...incoming];
}

function withOrderTracking(
  trackingInfo: OrderTrackingInfo[],
  next: OrderTrackingInfo
): Pick<TrackingState, "trackingInfo" | "trackingByOrderId"> {
  const exists = trackingInfo.some((info) => info.orderId === next.orderId);
  const updated = exists
    ? trackingInfo.map((info) => (info.orderId === next.orderId ? next : info))
    : [...trackingInfo, next];
  return { trackingInfo: updated, trackingByOrderId: indexByOrderId(updated) };
}

let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let watching = false;

export const useTrackingStore = create<TrackingState>()(
  devtools(
    (set, get) => ({
      trackingInfo: [],
      trackingByOrderId: {},
      isLoading: false,
      error: null,
      eventSource: null,

      startWatchingChanges: () => {
        // Ensure this only runs in the browser where EventSource is available
        if (typeof window === "undefined" || typeof EventSource === "undefined") {
          return;
        }

        watching = true;
        get().eventSource?.close();
        const eventSource = new EventSource(TRACKING_CHANGES_URL);

        eventSource.onmessage = (event) => {
          let data: { type?: string; data?: OrderTrackingInfo };
          try {
            data = JSON.parse(event.data);
          } catch {
            return;
          }
          const next = data.data;
          if (data.type !== "tracking.updated" || !next?.orderId) return;
          set((state) => withOrderTracking(state.trackingInfo, next));
        };

        eventSource.onerror = () => {
          eventSource.close();
          if (get().eventSource === eventSource) set({ eventSource: null });
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (watching) get().startWatchingChanges();
          }, RECONNECT_DELAY_MS);
        };

        set({ eventSource });
      },

      stopWatchingChanges: () => {
        watching = false;
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        const { eventSource } = get();
        if (eventSource) {
          eventSource.close();
          set({ eventSource: null });
        }
      },

      fetchTrackingInfo: async () => {
        try {
          set({ isLoading: true });
          const response = await fetch(ORDER_TRACKING_URL);

          if (!response.ok) {
            throw new Error("Failed to fetch tracking information");
          }

          const data: OrderTrackingInfo[] = await response.json();
          set({
            trackingInfo: data,
            trackingByOrderId: indexByOrderId(data),
            isLoading: false,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "An error occurred";
          set({ error: errorMessage, isLoading: false });
        }
      },

      fetchOrderTrackingDetails: async (orderId: string) => {
        const response = await fetch(
          `${ORDER_TRACKING_URL}?orderId=${encodeURIComponent(orderId)}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch tracking history");
        }
        return (await response.json()) as OrderTrackingInfo | null;
      },

      updateTrackingInfo: async (tracking: OrderTrackingInfo) => {
        try {
          const response = await fetch(ORDER_TRACKING_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(tracking),
          });

          if (!response.ok) {
            throw new Error("Failed to update tracking information");
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "An error occurred";
          set({ error: errorMessage });
        }
      },

      addTrackingInfo: async (tracking: OrderTrackingInfo) => {
        try {
          const response = await fetch(ORDER_TRACKING_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(tracking),
          });

          if (!response.ok) {
            throw new Error("Failed to add tracking information");
          }

          // The server merges these trackers into the order's list; mirror that.
          set((state) => {
            const existing =
              state.trackingByOrderId[tracking.orderId]?.trackers ?? [];
            return withOrderTracking(state.trackingInfo, {
              orderId: tracking.orderId,
              trackers: mergeTrackers(existing, tracking.trackers),
            });
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "An error occurred";
          set({ error: errorMessage });
        }
      },

      init: async () => {
        const store = get();
        await store.fetchTrackingInfo();
        store.startWatchingChanges();
      },
    }),
    { name: "tracking-store" }
  )
);

/** Selector-friendly lookup so a row re-renders only when its own order changes. */
export function useOrderTracking(orderId: string): OrderTrackingInfo | undefined {
  return useTrackingStore((state) => state.trackingByOrderId[orderId]);
}

// Initialize on the client once the board's first load has settled: the lean
// tracker list is large and its live stream holds a connection open.
if (shouldBootAppData()) {
  afterBoardBoot(() => {
    useTrackingStore
      .getState()
      .init()
      .catch((error) => {
        console.error("Failed to initialize tracking store", error);
      });
  });
}
