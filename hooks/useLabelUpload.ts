import { useCallback } from "react";

import {
  uploadAndScanFutureLabelFile,
  type FutureLabelScanResult,
} from "@/lib/shipping-labels/client";
import {
  scanFutureLabel,
  uploadFutureLabelFile,
} from "@/lib/shipping-labels/client-api";
import { useShippingStore } from "@/stores/useShippingStore";
import { useTrackingStore } from "@/stores/useTrackingStore";
import { useUploadProgressStore } from "@/stores/useUploadProgressStore";
import type { FileProgress, UploadStep } from "@/types/shipping";

const UPLOAD_STARTED_PROGRESS = 0;
const UPLOAD_COMPLETE_PROGRESS = 25;
const SCAN_PROGRESS_RANGE = 70;
const COMPLETE_PROGRESS = 100;
const MARK_COMPLETE_DELAY_MS = 1000;

const BASE_STEPS: UploadStep[] = [
  { id: "upload", label: "Uploading PDF", status: "processing" },
  { id: "extraction", label: "Scanning every label page", status: "waiting" },
  { id: "tracking", label: "Creating individual trackers", status: "waiting" },
  { id: "database", label: "Organizing labels", status: "waiting" },
];

export type UploadLabelsOptions = {
  onError?: (message: string) => void;
  // Retained for callers using the old hook contract. Future uploads surface
  // page-specific issues inside the inventory instead of interrupting staff.
  onManualTrackingNeeded?: (fileIndex: number, fileName: string) => void;
};

function progressFor(file: File, overrides: Partial<FileProgress>): FileProgress {
  return {
    file,
    currentStep: "upload",
    progress: UPLOAD_STARTED_PROGRESS,
    steps: BASE_STEPS.map((step) => ({ ...step })),
    ...overrides,
  };
}

function failedSteps(message: string): UploadStep[] {
  return BASE_STEPS.map((step) => ({
    ...step,
    status: "error",
    message,
  }));
}

export function useLabelUpload() {
  const { updateFileProgress, markFileComplete } = useUploadProgressStore();
  const fetchAllLabels = useShippingStore((state) => state.fetchAllLabels);
  const fetchTrackingInfo = useTrackingStore(
    (state) => state.fetchTrackingInfo
  );

  const uploadLabels = useCallback(
    async (
      orderId: string,
      files: File[],
      options: UploadLabelsOptions = {}
    ) => {
      if (files.length === 0) {
        options.onError?.("Please select files to upload.");
        return;
      }

      let hadFailure = false;
      for (const file of files) {
        updateFileProgress(file.name, progressFor(file, {}));
        let settledPages = 0;
        let issuePages = 0;
        let pageCount = 0;

        try {
          const result = await uploadAndScanFutureLabelFile(
            orderId,
            file,
            { upload: uploadFutureLabelFile, scan: scanFutureLabel },
            {
              onUploaded: (uploaded) => {
                pageCount = uploaded.labels.length;
                updateFileProgress(
                  file.name,
                  progressFor(file, {
                    currentStep: "extraction",
                    progress: UPLOAD_COMPLETE_PROGRESS,
                    steps: BASE_STEPS.map((step) =>
                      step.id === "upload"
                        ? { ...step, status: "complete" }
                        : step.id === "extraction"
                          ? {
                              ...step,
                              status: "processing",
                              message: `0 of ${pageCount} pages scanned`,
                            }
                          : { ...step }
                    ),
                  })
                );
              },
              onScanSettled: (_label, scanResult) => {
                settledPages += 1;
                if (
                  scanResult.error ||
                  scanResult.label?.processingStatus === "needs_review"
                ) {
                  issuePages += 1;
                }
                const scanProgress = pageCount
                  ? (settledPages / pageCount) * SCAN_PROGRESS_RANGE
                  : SCAN_PROGRESS_RANGE;
                updateFileProgress(
                  file.name,
                  progressFor(file, {
                    currentStep: "tracking",
                    progress: UPLOAD_COMPLETE_PROGRESS + scanProgress,
                    steps: BASE_STEPS.map((step) => {
                      if (step.id === "upload") {
                        return { ...step, status: "complete" };
                      }
                      if (step.id === "extraction") {
                        return {
                          ...step,
                          status:
                            settledPages === pageCount
                              ? "complete"
                              : "processing",
                          message: `${settledPages} of ${pageCount} pages scanned`,
                        };
                      }
                      if (step.id === "tracking") {
                        return {
                          ...step,
                          status:
                            settledPages === pageCount
                              ? "complete"
                              : "processing",
                        };
                      }
                      return { ...step };
                    }),
                  })
                );
              },
            }
          );

          const requestFailures = result.scanResults.filter(
            (entry: FutureLabelScanResult) => entry.error
          );
          hadFailure ||= requestFailures.length > 0;
          const issueMessage = issuePages
            ? `${issuePages} page${issuePages === 1 ? "" : "s"} need review`
            : undefined;
          updateFileProgress(
            file.name,
            progressFor(file, {
              currentStep: "database",
              progress: COMPLETE_PROGRESS,
              steps: BASE_STEPS.map((step) => ({
                ...step,
                status:
                  requestFailures.length > 0 && step.id === "database"
                    ? "error"
                    : "complete",
                ...(step.id === "database" && issueMessage
                  ? { message: issueMessage }
                  : {}),
              })),
            })
          );
          if (requestFailures.length === 0) {
            window.setTimeout(
              () => markFileComplete(file.name),
              MARK_COMPLETE_DELAY_MS
            );
          }
        } catch (error) {
          hadFailure = true;
          const message =
            error instanceof Error
              ? error.message
              : "Shipping-label upload failed.";
          updateFileProgress(
            file.name,
            progressFor(file, {
              progress: COMPLETE_PROGRESS,
              steps: failedSteps(message),
            })
          );
        } finally {
          await Promise.all([fetchAllLabels(), fetchTrackingInfo()]);
        }
      }

      if (hadFailure) {
        options.onError?.(
          "One or more label pages could not be scanned. Open the order to retry them."
        );
      }
    },
    [
      fetchAllLabels,
      fetchTrackingInfo,
      markFileComplete,
      updateFileProgress,
    ]
  );

  return { uploadLabels };
}
