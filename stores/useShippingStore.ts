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

        // Group filenames by order ID (handling both base and numbered filenames)
        filenames.forEach((filename) => {
          // Extract orderId from filename patterns like:
          // "orderId.pdf" or "orderId-1.pdf" or "orderId-2.pdf"
          const match = filename.match(/^(.+?)(?:-\d+)?\.pdf$/);
          if (match) {
            const orderId = match[1];
            labelsByOrder[orderId] = labelsByOrder[orderId] || [];
            labelsByOrder[orderId]!.push(filename);
          }
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
      set((state) => {
        const updatedLabels =
          state.labels[orderId]?.filter((label) => label !== filename) || [];

        // If there are no more labels for this order, remove the order entry completely
        const newLabels = { ...state.labels };
        if (updatedLabels.length === 0) {
          delete newLabels[orderId];
        } else {
          newLabels[orderId] = updatedLabels;
        }

        return { labels: newLabels };
      });
    },

    hasLabel: (orderId: string) => {
      return Boolean(get().labels[orderId]?.length);
    },
  };
});

// Start polling when the store is initialized
useShippingStore.getState().startPolling();
