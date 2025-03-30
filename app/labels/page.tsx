"use client";

import { useState, useEffect } from "react";
import { Upload, File, X, Send, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ShippingLabelUpload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const fetchUploadedFiles = async () => {
    try {
      const response = await fetch("http://144.172.71.72:3003/pdfs");
      if (response.ok) {
        const files = await response.json();
        setUploadedFiles(files);
      } else {
        throw new Error("Failed to fetch uploaded files");
      }
    } catch (error) {
      toast.error("Failed to fetch uploaded files. Please try again.");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files).filter(
        (file) => file.type === "application/pdf"
      );
      setSelectedFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one PDF file to upload.");
      return;
    }

    setIsUploading(true);

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append("label", file);

      try {
        const response = await fetch("http://144.172.71.72:3003/upload-label", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const result = await response.text();
          toast.success(result);
        } else {
          throw new Error("Upload failed");
        }
      } catch (error) {
        toast.error(
          "There was an error uploading your file. Please try again."
        );
      }
    }

    setIsUploading(false);
    setSelectedFiles([]);
    fetchUploadedFiles();
  };

  const handleDownload = async (filename: string) => {
    try {
      const response = await fetch(`http://144.172.71.72:3003/pdf/${filename}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error("Download failed");
      }
    } catch (error) {
      toast.error("Failed to download the file. Please try again.");
    }
  };

  return (
    <>
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Upload Shipping Labels</CardTitle>
          <CardDescription>
            Select and upload PDF shipping labels to the server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="dropzone-file"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    PDF files only
                  </p>
                </div>
                <Input
                  id="dropzone-file"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf"
                  multiple
                />
              </label>
            </div>
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Selected Files:</h3>
                <ul className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-100 rounded"
                    >
                      <div className="flex items-center">
                        <File className="w-5 h-5 mr-2" />
                        <span className="text-sm">{file.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleUpload}
            disabled={isUploading || selectedFiles.length === 0}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Send className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Upload Files
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card className="w-full max-w-3xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>Uploaded Files</CardTitle>
          <CardDescription>
            View and download previously uploaded PDF files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploadedFiles.map((filename) => (
                <TableRow key={filename}>
                  <TableCell>{filename}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(filename)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
