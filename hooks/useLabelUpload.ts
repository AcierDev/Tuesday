import { useCallback } from "react";
import { useUploadProgressStore } from "@/stores/useUploadProgressStore";
import { useShippingStore } from "@/stores/useShippingStore";
import { useTrackingStore } from "@/stores/useTrackingStore";
import { TrackingInfo, FileProgress } from "@/types/shipping";
import { Tracker } from "@/typings/types";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
const TRACKING_NUMBER_FORMATS: Record<TrackingInfo["carrier"], RegExp> = {
  UPS: /^1Z[A-Z0-9]{16}$/,
  FedEx: /^(\d{12}|\d{14,15})$/,
  USPS: /^(\d{20}|\d{26}|\d{30}|9\d{15,21})$/,
  DHL: /^[0-9]{10,12}$/,
};

const MARK_COMPLETE_DELAY_MS = 1000;

function validateTrackingNumber(trackingInfo: TrackingInfo) {
  if (!trackingInfo.trackingNumber) return false;
  const cleaned = trackingInfo.trackingNumber.replace(/\s+/g, "");
  const pattern = TRACKING_NUMBER_FORMATS[trackingInfo.carrier];
  return pattern?.test(cleaned) ?? false;
}

export type UploadLabelsOptions = {
  onError?: (message: string) => void;
  onManualTrackingNeeded?: (fileIndex: number, fileName: string) => void;
};

/**
 * Shared shipping-label upload pipeline (upload → extract tracking → fetch
 * tracker → save). Drives the global UploadProgress overlay so the UI is
 * identical whether the upload starts from the ViewLabel dialog or directly
 * from the row's label icon.
 */
export function useLabelUpload() {
  const { updateFileProgress, markFileComplete } = useUploadProgressStore();
  const addLabel = useShippingStore((state) => state.addLabel);
  const { addTrackingInfo } = useTrackingStore();

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

      try {
        const existingLabels = await fetch(`/api/shipping/pdfs/${orderId}`);
        const responseData = await existingLabels.json();

        // Handle new response format { files: string[], config: ... }
        const existingLabelsList: string[] = Array.isArray(responseData)
          ? responseData
          : responseData.files || [];

        const getNextFilename = (existingFiles: string[]) => {
          if (existingFiles.length === 0) {
            return `${orderId}.pdf`;
          }

          const suffixes = existingFiles.map((filename) => {
            if (!filename) return -1;
            if (filename === `${orderId}.pdf`) {
              return 0;
            }
            const match = filename.match(/-(\d+)\.pdf$/);
            return match?.[1] ? parseInt(match[1], 10) : -1;
          });

          const maxSuffix = Math.max(...suffixes);
          return maxSuffix === 0
            ? `${orderId}-1.pdf`
            : `${orderId}-${maxSuffix + 1}.pdf`;
        };

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (!file) continue;

          const filename = getNextFilename(existingLabelsList);
          existingLabelsList.push(filename);

          const initialProgress: FileProgress = {
            file,
            currentStep: "upload",
            progress: 0,
            steps: [
              { id: "upload", label: "Uploading label", status: "processing" },
              {
                id: "extraction",
                label: "Extracting tracking info",
                status: "waiting",
              },
              {
                id: "tracking",
                label: "Fetching tracking details",
                status: "waiting",
              },
              { id: "database", label: "Updating database", status: "waiting" },
            ],
          };

          updateFileProgress(file.name, initialProgress);

          try {
            const formData = new FormData();
            formData.append("label", file);

            updateFileProgress(file.name, {
              ...initialProgress,
              progress: 25,
              steps: initialProgress.steps.map((step) =>
                step.id === "upload" ? { ...step, status: "processing" } : step
              ),
            });

            const response = await fetch(
              `/api/shipping/upload-label?filename=${filename}`,
              {
                method: "POST",
                body: formData,
              }
            );

            if (!response.ok) {
              throw new Error(`Upload failed for file ${i + 1}`);
            }

            addLabel(orderId, filename);

            updateFileProgress(file.name, {
              ...initialProgress,
              currentStep: "extraction",
              progress: 50,
              steps: initialProgress.steps.map((step) =>
                step.id === "upload"
                  ? { ...step, status: "complete" }
                  : step.id === "extraction"
                  ? { ...step, status: "processing" }
                  : step
              ),
            });

            const trackingFormData = new FormData();
            trackingFormData.append("label", file);

            const trackingResponse = await fetch(
              "/api/shipping/extract-tracking",
              {
                method: "POST",
                body: trackingFormData,
              }
            );

            if (!trackingResponse.ok) {
              throw new Error("Failed to extract tracking info");
            }

            const trackingInfo: TrackingInfo = await trackingResponse.json();

            if (!validateTrackingNumber(trackingInfo)) {
              options.onManualTrackingNeeded?.(i, file.name);
              continue;
            }

            updateFileProgress(file.name, {
              ...initialProgress,
              currentStep: "tracking",
              progress: 75,
              trackingInfo,
              steps: initialProgress.steps.map((step) =>
                step.id === "upload"
                  ? { ...step, status: "complete" }
                  : step.id === "extraction"
                  ? { ...step, status: "complete" }
                  : step.id === "tracking"
                  ? { ...step, status: "processing" }
                  : step
              ),
            });

            const trackerResponse = await fetch(
              `/api/shipping/tracker/${trackingInfo.trackingNumber}?carrier=${trackingInfo.carrier}`
            );

            if (!trackerResponse.ok) {
              throw new Error("Failed to validate tracking number");
            }

            const tracker: Tracker = await trackerResponse.json();
            await addTrackingInfo({ orderId, trackers: [tracker] });

            updateFileProgress(file.name, {
              ...initialProgress,
              currentStep: "database",
              progress: 100,
              trackingInfo,
              steps: initialProgress.steps.map((step) => ({
                ...step,
                status: "complete",
              })),
            });

            setTimeout(() => {
              markFileComplete(file.name);
            }, MARK_COMPLETE_DELAY_MS);
          } catch (error) {
            console.error("Error processing file:", error);
            updateFileProgress(file.name, {
              ...initialProgress,
              progress: 100,
              steps: initialProgress.steps.map((step) => ({
                ...step,
                status: "error",
                message:
                  error instanceof Error
                    ? error.message
                    : "Unknown error occurred",
              })),
            });
          }
        }
      } catch (error) {
        console.error("Upload error:", error);
        options.onError?.(
          "Failed to upload one or more files. Please try again."
        );
      }
    },
    [updateFileProgress, markFileComplete, addLabel, addTrackingInfo]
  );

  return { uploadLabels };
}
