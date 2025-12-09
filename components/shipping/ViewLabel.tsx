"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Download,
  Upload,
  File,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tracker } from "@/typings/types";
import { useTrackingStore } from "@/stores/useTrackingStore";
import { useUploadProgressStore } from "@/stores/useUploadProgressStore";
import { useShippingStore } from "@/stores/useShippingStore";
import { UploadStep, TrackingInfo, FileProgress } from "@/types/shipping";

type ManualTrackingInput = {
  fileIndex: number;
  fileName: string;
  show: boolean;
};

export function ViewLabel({
  orderId,
  onClose,
}: {
  orderId: string;
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
  const { addTrackingInfo } = useTrackingStore();
  const { updateFileProgress, markFileComplete } = useUploadProgressStore();
  const { labels, fetchAllLabels, removeLabel, addLabel, getLabelUrl, isLoading } = useShippingStore();
  const orderLabels = labels[orderId] || [];
  const pdfExists = orderLabels.length > 0;

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
      const existingLabelsList = await existingLabels.json();
      console.log("Existing labels:", existingLabelsList);

      // Modified logic for filename generation
      const getNextFilename = (existingFiles: string[]) => {
        // If no files exist yet, start with base filename
        if (existingFiles.length === 0) {
          return `${orderId}.pdf`;
        }

        // Find the highest number suffix
        const suffixes = existingFiles.map((filename) => {
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
      <Card className="w-full max-w-3xl mx-auto bg-background dark:bg-gray-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto bg-background dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-foreground dark:text-gray-100">
          Shipping Labels for Order {orderId}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs defaultValue={pdfExists ? "view" : "manage"} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 dark:bg-gray-700">
            <TabsTrigger value="view" disabled={!pdfExists}>
              View Labels
            </TabsTrigger>
            <TabsTrigger value="manage">Manage Labels</TabsTrigger>
          </TabsList>
          <TabsContent value="view">
            {pdfExists && orderLabels.length > 0 ? (
              <div className="space-y-4">
                <div
                  className="border rounded-lg overflow-hidden dark:border-gray-700"
                  style={{
                    height: "calc(100vh - 300px)",
                    minHeight: "400px",
                  }}
                >
                  <iframe
                    src={getLabelUrl(orderLabels[currentPdfIndex])}
                    width="100%"
                    height="100%"
                    className="border-0"
                    title={`Shipping Label ${
                      currentPdfIndex + 1
                    } for Order ${orderId}`}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <Button
                    onClick={() =>
                      setCurrentPdfIndex((prev) => Math.max(0, prev - 1))
                    }
                    disabled={currentPdfIndex === 0}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                  </Button>
                  <span className="text-sm font-medium text-foreground dark:text-gray-300">
                    Label {currentPdfIndex + 1} of {orderLabels.length}
                  </span>
                  <Button
                    onClick={() =>
                      setCurrentPdfIndex((prev) =>
                        Math.min(orderLabels.length - 1, prev + 1)
                      )
                    }
                    disabled={currentPdfIndex === orderLabels.length - 1}
                  >
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Labels Found</AlertTitle>
                <AlertDescription>
                  No shipping labels have been uploaded for this order yet. You
                  can upload them in the "Manage Labels" tab.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          <TabsContent value="manage">
            <div className="space-y-4">
              {orderLabels.length > 0 && (
                <ScrollArea className="h-[200px] overflow-y-auto">
                  <div className="space-y-4">
                    {orderLabels.map((filename: string, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-4 border rounded-lg dark:border-gray-700"
                      >
                        <span className="font-medium text-foreground dark:text-gray-200">
                          Label {index + 1}
                        </span>
                        <div className="space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              window.open(getLabelUrl(filename), "_blank")
                            }
                          >
                            <Download className="mr-2 h-4 w-4" /> Download
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              handleDelete(index);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center ${
                  dragActive
                    ? "border-primary bg-primary/10 dark:bg-primary/5"
                    : "border-muted-foreground/25 dark:border-gray-600"
                }`}
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
                <Label htmlFor="pdf-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center">
                    <File className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-lg font-semibold mb-2 text-foreground dark:text-gray-200">
                      Drag & Drop your PDF files here
                    </p>
                    <p className="text-sm text-muted-foreground mb-4 dark:text-gray-400">
                      or click to select files
                    </p>
                    {files.length > 0 && (
                      <p className="text-sm font-medium text-primary">
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
                className="w-full"
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
          </TabsContent>
        </Tabs>
      </CardContent>

      {manualTracking.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
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
                  className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
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
    </Card>
  );
}
