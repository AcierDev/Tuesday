import { create } from "zustand";

interface ShippingStore {
  labels: Record<string, string[]>;
  isLoading: boolean;
  error: string | null;
  fetchAllLabels: () => Promise<void>;
  addLabel: (orderId: string, filename: string) => void;
  removeLabel: (orderId: string, filename: string) => void;
  startPolling: () => void;
  stopPolling: () => void;
  hasLabel: (orderId: string) => boolean;
}

export const useShippingStore = create<ShippingStore>((set, get) => {
  let pollInterval: NodeJS.Timer | null = null;

  return {
    labels: {},
    isLoading: false,
    error: null,

    fetchAllLabels: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch("/api/shipping/pdfs");
        if (!response.ok) throw new Error("Failed to fetch shipping labels");

        const filenames: string[] = await response.json();
        const labelsByOrder: Record<string, string[]> = {};

        // Group filenames by order ID (removing the .pdf extension)
        filenames.forEach((filename) => {
          const orderId = filename.replace(".pdf", "");
          labelsByOrder[orderId] = labelsByOrder[orderId] || [];
          labelsByOrder[orderId]!.push(filename);
        });

        set({ labels: labelsByOrder, isLoading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Unknown error",
          isLoading: false,
        });
      }
    },

    startPolling: () => {
      // Fetch immediately
      get().fetchAllLabels();

      // Start polling if not already started
      if (!pollInterval) {
        pollInterval = setInterval(get().fetchAllLabels, 60000); // every minute
      }
    },

    stopPolling: () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    },

    addLabel: (orderId: string, filename: string) => {
      set((state) => ({
        labels: {
          ...state.labels,
          [orderId]: [...(state.labels[orderId] || []), filename],
        },
      }));
    },

    removeLabel: (orderId: string, filename: string) => {
      set((state) => ({
        labels: {
          ...state.labels,
          [orderId]: (state.labels[orderId] || []).filter(
            (label) => label !== filename
          ),
        },
      }));
    },

    hasLabel: (orderId: string) => {
      return Boolean(get().labels[orderId]?.length);
    },
  };
});

// Start polling when the store is initialized
useShippingStore.getState().startPolling();
