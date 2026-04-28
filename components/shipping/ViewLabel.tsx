"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Download,
  Upload,
  File as FileIcon,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  Settings2,
  Barcode,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Item, Tracker } from "@/typings/types";
import { useTrackingStore } from "@/stores/useTrackingStore";
import { useUploadProgressStore } from "@/stores/useUploadProgressStore";
import { useShippingStore } from "@/stores/useShippingStore";
import { UploadStep, TrackingInfo, FileProgress } from "@/types/shipping";
import { cn } from "@/utils/functions";
import { FedExBuyLabelDialog } from "./FedExBuyLabelDialog";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎚️ TAB CONFIG                                                        ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
const TAB_VALUES = ["view", "manage"] as const;
type TabValue = (typeof TAB_VALUES)[number];
const TAB_LABEL: Record<TabValue, string> = {
  view: "View Labels",
  manage: "Manage Labels",
};
const TAB_ICON: Record<TabValue, React.ComponentType<{ className?: string }>> = {
  view: Eye,
  manage: Settings2,
};

const PREVIEW_HEIGHT = "clamp(440px, 68vh, 760px)";

type ManualTrackingInput = {
  fileIndex: number;
  fileName: string;
  show: boolean;
};

export function ViewLabel({
  orderId,
  item,
  onClose,
}: {
  orderId: string;
  item?: Item;
  onClose?: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [currentPdfIndex, setCurrentPdfIndex] = useState(0);
  const [manualTracking, setManualTracking] = useState<ManualTrackingInput>({
    fileIndex: -1,
    fileName: "",
    show: false,
  });
  const [manualTrackingNumber, setManualTrackingNumber] = useState("");
  const [manualCarrier, setManualCarrier] =
    useState<TrackingInfo["carrier"]>("UPS");
  const [retryingFiles, setRetryingFiles] = useState<Set<string>>(new Set());
  const { addTrackingInfo } = useTrackingStore();
  const { updateFileProgress, markFileComplete } = useUploadProgressStore();
  const { labels, fetchAllLabels, removeLabel, addLabel, getLabelUrl, isLoading } = useShippingStore();
  const orderLabels = labels[orderId] || [];
  const pdfExists = orderLabels.length > 0;
  const [activeTab, setActiveTab] = useState<TabValue>(
    pdfExists ? "view" : "manage"
  );

  useEffect(() => {
    if (!pdfExists && activeTab === "view") setActiveTab("manage");
  }, [pdfExists, activeTab]);

  useEffect(() => {
    // Refresh labels when orderId changes
    fetchAllLabels();
  }, [orderId]);

  const handleFiles = useCallback((newFiles: FileList) => {
    const pdfFiles = Array.from(newFiles).filter(
      (file) => file.type === "application/pdf"
    );
    if (pdfFiles.length === 0) {
      setError("Please upload PDF files only.");
      return;
    }
    setFiles((prevFiles) => [...prevFiles, ...pdfFiles]);
    setError(null);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFiles(event.target.files);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const saveTrackingInfo = async (tracker: Tracker) => {
    try {
      await addTrackingInfo({
        orderId,
        trackers: [tracker],
      });
    } catch (error) {
      console.error("Failed to save tracking info:", error);
      throw error;
    }
  };

  const handleManualTrackingSubmit = async () => {
    const fileIndex = manualTracking.fileIndex;

    console.log("Submitting manual tracking:", {
      trackingNumber: manualTrackingNumber,
      carrier: manualCarrier,
    });

    try {
      setError(null);

      const trackerResponse = await fetch(
        `/api/shipping/tracker/${manualTrackingNumber}?carrier=${manualCarrier}`
      );

      if (!trackerResponse.ok) {
        const errorText = await trackerResponse.text();
        console.log("Manual tracking API error:", {
          status: trackerResponse.status,
          statusText: trackerResponse.statusText,
          response: errorText,
        });
        const errorData = await trackerResponse.json();
        throw new Error(
          errorData.error || "Failed to validate tracking number"
        );
      }

      const tracker: Tracker = await trackerResponse.json();
      console.log("Received tracker data:", tracker);

      await saveTrackingInfo(tracker);

      // Close the modal only after successful submission
      setManualTracking({ fileIndex: -1, fileName: "", show: false });
      setManualTrackingNumber("");
    } catch (error) {
      console.error("Manual tracking error:", {
        error,
        trackingNumber: manualTrackingNumber,
        carrier: manualCarrier,
      });
      setError(
        error instanceof Error
          ? error.message
          : "Failed to process tracking number"
      );
    }
  };

  const handleRetryExtraction = async (filename: string, index: number) => {
    if (retryingFiles.has(filename)) return;

    setRetryingFiles((prev) => new Set(prev).add(filename));
    setError(null);

    // Close the dialog so the user can see the progress overlay
    onClose?.();

    let initialProgress: FileProgress | null = null;

    try {
      const pdfResponse = await fetch(`/api/shipping/pdf/${filename}`);
      if (!pdfResponse.ok) throw new Error("Failed to fetch label PDF");
      const pdfBlob = await pdfResponse.blob();
      const pdfFile = new globalThis.File([pdfBlob], filename, {
        type: "application/pdf",
      });

      // Mirror handleUpload's progress so the UI looks identical to a fresh
      // upload — except the "upload" step is already complete since the file
      // is already in S3.
      initialProgress = {
        file: pdfFile,
        currentStep: "extraction",
        progress: 25,
        steps: [
          { id: "upload", label: "Uploading label", status: "complete" },
          {
            id: "extraction",
            label: "Extracting tracking info",
            status: "processing",
          },
          {
            id: "tracking",
            label: "Fetching tracking details",
            status: "waiting",
          },
          { id: "database", label: "Updating database", status: "waiting" },
        ],
      };

      updateFileProgress(filename, initialProgress);

      const trackingFormData = new FormData();
      trackingFormData.append("label", pdfFile);

      const trackingResponse = await fetch("/api/shipping/extract-tracking", {
        method: "POST",
        body: trackingFormData,
      });

      if (!trackingResponse.ok) {
        throw new Error("Failed to extract tracking info");
      }

      const trackingInfo: TrackingInfo = await trackingResponse.json();

      if (!validateTrackingNumber(trackingInfo)) {
        updateFileProgress(filename, {
          ...initialProgress,
          progress: 100,
          steps: initialProgress.steps.map((step) =>
            step.id === "extraction"
              ? {
                  ...step,
                  status: "error",
                  message: "AI couldn't read tracking — enter manually",
                }
              : step
          ),
        });
        setManualTracking({ fileIndex: index, fileName: filename, show: true });
        return;
      }

      updateFileProgress(filename, {
        ...initialProgress,
        currentStep: "tracking",
        progress: 60,
        trackingInfo,
        steps: initialProgress.steps.map((step) =>
          step.id === "extraction"
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

      updateFileProgress(filename, {
        ...initialProgress,
        currentStep: "database",
        progress: 85,
        trackingInfo,
        steps: initialProgress.steps.map((step) =>
          step.id === "extraction" || step.id === "tracking"
            ? { ...step, status: "complete" }
            : step.id === "database"
            ? { ...step, status: "processing" }
            : step
        ),
      });

      await saveTrackingInfo(tracker);

      updateFileProgress(filename, {
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
        markFileComplete(filename);
      }, 1000);
    } catch (err) {
      console.error("Retry extraction failed:", err);
      const msg =
        err instanceof Error ? err.message : "Failed to retry extraction";
      setError(msg);
      if (initialProgress) {
        updateFileProgress(filename, {
          ...initialProgress,
          progress: 100,
          steps: initialProgress.steps.map((step) =>
            step.status === "complete"
              ? step
              : { ...step, status: "error", message: msg }
          ),
        });
      }
    } finally {
      setRetryingFiles((prev) => {
        const next = new Set(prev);
        next.delete(filename);
        return next;
      });
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select files to upload.");
      return;
    }

    setUploading(true);
    setError(null);

    // Close the dialog if provided
    onClose?.();

    try {
      const existingLabels = await fetch(`/api/shipping/pdfs/${orderId}`);
      const responseData = await existingLabels.json();
      console.log("Existing labels:", responseData);
      
      // Handle new response format { files: string[], config: ... }
      const existingLabelsList: string[] = Array.isArray(responseData) 
        ? responseData 
        : (responseData.files || []);

      // Modified logic for filename generation
      const getNextFilename = (existingFiles: string[]) => {
        // If no files exist yet, start with base filename
        if (existingFiles.length === 0) {
          return `${orderId}.pdf`;
        }

        // Find the highest number suffix
        const suffixes = existingFiles.map((filename) => {
          if (!filename) return -1;
          // Base filename without suffix should be considered as index 0
          if (filename === `${orderId}.pdf`) {
            return 0;
          }
          const match = filename.match(/-(\d+)\.pdf$/);
          return match ? parseInt(match[1], 10) : -1;
        });

        const maxSuffix = Math.max(...suffixes);
        // If maxSuffix is 0 (only base file exists), start with -1
        // Otherwise increment the highest suffix
        return maxSuffix === 0
          ? `${orderId}-1.pdf`
          : `${orderId}-${maxSuffix + 1}.pdf`;
      };

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        // Get the next available filename
        const filename = getNextFilename(existingLabelsList);
        existingLabelsList.push(filename); // Add to list for next iteration

        // Initialize progress for this file
        const initialProgress: FileProgress = {
          file,
          currentStep: "upload",
          progress: 0,
          steps: [
            {
              id: "upload",
              label: "Uploading label",
              status: "processing",
            },
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
            {
              id: "database",
              label: "Updating database",
              status: "waiting",
            },
          ],
        };

        updateFileProgress(file.name, initialProgress);

        try {
          // Upload the file
          const formData = new FormData();
          formData.append("label", file);

          // Update progress for upload step
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

          console.log("Uploaded file:", file.name);

          // Add this line after the successful upload:
          addLabel(orderId, filename);
          console.log("Added label to store:", filename);

          // Update progress for extraction step
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

          // Extract tracking info
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

          console.log("Extracted tracking info for file:", file.name);

          const trackingInfo: TrackingInfo = await trackingResponse.json();

          // Validate tracking number
          const isValidTrackingNumber = validateTrackingNumber(trackingInfo);

          if (!isValidTrackingNumber) {
            setManualTracking({
              fileIndex: i,
              fileName: file.name,
              show: true,
            });
            continue;
          }

          // Update progress for extraction step
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

          // Get tracker info
          const trackerResponse = await fetch(
            `/api/shipping/tracker/${trackingInfo.trackingNumber}?carrier=${trackingInfo.carrier}`
          );

          if (!trackerResponse.ok) {
            throw new Error("Failed to validate tracking number");
          }

          const tracker: Tracker = await trackerResponse.json();
          await saveTrackingInfo(tracker);

          // Update progress for extraction step
          updateFileProgress(file.name, {
            ...initialProgress,
            currentStep: "database",
            progress: 100,
            trackingInfo,
            steps: initialProgress.steps.map((step) =>
              step.id === "upload"
                ? { ...step, status: "complete" }
                : step.id === "extraction"
                ? { ...step, status: "complete" }
                : step.id === "tracking"
                ? { ...step, status: "complete" }
                : step.id === "database"
                ? { ...step, status: "complete" }
                : step
            ),
          });

          // Mark file as complete when done
          setTimeout(() => {
            markFileComplete(file.name);
          }, 1000);
        } catch (error) {
          console.error("Error processing file:", error);
          // Update progress to show error
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

      setFiles([]);
    } catch (error) {
      console.error("Upload error:", error);
      setError("Failed to upload one or more files. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Add helper function for tracking number validation
  const validateTrackingNumber = (trackingInfo: TrackingInfo) => {
    if (!trackingInfo.trackingNumber) return false;

    const formats = {
      UPS: /^1Z[A-Z0-9]{16}$/,
      FedEx: /^(\d{12}|\d{14,15})$/,
      USPS: /^(\d{20}|\d{26}|\d{30}|9\d{15,21})$/,
      DHL: /^[0-9]{10,12}$/,
    };

    const cleaned = trackingInfo.trackingNumber.replace(/\s+/g, "");
    const pattern = formats[trackingInfo.carrier];
    return pattern?.test(cleaned) ?? false;
  };



  const handleDelete = async (index: number) => {
    try {
      const filename = orderLabels[index];
      if (!filename) throw new Error("File not found");
      
      console.log("Deleting file:", filename, "for order:", orderId);

      const response = await fetch(`/api/shipping/pdf/${filename}`, {
        method: "DELETE",
      });

      if (response.ok) {
        console.log("Delete successful, updating store and state");
        removeLabel(orderId, filename);

        // Update current index if needed
        if (currentPdfIndex >= orderLabels.length - 1) {
          setCurrentPdfIndex(Math.max(0, orderLabels.length - 2));
        }
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      console.error("Delete error:", error);
      setError("Failed to delete the file. Please try again.");
    }
  };

  if (isLoading && orderLabels.length === 0) {
    return (
      <div className="w-full flex items-center justify-center"
           style={{ height: PREVIEW_HEIGHT }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/*╔═══╗ ═══════════════════════════════════════════════════════════ ╔═══╗
        ║ 📦 HEADER                                                         ║
        ╚═══╝ ═══════════════════════════════════════════════════════════ ╚═══╝*/}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 ring-1 ring-blue-400/30">
            <Barcode className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground leading-tight">
              Shipping Labels
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              Order {orderId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PillToggle
            active={activeTab}
            onChange={setActiveTab}
            disabledValues={pdfExists ? [] : ["view"]}
          />
          {item && <FedExBuyLabelDialog item={item} />}
        </div>
      </div>

      {/*╔═══╗ ═══════════════════════════════════════════════════════════ ╔═══╗
        ║ 🧱 LOCKED-HEIGHT CONTENT (toggle stays put across tabs)            ║
        ╚═══╝ ═══════════════════════════════════════════════════════════ ╚═══╝*/}
      <div className="flex flex-col" style={{ height: PREVIEW_HEIGHT }}>
        {/*╔═══╗ ═══════════════════════════════════════════════════════════ ╔═══╗
          ║ 👁️ VIEW PANEL                                                     ║
          ╚═══╝ ═══════════════════════════════════════════════════════════ ╚═══╝*/}
        {activeTab === "view" && (
          pdfExists && orderLabels.length > 0 ? (
            <div className="flex flex-col h-full gap-3">
              <div className="flex-1 min-h-0 rounded-xl overflow-hidden bg-background ring-1 ring-blue-500/20 shadow-[0_0_24px_-12px_rgba(59,130,246,0.45)]">
                <iframe
                  src={getLabelUrl(orderLabels[currentPdfIndex] || "")}
                  width="100%"
                  height="100%"
                  className="border-0"
                  title={`Shipping Label ${
                    currentPdfIndex + 1
                  } for Order ${orderId}`}
                />
              </div>
              {orderLabels.length > 1 && (
                <div className="flex justify-between items-center px-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setCurrentPdfIndex((prev) => Math.max(0, prev - 1))
                    }
                    disabled={currentPdfIndex === 0}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Label {currentPdfIndex + 1} of {orderLabels.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setCurrentPdfIndex((prev) =>
                        Math.min(orderLabels.length - 1, prev + 1)
                      )
                    }
                    disabled={currentPdfIndex === orderLabels.length - 1}
                  >
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <Alert className="max-w-md border-blue-500/30 bg-blue-500/5">
                <AlertCircle className="h-4 w-4 text-blue-400" />
                <AlertTitle>No Labels Found</AlertTitle>
                <AlertDescription>
                  No shipping labels have been uploaded for this order yet. You
                  can upload them in the Manage tab.
                </AlertDescription>
              </Alert>
            </div>
          )
        )}

        {/*╔═══╗ ═══════════════════════════════════════════════════════════ ╔═══╗
          ║ ⚙️ MANAGE PANEL                                                    ║
          ╚═══╝ ═══════════════════════════════════════════════════════════ ╚═══╝*/}
        {activeTab === "manage" && (
          <div className="flex flex-col h-full gap-4">
            {orderLabels.length > 0 && (
              <ScrollArea className="max-h-[180px] overflow-y-auto rounded-xl border border-blue-500/15 bg-gradient-to-b from-blue-500/[0.04] to-transparent">
                <div className="divide-y divide-border/60">
                  {orderLabels.map((filename: string, index: number) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3"
                    >
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/15 text-blue-300 text-xs font-semibold">
                          {index + 1}
                        </span>
                        Label {index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRetryExtraction(filename, index)
                          }
                          disabled={retryingFiles.has(filename)}
                        >
                          <RefreshCw
                            className={`mr-1.5 h-4 w-4 ${
                              retryingFiles.has(filename)
                                ? "animate-spin"
                                : ""
                            }`}
                          />
                          {retryingFiles.has(filename) ? "Reading…" : "Retry"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(getLabelUrl(filename), "_blank")
                          }
                        >
                          <Download className="mr-1.5 h-4 w-4" /> Download
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            handleDelete(index);
                          }}
                          className="text-red-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            <div
              className={cn(
                "flex-1 min-h-0 rounded-xl p-8 text-center transition-all bg-gradient-to-br relative overflow-hidden",
                dragActive
                  ? "from-blue-500/15 to-blue-600/10 ring-2 ring-blue-400/60"
                  : "from-blue-500/[0.04] to-transparent ring-1 ring-dashed ring-blue-500/25 hover:ring-blue-400/50"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                multiple
                className="hidden"
              />
              <Label
                htmlFor="pdf-upload"
                className="cursor-pointer h-full flex items-center justify-center"
              >
                <div className="flex flex-col items-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 ring-1 ring-blue-400/30">
                    <FileIcon className="h-7 w-7 text-blue-400" />
                  </div>
                  <p className="text-base font-semibold mb-1 text-foreground">
                    Drag & drop PDF files here
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    or click to select files
                  </p>
                  {files.length > 0 && (
                    <p className="text-sm font-medium text-blue-400">
                      {files.length} file(s) selected
                    </p>
                  )}
                </div>
              </Label>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-md shadow-blue-900/30 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-400 disabled:shadow-none"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" /> Upload Labels
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {manualTracking.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-secondary border-border">
            <CardHeader>
              <CardTitle>Enter Tracking Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>File: {manualTracking.fileName}</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="carrier">Carrier</Label>
                <select
                  id="carrier"
                  value={manualCarrier}
                  onChange={(e) =>
                    setManualCarrier(e.target.value as TrackingInfo["carrier"])
                  }
                  className="w-full p-2 border border-border bg-background text-foreground rounded-md"
                >
                  <option value="UPS">UPS</option>
                  <option value="FedEx">FedEx</option>
                  <option value="USPS">USPS</option>
                  <option value="DHL">DHL</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tracking">Tracking Number</Label>
                <Input
                  id="tracking"
                  value={manualTrackingNumber}
                  onChange={(e) => setManualTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={handleManualTrackingSubmit}
                  disabled={!manualTrackingNumber}
                  className="flex-1"
                >
                  Submit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setManualTracking({
                      fileIndex: -1,
                      fileName: "",
                      show: false,
                    });
                    setManualTrackingNumber("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 💊 PILL TOGGLE                                                        ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
function PillToggle({
  active,
  onChange,
  disabledValues = [],
}: {
  active: TabValue;
  onChange: (value: TabValue) => void;
  disabledValues?: TabValue[];
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-gray-900/60 p-1 ring-1 ring-inset ring-blue-500/20 backdrop-blur-sm">
      {TAB_VALUES.map((value) => {
        const isActive = active === value;
        const isDisabled = disabledValues.includes(value);
        const Icon = TAB_ICON[value];
        return (
          <button
            key={value}
            type="button"
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(value)}
            className={cn(
              "relative inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors",
              isActive
                ? "text-white"
                : "text-gray-400 hover:text-gray-200",
              isDisabled &&
                "opacity-40 cursor-not-allowed hover:text-gray-400"
            )}
          >
            {isActive && (
              <motion.span
                layoutId="view-label-pill"
                className="absolute inset-0 pointer-events-none"
                transition={{ type: "spring", stiffness: 480, damping: 36 }}
              >
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-md shadow-blue-900/40 animate-pill-squish" />
              </motion.span>
            )}
            <Icon className="relative z-10 h-3.5 w-3.5" />
            <span className="relative z-10">{TAB_LABEL[value]}</span>
          </button>
        );
      })}
    </div>
  );
}
