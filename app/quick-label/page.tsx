"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  FileIcon,
  ImageIcon,
  Printer,
  RotateCw,
  Upload,
  X,
} from "lucide-react";

const FONT_SIZE_PT = 64;
const LABEL_WIDTH_IN = 4;
const LABEL_HEIGHT_IN = 6;

type UploadKind = "image" | "pdf";
type Orientation = "portrait" | "landscape";

interface UploadedFile {
  file: File;
  url: string;
  kind: UploadKind;
}

export default function QuickLabelPage() {
  const [text, setText] = useState("");
  const [textOrientation, setTextOrientation] =
    useState<Orientation>("portrait");
  const [upload, setUpload] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (upload) URL.revokeObjectURL(upload.url);
    };
  }, [upload]);

  const handleFileSelected = (file: File | null) => {
    if (!file) return;
    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      alert("Please choose an image or PDF file.");
      return;
    }
    if (upload) URL.revokeObjectURL(upload.url);
    setUpload({
      file,
      url: URL.createObjectURL(file),
      kind: isPdf ? "pdf" : "image",
    });
  };

  const clearUpload = () => {
    if (upload) URL.revokeObjectURL(upload.url);
    setUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const printText = () => {
    if (!text.trim()) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups for this website");
      return;
    }

    const isLandscape = textOrientation === "landscape";
    const pageW = isLandscape ? LABEL_HEIGHT_IN : LABEL_WIDTH_IN;
    const pageH = isLandscape ? LABEL_WIDTH_IN : LABEL_HEIGHT_IN;

    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Quick Label</title>
          <style>
            @page {
              size: ${pageW}in ${pageH}in;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: ${pageW}in;
              height: ${pageH}in;
              display: flex;
              justify-content: center;
              align-items: center;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }
            .label {
              width: 100%;
              height: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              text-align: center;
              padding: 0.25in;
              box-sizing: border-box;
              font-size: ${FONT_SIZE_PT}pt;
              font-weight: 700;
              line-height: 1.1;
              white-space: pre-wrap;
              word-break: break-word;
            }
          </style>
        </head>
        <body>
          <div class="label">${escaped}</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const printImageFile = (url: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups for this website");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Quick Label</title>
          <style>
            @page { size: ${LABEL_WIDTH_IN}in ${LABEL_HEIGHT_IN}in; margin: 0; }
            html, body {
              margin: 0; padding: 0;
              width: ${LABEL_WIDTH_IN}in; height: ${LABEL_HEIGHT_IN}in;
              display: flex; justify-content: center; align-items: center;
            }
            img {
              max-width: 100%; max-height: 100%; object-fit: contain;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
            }
            @media print {
              html, body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              img { image-resolution: 300dpi; }
            }
          </style>
        </head>
        <body><img src="${url}" alt="Print"/></body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const printPdfFile = (url: string) => {
    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    iframe.src = url;
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // iframe contents may not allow direct print access
      }
      window.setTimeout(() => iframe.remove(), 60000);
    };
    document.body.appendChild(iframe);
  };

  const printUpload = () => {
    if (!upload) return;
    if (upload.kind === "pdf") {
      printPdfFile(upload.url);
    } else {
      printImageFile(upload.url);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <CardHeader className="text-center mb-8">
          <CardTitle className="text-4xl font-bold text-gray-900 dark:text-white">
            Quick Label
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Type text or upload a file and send it straight to the label
            printer.
          </p>
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="label-text">Label text</Label>
                <textarea
                  id="label-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type whatever you want on the label…"
                  className="w-full min-h-[180px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-3 text-base resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                  suppressHydrationWarning
                />
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm">Orientation</Label>
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-md p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setTextOrientation("portrait")}
                    className={`px-3 py-1.5 text-sm rounded transition ${
                      textOrientation === "portrait"
                        ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextOrientation("landscape")}
                    className={`px-3 py-1.5 text-sm rounded transition ${
                      textOrientation === "landscape"
                        ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    Landscape
                  </button>
                </div>
              </div>

              <div
                className={`mx-auto border border-gray-200 dark:border-gray-700 rounded-md bg-white text-black flex items-center justify-center text-center p-4 overflow-hidden ${
                  textOrientation === "landscape"
                    ? "w-[300px] h-[200px]"
                    : "w-[200px] h-[300px]"
                }`}
              >
                <div
                  className="w-full h-full flex items-center justify-center font-bold leading-tight whitespace-pre-wrap break-words"
                  style={{ fontSize: "24px" }}
                >
                  {text || (
                    <span className="text-gray-400 font-normal text-sm">
                      Preview
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setText("")}
                  disabled={!text}
                >
                  <RotateCw className="mr-1 h-4 w-4" />
                  Clear
                </Button>
                <Button
                  onClick={printText}
                  disabled={!text.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  <Printer className="mr-2 h-5 w-5" />
                  Print Label
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md">
            <CardContent className="p-6 space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) =>
                  handleFileSelected(e.target.files?.[0] ?? null)
                }
              />

              {!upload ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full min-h-[180px] rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex flex-col items-center justify-center gap-2 text-gray-600 dark:text-gray-300"
                >
                  <Upload className="h-8 w-8" />
                  <span className="font-medium">Click to choose a file</span>
                  <span className="text-xs text-gray-500">
                    PNG, JPG, or PDF
                  </span>
                </button>
              ) : (
                <div className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {upload.kind === "pdf" ? (
                      <FileIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    )}
                    <span className="truncate text-sm">{upload.file.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearUpload}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="mx-auto border border-gray-200 dark:border-gray-700 rounded-md bg-white overflow-hidden w-[200px] h-[300px] flex items-center justify-center">
                {upload ? (
                  upload.kind === "pdf" ? (
                    <embed
                      src={upload.url}
                      type="application/pdf"
                      className="w-full h-full"
                    />
                  ) : (
                    <img
                      src={upload.url}
                      alt="Label preview"
                      className="w-full h-full object-contain"
                    />
                  )
                ) : (
                  <span className="text-gray-400 font-normal text-sm">
                    Preview
                  </span>
                )}
              </div>

              <Button
                onClick={printUpload}
                disabled={!upload}
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Printer className="mr-2 h-5 w-5" />
                Print {upload?.kind === "pdf" ? "PDF" : "Label"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
