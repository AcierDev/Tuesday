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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRealmApp } from "@/hooks/useRealmApp";
import { ColumnTitles } from "@/typings/types";

export function ViewLabel({ orderId }: { orderId: string }) {
  const [pdfExists, setPdfExists] = useState<boolean | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pdfUrls, setPdfUrls] = useState<string[]>([]);
  const [currentPdfIndex, setCurrentPdfIndex] = useState(0);

  const { boardCollection: collection } = useRealmApp();

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
    if (collection) {
      try {
        const result = await collection.updateOne(
          { "items_page.items.id": orderId },
          {
            $set: {
              "items_page.items.$[elem].values.$[val].text":
                hasLabel.toString(),
            },
          },
          {
            arrayFilters: [
              { "elem.id": orderId },
              { "val.columnName": ColumnTitles.Labels },
            ],
          }
        );

        if (result.modifiedCount === 1) {
          console.log("Labels field updated successfully");
        } else {
          console.log("No document was updated");
        }
      } catch (error) {
        console.error("Error updating Labels field:", error);
      }
    } else {
      console.error("Collection is not available");
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select files to upload.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const existingLabels = await fetch(`/api/shipping/pdfs/${orderId}`);
      const existingLabelsList = await existingLabels.json();
      const startIndex = existingLabelsList.length;

      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("label", files[i]);

        let filename;
        if (startIndex === 0 && i === 0) {
          filename = `${orderId}.pdf`;
        } else {
          filename = `${orderId}-${startIndex + i}.pdf`;
        }

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

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      setPdfExists(true);
      await fetchPdfs();
      await updateItemLabels(orderId, true);
      setFiles([]);
    } catch (error) {
      console.error("Upload error:", error);
      setError("Failed to upload one or more files. Please try again.");
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
    <Card className="w-full max-w-3xl mx-auto bg-background dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-foreground dark:text-gray-100">
          Shipping Labels for Order {orderId}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs defaultValue={pdfExists ? "view" : "manage"} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
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
                  style={{ height: "calc(100vh - 300px)", minHeight: "400px" }}
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
              {uploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-xs text-muted-foreground text-center dark:text-gray-400">
                    {Math.round(uploadProgress)}% uploaded
                  </p>
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
    </Card>
  );
}
