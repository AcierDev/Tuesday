import { create } from "zustand";
import { hasAnyShippingLabel } from "@/lib/shipping-labels/client";
import { summarizeFutureLabels } from "@/lib/shipping-labels/client-api";
import type { FutureLabelSummariesByOrder } from "@/types/shipping-labels";
import { shouldBootAppData } from "@/lib/app-boot";
import { afterBoardBoot } from "@/lib/deferred-boot";

interface ShippingStore {
  s3Config: { bucket: string; region: string } | null;
  labels: Record<string, string[]>;
  futureSummaries: FutureLabelSummariesByOrder;
  // Cache-busting token per filename. S3 filenames are reused (e.g. a deleted
  // `orderId.pdf` gets re-created with new content under the same name), so the
  // URL alone is not enough to defeat the browser cache — we version it.
  labelVersions: Record<string, number>;
  // True only until the first label listing settles. Later refreshes (the 60s
  // poll, opening a dialog) keep showing the loaded labels and never disable
  // the barcode buttons.
  isLoading: boolean;
  error: string | null;
  fetchAllLabels: (options?: { force?: boolean }) => Promise<void>;
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
// Opening several label dialogs in a row reuses a listing fetched this recently
// (uploads and purchases call fetchAllLabels({ force: true }) themselves).
const FRESH_LISTING_MS = 4_000;

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
  // One listing at a time: callers that arrive mid-fetch share its result
  // instead of each re-listing the S3 bucket and re-scanning the label records.
  let inFlight: Promise<void> | null = null;
  let lastSettledAt = 0;
  let hasLoadedOnce = false;
  // Polls always refresh; only dialog opens reuse a very recent listing.
  const pollLabels = () => get().fetchAllLabels({ force: true });

  return {
    s3Config: null,
    labels: {},
    futureSummaries: {},
    labelVersions: {},
    isLoading: false,
    error: null,

    fetchAllLabels: (options) => {
      if (inFlight) return inFlight;
      if (!options?.force && hasLoadedOnce && Date.now() - lastSettledAt < FRESH_LISTING_MS) {
        return Promise.resolve();
      }
      inFlight = (async () => {
        // The first load shows the loading state; refreshes stay silent so the
        // row buttons are never disabled while a poll is in flight.
        if (!hasLoadedOnce) set({ isLoading: true });
        try {
          const [response, futureSummaries] = await Promise.all([
            fetch("/api/shipping/pdfs"),
            summarizeFutureLabels().catch((summaryError) => {
              console.error(
                "Failed to fetch future shipping-label counts",
                summaryError
              );
              return get().futureSummaries;
            }),
          ]);
          if (!response.ok) throw new Error("Failed to fetch shipping labels");

          const data = await response.json();

          // Handle both old array format and new object format
          const filenames: string[] = Array.isArray(data) ? data : data.files;
          const s3Config =
            !Array.isArray(data) && data.config
              ? data.config
              : get().s3Config;

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

          hasLoadedOnce = true;
          set({
            labels: labelsByOrder,
            futureSummaries,
            labelVersions,
            s3Config,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          // A failed refresh keeps the labels already shown.
          set({
            error: error instanceof Error ? error.message : "Unknown error",
            isLoading: false,
          });
        } finally {
          lastSettledAt = Date.now();
          inFlight = null;
        }
      })();
      return inFlight;
    },

    startPolling: () => {
      // Fetch immediately
      get().fetchAllLabels();

      // Start polling if not already started AND not currently paused
      if (!pollInterval && pauseCount === 0) {
        pollInterval = setInterval(pollLabels, POLL_INTERVAL_MS);
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
        pollInterval = setInterval(pollLabels, POLL_INTERVAL_MS);
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
      return hasAnyShippingLabel(
        get().labels[orderId] ?? [],
        get().futureSummaries[orderId]
      );
    },

    getLabelUrl: (filename: string) => {
      // PDF previews fetch and merge these bytes in the browser. Keep requests
      // same-origin: public S3 URLs can display in an iframe but lack fetch CORS.
      const { labelVersions } = get();
      const version = labelVersions[filename];
      const cacheBust = version ? `?v=${version}` : "";
      return `/api/shipping/pdf/${encodeURIComponent(filename)}${cacheBust}`;
    },
  };
});

// Start polling in the browser once the board's first load has settled (the
// S3 label listing is slow and not needed for the first paint). Rows show the
// loading state until then, as they did while the boot fetch was in flight.
if (shouldBootAppData()) {
  useShippingStore.setState({ isLoading: true });
  afterBoardBoot(() => useShippingStore.getState().startPolling());
}
