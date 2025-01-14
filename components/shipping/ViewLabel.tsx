"use client";

import { useState, useEffect, useCallback } from "react";
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
import { ColumnTitles, Item, Tracker } from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { useTrackingStore } from "@/stores/useTrackingStore";

type TrackingInfo = {
  trackingNumber: string;
  carrier: "FedEx" | "UPS" | "USPS" | "DHL";
  sender: string | null;
  receiver: string | null;
};

type UploadStep = {
  id: "upload" | "extraction" | "tracking" | "database";
  label: string;
  status: "waiting" | "processing" | "complete" | "error";
  message?: string;
};

type FileProgress = {
  file: File;
  currentStep: UploadStep["id"];
  steps: UploadStep[];
  progress: number;
};

type ManualTrackingInput = {
  fileIndex: number;
  fileName: string;
  show: boolean;
};

export function ViewLabel({ orderId }: { orderId: string }) {
  const [pdfExists, setPdfExists] = useState<boolean | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pdfUrls, setPdfUrls] = useState<string[]>([]);
  const [currentPdfIndex, setCurrentPdfIndex] = useState(0);
  const [fileProgresses, setFileProgresses] = useState<FileProgress[]>([]);
  const [manualTracking, setManualTracking] = useState<ManualTrackingInput>({
    fileIndex: -1,
    fileName: "",
    show: false,
  });
  const [manualTrackingNumber, setManualTrackingNumber] = useState("");
  const [manualCarrier, setManualCarrier] =
    useState<TrackingInfo["carrier"]>("UPS");
  const { board, updateItem } = useOrderStore();
  const { addTrackingInfo } = useTrackingStore();

  useEffect(() => {
    async function checkLabels() {
      const exists = await checkPdfExists(orderId);
      setPdfExists(exists);
      if (exists) {
        fetchPdfs();
      }
    }
    checkLabels();
  }, [orderId]);

  const checkPdfExists = async (orderId: string) => {
    try {
      const response = await fetch(`/api/shipping/pdfs/${orderId}`);
      if (response.ok) {
        const pdfList = await response.json();
        return pdfList.length > 0;
      }
      return false;
    } catch (error) {
      console.error("Error checking PDF existence:", error);
      return false;
    }
  };

  const fetchPdfs = async () => {
    try {
      const response = await fetch(`/api/shipping/pdfs/${orderId}`);
      if (response.ok) {
        const pdfList = await response.json();
        const urls = await Promise.all(
          pdfList.map(async (pdfName: string) => {
            const pdfResponse = await fetch(`/api/shipping/pdf/${pdfName}`);
            const blob = await pdfResponse.blob();
            return URL.createObjectURL(blob);
          })
        );
        setPdfUrls(urls);
      } else {
        throw new Error("Failed to fetch PDFs");
      }
    } catch (error) {
      console.error("Error fetching PDFs:", error);
      setError("Failed to load the PDFs. Please try again.");
    }
  };

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

  const updateItemLabels = async (orderId: string, hasLabel: boolean) => {
    if (!board) return;
    const initialItem = board?.items_page.items.find(
      (item) => item.id === orderId
    );
    if (!initialItem) return;

    const updatedItem: Item = {
      ...initialItem,
      values: initialItem.values.map((value) =>
        value.columnName === ColumnTitles.Labels
          ? { ...value, text: hasLabel.toString() }
          : value
      ),
    };
    updateItem(updatedItem, ColumnTitles.Labels);
  };

  const saveTrackingInfo = async (tracker: Tracker) => {
    try {
      await addTrackingInfo({
        orderId,
        trackers: [tracker],
      });

      if (!board) return;
      const initialItem = board?.items_page.items.find(
        (item) => item.id === orderId
      );
      if (!initialItem) return;

      const updatedItem: Item = {
        ...initialItem,
        values: initialItem.values.map((value) =>
          value.columnName === ColumnTitles.Labels
            ? { ...value, text: "true" }
            : value
        ),
      };
      updateItem(updatedItem, ColumnTitles.Labels);
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

      setFileProgresses((prev) =>
        prev.map((fp, idx) =>
          idx === fileIndex
            ? {
                ...fp,
                currentStep: "tracking",
                steps: fp.steps.map((step) =>
                  step.id === "extraction"
                    ? {
                        ...step,
                        status: "complete",
                        message: `${manualCarrier} - ${manualTrackingNumber} (manually entered)`,
                      }
                    : step.id === "tracking"
                    ? { ...step, status: "processing" }
                    : step
                ),
              }
            : fp
        )
      );

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

      setFileProgresses((prev) =>
        prev.map((fp, idx) =>
          idx === fileIndex
            ? {
                ...fp,
                currentStep: "database",
                steps: fp.steps.map((step) =>
                  step.id === "tracking"
                    ? { ...step, status: "complete" }
                    : step.id === "database"
                    ? { ...step, status: "complete" }
                    : step
                ),
                progress: 100,
              }
            : fp
        )
      );

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

      // Update progress to show error
      setFileProgresses((prev) =>
        prev.map((fp, idx) =>
          idx === fileIndex
            ? {
                ...fp,
                currentStep: "tracking",
                steps: fp.steps.map((step) =>
                  step.id === "tracking"
                    ? {
                        ...step,
                        status: "error",
                        message: "Invalid tracking number - please try again",
                      }
                    : step
                ),
              }
            : fp
        )
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

    // Initialize progress for each file
    setFileProgresses(
      files.map((file) => ({
        file,
        currentStep: "upload",
        progress: 0,
        steps: [
          { id: "upload", label: "Uploading label", status: "waiting" },
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
      }))
    );

    try {
      const existingLabels = await fetch(`/api/shipping/pdfs/${orderId}`);
      const existingLabelsList = await existingLabels.json();
      const startIndex = existingLabelsList.length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        // Update step status
        setFileProgresses((prev) =>
          prev.map((fp) =>
            fp.file === file
              ? {
                  ...fp,
                  currentStep: "upload",
                  steps: fp.steps.map((step) =>
                    step.id === "upload"
                      ? { ...step, status: "processing" }
                      : step
                  ),
                }
              : fp
          )
        );

        const formData = new FormData();
        formData.append("label", file);

        let filename;
        if (startIndex === 0 && i === 0) {
          filename = `${orderId}.pdf`;
        } else {
          filename = `${orderId}-${startIndex + i}.pdf`;
        }

        // Upload label
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

        // Update progress after upload
        setFileProgresses((prev) =>
          prev.map((fp) =>
            fp.file === file
              ? {
                  ...fp,
                  currentStep: "extraction",
                  steps: fp.steps.map((step) =>
                    step.id === "upload"
                      ? { ...step, status: "complete" }
                      : step.id === "extraction"
                      ? { ...step, status: "processing" }
                      : step
                  ),
                }
              : fp
          )
        );

        // Extract tracking info
        const trackingFormData = new FormData();
        trackingFormData.append("label", file);

        const trackingResponse = await fetch("/api/shipping/extract-tracking", {
          method: "POST",
          body: trackingFormData,
        });

        if (trackingResponse.ok) {
          const trackingInfo: TrackingInfo = await trackingResponse.json();
          console.log("Extracted tracking info:", trackingInfo);

          // Add validation for tracking number format
          const isValidTrackingNumber = (tn: string) => {
            if (!tn) return false;
            const formats = {
              UPS: /^1Z[A-Z0-9]{16}$/, // UPS format
              FedEx: /^(\d{12}|\d{14,15})$/, // FedEx format
              USPS: /^(\d{20}|\d{26}|\d{30}|9\d{15,21})$/, // USPS format
              DHL: /^[0-9]{10,12}$/, // DHL format
            };
            const cleaned = tn.replace(/\s+/g, "");
            const pattern = formats[trackingInfo.carrier];
            const isValid = pattern?.test(cleaned) ?? false;

            console.log("Tracking validation:", {
              original: tn,
              cleaned,
              carrier: trackingInfo.carrier,
              pattern: pattern?.toString(),
              isValid,
            });

            return isValid;
          };

          if (
            !trackingInfo.trackingNumber ||
            !isValidTrackingNumber(trackingInfo.trackingNumber)
          ) {
            console.log("Invalid tracking number detected:", {
              number: trackingInfo.trackingNumber,
              carrier: trackingInfo.carrier,
            });
            // Show manual entry dialog for this file
            setManualTracking({
              fileIndex: i,
              fileName: file.name,
              show: true,
            });

            setFileProgresses((prev) =>
              prev.map((fp, idx) =>
                idx === i
                  ? {
                      ...fp,
                      currentStep: "extraction",
                      steps: fp.steps.map((step) =>
                        step.id === "extraction"
                          ? {
                              ...step,
                              status: "error",
                              message: trackingInfo.trackingNumber
                                ? "Invalid tracking number format - please enter manually"
                                : "No tracking number found - please enter manually",
                            }
                          : step
                      ),
                    }
                  : fp
              )
            );
            continue; // Skip to next file
          }

          // Update progress after extraction with more details
          setFileProgresses((prev) =>
            prev.map((fp) =>
              fp.file === file
                ? {
                    ...fp,
                    currentStep: "tracking",
                    steps: fp.steps.map((step) =>
                      step.id === "extraction"
                        ? {
                            ...step,
                            status: "complete",
                            message: `${trackingInfo.carrier} - ${
                              trackingInfo.trackingNumber
                            }${
                              trackingInfo.sender
                                ? ` | From: ${trackingInfo.sender}`
                                : ""
                            }${
                              trackingInfo.receiver
                                ? ` | To: ${trackingInfo.receiver}`
                                : ""
                            }`,
                          }
                        : step.id === "tracking"
                        ? { ...step, status: "processing" }
                        : step
                    ),
                  }
                : fp
            )
          );

          // Add delay to keep progress visible
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Before calling the tracker API
          console.log("Calling tracker API with:", {
            trackingNumber: trackingInfo.trackingNumber,
            carrier: trackingInfo.carrier,
          });

          const trackerResponse = await fetch(
            `/api/shipping/tracker/${trackingInfo.trackingNumber}?carrier=${trackingInfo.carrier}`
          );

          if (!trackerResponse.ok) {
            const errorText = await trackerResponse.text();
            console.log("Tracker API error:", {
              status: trackerResponse.status,
              statusText: trackerResponse.statusText,
              response: errorText,
            });
            // Show manual entry dialog for this file
            setManualTracking({
              fileIndex: i,
              fileName: file.name,
              show: true,
            });

            setFileProgresses((prev) =>
              prev.map((fp, idx) =>
                idx === i
                  ? {
                      ...fp,
                      currentStep: "tracking",
                      steps: fp.steps.map((step) =>
                        step.id === "tracking"
                          ? {
                              ...step,
                              status: "error",
                              message:
                                "Invalid tracking number - please enter manually",
                            }
                          : step
                      ),
                    }
                  : fp
              )
            );
            continue; // Skip to next file
          }

          const tracker: Tracker = await trackerResponse.json();

          // Update progress before database update
          setFileProgresses((prev) =>
            prev.map((fp) =>
              fp.file === file
                ? {
                    ...fp,
                    currentStep: "database",
                    steps: fp.steps.map((step) =>
                      step.id === "tracking"
                        ? { ...step, status: "complete" }
                        : step.id === "database"
                        ? { ...step, status: "processing" }
                        : step
                    ),
                  }
                : fp
            )
          );

          await saveTrackingInfo(tracker);

          // Update progress after database update
          setFileProgresses((prev) =>
            prev.map((fp) =>
              fp.file === file
                ? {
                    ...fp,
                    steps: fp.steps.map((step) =>
                      step.id === "database"
                        ? { ...step, status: "complete" }
                        : step
                    ),
                    progress: 100,
                  }
                : fp
            )
          );
        }
      }

      setPdfExists(true);
      await fetchPdfs();
      await updateItemLabels(orderId, true);
      setFiles([]);
    } catch (error) {
      console.error("Upload error:", error);
      setError("Failed to upload one or more files. Please try again.");

      // Update progress to show error
      setFileProgresses((prev) =>
        prev.map((fp) => ({
          ...fp,
          steps: fp.steps.map((step) =>
            step.status === "processing" ? { ...step, status: "error" } : step
          ),
        }))
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (index: number) => {
    try {
      let filename;
      if (index === 0 && pdfUrls.length === 1) {
        filename = `${orderId}.pdf`;
      } else {
        filename = `${orderId}-${index}.pdf`;
      }

      const response = await fetch(`/api/shipping/pdf/${filename}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchPdfs();
        if (pdfUrls.length === 1) {
          setPdfExists(false);
          await updateItemLabels(orderId, false);
        }
        if (currentPdfIndex >= pdfUrls.length - 1) {
          setCurrentPdfIndex(Math.max(0, pdfUrls.length - 2));
        }
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      console.error("Delete error:", error);
      setError("Failed to delete the file. Please try again.");
    }
  };

  if (pdfExists === null) {
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
            {pdfExists && pdfUrls.length > 0 ? (
              <div className="space-y-4">
                <div
                  className="border rounded-lg overflow-hidden dark:border-gray-700"
                  style={{
                    height: "calc(100vh - 300px)",
                    minHeight: "400px",
                  }}
                >
                  <iframe
                    src={pdfUrls[currentPdfIndex]}
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
                    Label {currentPdfIndex + 1} of {pdfUrls.length}
                  </span>
                  <Button
                    onClick={() =>
                      setCurrentPdfIndex((prev) =>
                        Math.min(pdfUrls.length - 1, prev + 1)
                      )
                    }
                    disabled={currentPdfIndex === pdfUrls.length - 1}
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
              {pdfUrls.length > 0 && (
                <ScrollArea className="h-[200px] overflow-y-auto">
                  <div className="space-y-4">
                    {pdfUrls.map((url, index) => (
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
                            onClick={() => window.open(url, "_blank")}
                          >
                            <Download className="mr-2 h-4 w-4" /> Download
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(index)}
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
              {true && (
                <div className="space-y-2">
                  {fileProgresses.map((progress, index) => (
                    <UploadProgress key={index} progress={progress} />
                  ))}
                </div>
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

function UploadProgress({ progress }: { progress: FileProgress }) {
  return (
    <div className="space-y-4 my-4 p-4 border rounded-lg dark:border-gray-700">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm text-foreground">
          {progress.file.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {Math.round(progress.progress)}%
        </span>
      </div>
      <div className="space-y-2">
        {progress.steps.map((step) => (
          <div key={step.id} className="flex items-center space-x-3">
            {step.status === "waiting" && (
              <div className="h-2 w-2 rounded-full bg-muted" />
            )}
            {step.status === "processing" && (
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            )}
            {step.status === "complete" && (
              <svg
                className="h-4 w-4 text-green-500"
                fill="none"
                strokeWidth="2"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            {step.status === "error" && (
              <svg
                className="h-4 w-4 text-destructive"
                fill="none"
                strokeWidth="2"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
            <div className="flex-1">
              <span
                className={`text-sm ${
                  step.status === "processing"
                    ? "text-primary font-medium"
                    : step.status === "complete"
                    ? "text-muted-foreground"
                    : step.status === "error"
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
              {step.message && (
                <p className="text-xs text-muted-foreground mt-1 break-all">
                  {step.message}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
