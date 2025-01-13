import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { OrderTrackingInfo } from "@/typings/types";
import { toast } from "sonner";

interface TrackingState {
  trackingInfo: OrderTrackingInfo[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTrackingInfo: () => Promise<void>;
  addTrackingInfo: (tracking: OrderTrackingInfo) => Promise<void>;
  updateTrackingInfo: (tracking: OrderTrackingInfo) => Promise<void>;
  init: () => Promise<void>;
}

export const useTrackingStore = create<TrackingState>()(
  devtools(
    (set, get) => ({
      trackingInfo: [],
      isLoading: false,
      error: null,

      fetchTrackingInfo: async () => {
        try {
          set({ isLoading: true });
          const response = await fetch("/api/order-tracking");

          if (!response.ok) {
            throw new Error("Failed to fetch tracking information");
          }

          const data = await response.json();
          set({ trackingInfo: data, isLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "An error occurred";
          set({ error: errorMessage, isLoading: false });
          toast.error("Failed to fetch tracking information");
        }
      },

      updateTrackingInfo: async (tracking: OrderTrackingInfo) => {
        try {
          const response = await fetch("/api/order-tracking", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(tracking),
          });

          if (!response.ok) {
            throw new Error("Failed to update tracking information");
          }

          toast.success("Tracking information updated successfully");
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "An error occurred";
          set({ error: errorMessage });
          toast.error("Failed to update tracking information");
        }
      },

      addTrackingInfo: async (tracking: OrderTrackingInfo) => {
        try {
          const response = await fetch("/api/order-tracking", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(tracking),
          });

          if (!response.ok) {
            throw new Error("Failed to add tracking information");
          }

          set((state) => ({
            trackingInfo: [...state.trackingInfo, tracking],
          }));

          toast.success("Tracking information added successfully");
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "An error occurred";
          set({ error: errorMessage });
          toast.error("Failed to add tracking information");
        }
      },

      init: async () => {
        const store = get();
        await store.fetchTrackingInfo();
      },
    }),
    { name: "tracking-store" }
  )
);

// Initialize the store after creation
useTrackingStore.getState().init().catch(console.error);
