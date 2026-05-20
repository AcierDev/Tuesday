import { create } from "zustand";

interface ShippingStore {
  s3Config: { bucket: string; region: string } | null;
  labels: Record<string, string[]>;
  // Cache-busting token per filename. S3 filenames are reused (e.g. a deleted
  // `orderId.pdf` gets re-created with new content under the same name), so the
  // URL alone is not enough to defeat the browser cache — we version it.
  labelVersions: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  fetchAllLabels: () => Promise<void>;
  addLabel: (orderId: string, filename: string) => void;
  removeLabel: (orderId: string, filename: string) => void;
  startPolling: () => void;
  stopPolling: () => void;
  pausePolling: () => void;
  resumePolling: () => void;
  hasLabel: (orderId: string) => boolean;
  getLabelUrl: (filename: string) => string;
}

const POLL_INTERVAL_MS = 60_000;

// Monotonic counter so a delete + immediate re-add always produces a fresh
// cache-busting token, even within the same millisecond.
let versionCounter = Date.now();
const nextVersion = () => ++versionCounter;

export const useShippingStore = create<ShippingStore>((set, get) => {
  let pollInterval: any = null;
  // Counter so multiple consumers can pause concurrently without trampling
  // each other (e.g. two dialogs open at once). Polling only resumes when
  // the count returns to zero.
  let pauseCount = 0;

  return {
    s3Config: null,
    labels: {},
    labelVersions: {},
    isLoading: false,
    error: null,

    fetchAllLabels: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch("/api/shipping/pdfs");
        if (!response.ok) throw new Error("Failed to fetch shipping labels");

        const data = await response.json();
        
        // Handle both old array format and new object format
        const filenames: string[] = Array.isArray(data) ? data : data.files;
        const s3Config = !Array.isArray(data) && data.config ? data.config : get().s3Config;

        const labelsByOrder: Record<string, string[]> = {};

        // Group filenames by order ID (handling both base and numbered filenames)
        filenames.forEach((filename) => {
          // Extract orderId from filename patterns like:
          // "orderId.pdf" or "orderId-1.pdf" or "orderId-2.pdf"
          const match = filename.match(/^(.+?)(?:-\d+)?\.pdf$/);
          if (match && match[1]) {
            const orderId = match[1];
            labelsByOrder[orderId] = labelsByOrder[orderId] || [];
            labelsByOrder[orderId]!.push(filename);
          }
        });

        // Preserve existing versions; only mint a token for filenames we
        // haven't seen yet so the URL stays stable across polls.
        const prevVersions = get().labelVersions;
        const labelVersions: Record<string, number> = {};
        filenames.forEach((filename) => {
          labelVersions[filename] = prevVersions[filename] ?? nextVersion();
        });

        set({ labels: labelsByOrder, labelVersions, s3Config, isLoading: false });
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

      // Start polling if not already started AND not currently paused
      if (!pollInterval && pauseCount === 0) {
        pollInterval = setInterval(get().fetchAllLabels, POLL_INTERVAL_MS);
      }
    },

    stopPolling: () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    },

    pausePolling: () => {
      pauseCount += 1;
      if (pauseCount === 1 && pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    },

    resumePolling: () => {
      if (pauseCount === 0) return;
      pauseCount -= 1;
      if (pauseCount === 0 && !pollInterval) {
        pollInterval = setInterval(get().fetchAllLabels, POLL_INTERVAL_MS);
      }
    },

    addLabel: (orderId: string, filename: string) => {
      set((state) => ({
        labels: {
          ...state.labels,
          [orderId]: [...(state.labels[orderId] || []), filename],
        },
        // Always bump: a re-added label reuses the old filename but has new
        // content, so the cached copy must be invalidated.
        labelVersions: { ...state.labelVersions, [filename]: nextVersion() },
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

        // Drop the stale token so a future re-add gets a fresh one.
        const newVersions = { ...state.labelVersions };
        delete newVersions[filename];

        return { labels: newLabels, labelVersions: newVersions };
      });
    },

    hasLabel: (orderId: string) => {
      return Boolean(get().labels[orderId]?.length);
    },

    getLabelUrl: (filename: string) => {
      // Returns the API URL for fetching the label (which redirects to S3)
      // Returns the direct S3 URL using the stored config
      const { s3Config, labelVersions } = get();
      const v = labelVersions[filename];
      const cacheBust = v ? `?v=${v}` : "";
      if (!s3Config) {
        console.warn("S3 config not loaded, falling back to proxy");
        return `/api/shipping/pdf/${filename}${cacheBust}`;
      }
      return `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${filename}${cacheBust}`;
    },
  };
});

// Start polling when the store is initialized
useShippingStore.getState().startPolling();
