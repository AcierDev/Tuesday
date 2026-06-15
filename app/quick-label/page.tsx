"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  FileIcon,
  ImageIcon,
  Loader2,
  Minus,
  Plus,
  Printer,
  RotateCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";

const LABEL_WIDTH_IN = 4;
const LABEL_HEIGHT_IN = 6;
const LABEL_PADDING_IN = 0.25; // printable margin inside each label
const CSS_PX_PER_IN = 96; // CSS reference pixels per inch (resolution-independent)
const LABEL_LINE_HEIGHT = 1.1;
const LABEL_FONT_FAMILY = `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
const MIN_FONT_PX = 6; // floor when text cannot fit even at the smallest size
const MAX_FONT_PX = 1000; // ceiling so a few characters can grow very large
const FIT_TOLERANCE_PX = 0.5; // rounding slack when testing overflow
const MIN_PAGES = 1;
const MAX_PAGES = 4;
const PREVIEW_PAGE_GAP_PX = 10; // gap drawn between page thumbnails in the preview
const PREVIEW_MAX_WIDTH_PX = 420; // preview is scaled to fit within these bounds
const PREVIEW_MAX_HEIGHT_PX = 300;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB ceiling for label uploads
const PRINT_WINDOW_CLOSE_FALLBACK_MS = 30_000;

type UploadKind = "image" | "pdf";
type Orientation = "portrait" | "landscape";

interface UploadedFile {
  file: File;
  url: string;
  kind: UploadKind;
  key: string;
}

interface SavedLabel {
  key: string;
  filename: string;
  size: number;
  uploadedAt: string | null;
}

function kindFromFilename(name: string): UploadKind {
  return name.toLowerCase().endsWith(".pdf") ? "pdf" : "image";
}

function proxyUrlForKey(key: string): string {
  return `/api/quick-labels?key=${encodeURIComponent(key)}`;
}

// Best-effort: API errors are JSON `{ error: string }`, but a proxy or
// network blip can return plain text or nothing. Fall back to status text so
// the user always sees a specific reason.
async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.clone().json();
    if (data && typeof data.error === "string") return data.error;
  } catch {
    // not JSON — keep going
  }
  try {
    const text = (await res.text()).trim();
    if (text) return text;
  } catch {
    // ignore
  }
  return res.statusText || `HTTP ${res.status}`;
}

// Drive print on document-ready and close on `afterprint` instead of fixed
// setTimeouts — fixed delays race on slow devices and trim print dialogs on
// fast ones. Falls back to a long timer in case `afterprint` never fires.
function printAndCloseWindow(printWindow: Window): void {
  const closeWindow = () => {
    try {
      printWindow.close();
    } catch {
      // window already closed
    }
  };
  const fallback = window.setTimeout(
    closeWindow,
    PRINT_WINDOW_CLOSE_FALLBACK_MS
  );
  printWindow.addEventListener("afterprint", () => {
    window.clearTimeout(fallback);
    closeWindow();
  });
  const triggerPrint = () => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch (err) {
      console.error("Print failed", err);
      window.clearTimeout(fallback);
      closeWindow();
    }
  };
  if (printWindow.document.readyState === "complete") {
    triggerPrint();
  } else {
    printWindow.addEventListener("load", triggerPrint, { once: true });
  }
}

// Binary-search the largest font size (in CSS px) at which `text` still fits
// inside `pages` label pages of the given content box. Multi-page labels flow
// the text across pages, so the usable height grows with the page count minus a
// one-line allowance per page break (a line can't straddle a page boundary).
function fitFontPx({
  text,
  contentWidthPx,
  contentHeightPx,
  pages,
}: {
  text: string;
  contentWidthPx: number;
  contentHeightPx: number;
  pages: number;
}): number {
  if (typeof document === "undefined" || !text.trim()) return 0;

  const measurer = document.createElement("div");
  measurer.style.cssText = [
    "position: absolute",
    "left: -99999px",
    "top: 0",
    "visibility: hidden",
    `width: ${contentWidthPx}px`,
    "font-weight: 700",
    `line-height: ${LABEL_LINE_HEIGHT}`,
    "white-space: pre-wrap",
    "word-break: break-word",
    "overflow-wrap: anywhere",
    "text-align: center",
    `font-family: ${LABEL_FONT_FAMILY}`,
  ].join(";");
  measurer.textContent = text;
  document.body.appendChild(measurer);

  const fits = (size: number): boolean => {
    measurer.style.fontSize = `${size}px`;
    const usableHeight =
      pages * contentHeightPx - (pages - 1) * size * LABEL_LINE_HEIGHT;
    return (
      measurer.scrollWidth <= contentWidthPx + FIT_TOLERANCE_PX &&
      measurer.scrollHeight <= usableHeight + FIT_TOLERANCE_PX
    );
  };

  let lo = MIN_FONT_PX;
  let hi = MAX_FONT_PX;
  let best = MIN_FONT_PX;
  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  document.body.removeChild(measurer);
  return Math.floor(best);
}

// True-to-print preview: draws each label page to scale and flows the text
// across them with CSS multi-column (column-fill: auto matches page-by-page
// filling), then scales the whole thing down to fit inside the card.
function LabelPreview({
  pages,
  pageWidthIn,
  pageHeightIn,
  fontPx,
  text,
}: {
  pages: number;
  pageWidthIn: number;
  pageHeightIn: number;
  fontPx: number;
  text: string;
}) {
  const pageWpx = pageWidthIn * CSS_PX_PER_IN;
  const pageHpx = pageHeightIn * CSS_PX_PER_IN;
  const padPx = LABEL_PADDING_IN * CSS_PX_PER_IN;
  const contentWpx = pageWpx - 2 * padPx;
  const contentHpx = pageHpx - 2 * padPx;

  const stageWpx = pages * pageWpx + (pages - 1) * PREVIEW_PAGE_GAP_PX;
  const stageHpx = pageHpx;
  const scale = Math.min(
    PREVIEW_MAX_WIDTH_PX / stageWpx,
    PREVIEW_MAX_HEIGHT_PX / stageHpx,
    1
  );

  const textStyle: CSSProperties = {
    fontSize: `${fontPx}px`,
    fontWeight: 700,
    lineHeight: LABEL_LINE_HEIGHT,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    textAlign: "center",
    fontFamily: LABEL_FONT_FAMILY,
    color: "#000",
  };

  return (
    <div
      style={{
        width: stageWpx * scale,
        height: stageHpx * scale,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: stageWpx,
          height: stageHpx,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {Array.from({ length: pages }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 0,
              left: i * (pageWpx + PREVIEW_PAGE_GAP_PX),
              width: pageWpx,
              height: pageHpx,
              background: "#fff",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              boxSizing: "border-box",
            }}
          />
        ))}

        {pages === 1 ? (
          <div
            style={{
              position: "absolute",
              top: padPx,
              left: padPx,
              width: contentWpx,
              height: contentHpx,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ ...textStyle, width: "100%" }}>{text}</div>
          </div>
        ) : (
          <div
            style={{
              position: "absolute",
              top: padPx,
              left: padPx,
              width: stageWpx - 2 * padPx,
              height: contentHpx,
              columnWidth: `${contentWpx}px`,
              columnGap: `${pageWpx - contentWpx + PREVIEW_PAGE_GAP_PX}px`,
              columnFill: "auto",
              overflow: "hidden",
              ...textStyle,
            }}
          >
            {text}
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuickLabelPage() {
  const [text, setText] = useState("");
  const [textOrientation, setTextOrientation] =
    useState<Orientation>("portrait");
  const [pages, setPages] = useState(1);
  const [previewFontPx, setPreviewFontPx] = useState(0);
  const [upload, setUpload] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savedLabels, setSavedLabels] = useState<SavedLabel[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLandscape = textOrientation === "landscape";
  const pageWidthIn = isLandscape ? LABEL_HEIGHT_IN : LABEL_WIDTH_IN;
  const pageHeightIn = isLandscape ? LABEL_WIDTH_IN : LABEL_HEIGHT_IN;
  const contentWidthPx = (pageWidthIn - 2 * LABEL_PADDING_IN) * CSS_PX_PER_IN;
  const contentHeightPx = (pageHeightIn - 2 * LABEL_PADDING_IN) * CSS_PX_PER_IN;

  useEffect(() => {
    return () => {
      if (upload) URL.revokeObjectURL(upload.url);
    };
  }, [upload]);

  // Recompute the auto-fit size whenever the text, orientation, or page count
  // changes so the preview always shows the size that will actually print.
  useEffect(() => {
    setPreviewFontPx(
      fitFontPx({ text, contentWidthPx, contentHeightPx, pages })
    );
  }, [text, contentWidthPx, contentHeightPx, pages]);

  const refreshSavedLabels = async () => {
    try {
      const res = await fetch("/api/quick-labels", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { items: SavedLabel[] };
      setSavedLabels(json.items);
    } catch (err) {
      console.error("Failed to list saved labels", err);
    } finally {
      setSavedLoading(false);
    }
  };

  useEffect(() => {
    refreshSavedLabels();
  }, []);

  const handleFileSelected = async (file: File | null) => {
    if (!file) return;
    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      alert("Please choose an image or PDF file.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      const limitMb = (MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0);
      alert(`File is ${mb} MB; the limit is ${limitMb} MB.`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/quick-labels", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const reason = await readErrorMessage(res);
        alert(`Upload failed: ${reason}`);
        return;
      }
      const saved = (await res.json()) as SavedLabel;
      if (upload) URL.revokeObjectURL(upload.url);
      setUpload({
        file,
        url: URL.createObjectURL(file),
        kind: isPdf ? "pdf" : "image",
        key: saved.key,
      });
      refreshSavedLabels();
    } catch (err) {
      console.error("Upload failed", err);
      const message = err instanceof Error ? err.message : "Network error";
      alert(`Upload failed: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const clearUpload = () => {
    if (upload) URL.revokeObjectURL(upload.url);
    setUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteSavedLabel = async (key: string) => {
    if (!confirm("Delete this saved label?")) return;
    setDeletingKey(key);
    try {
      const res = await fetch(
        `/api/quick-labels?key=${encodeURIComponent(key)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const reason = await readErrorMessage(res);
        alert(`Delete failed: ${reason}`);
        return;
      }
      setSavedLabels((prev) => prev.filter((s) => s.key !== key));
      if (upload?.key === key) clearUpload();
    } catch (err) {
      console.error("Delete failed", err);
      const message = err instanceof Error ? err.message : "Network error";
      alert(`Delete failed: ${message}`);
    } finally {
      setDeletingKey(null);
    }
  };

  const printSavedLabel = (saved: SavedLabel) => {
    const url = proxyUrlForKey(saved.key);
    if (kindFromFilename(saved.filename) === "pdf") {
      printPdfFile(url);
    } else {
      printImageFile(url);
    }
  };

  const printText = () => {
    if (!text.trim()) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups for this website");
      return;
    }

    const fontPx = fitFontPx({
      text,
      contentWidthPx,
      contentHeightPx,
      pages,
    });

    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const textCss = `
      font-size: ${fontPx}px;
      font-weight: 700;
      line-height: ${LABEL_LINE_HEIGHT};
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
      text-align: center;
    `;

    // One page: a flex-centered label. Multiple pages: a single block that the
    // browser flows across pages (per-page margins via @page), so the text
    // continues onto the next label and the fitted size fills them all.
    const style =
      pages > 1
        ? `
          @page { size: ${pageWidthIn}in ${pageHeightIn}in; margin: ${LABEL_PADDING_IN}in; }
          html, body { margin: 0; padding: 0; font-family: ${LABEL_FONT_FAMILY}; }
          .flow { ${textCss} }
          @media print {
            html, body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `
        : `
          @page { size: ${pageWidthIn}in ${pageHeightIn}in; margin: 0; }
          html, body {
            margin: 0;
            padding: 0;
            width: ${pageWidthIn}in;
            height: ${pageHeightIn}in;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: ${LABEL_FONT_FAMILY};
          }
          .label {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: ${LABEL_PADDING_IN}in;
            box-sizing: border-box;
            ${textCss}
          }
          @media print {
            html, body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `;

    const content =
      pages > 1
        ? `<div class="flow">${escaped}</div>`
        : `<div class="label">${escaped}</div>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Quick Label</title>
          <style>${style}</style>
        </head>
        <body>${content}</body>
      </html>
    `);

    printWindow.document.close();
    printAndCloseWindow(printWindow);
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
    printAndCloseWindow(printWindow);
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
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-950 text-black dark:text-white">
      <div className="select-none bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-full mx-auto px-2 sm:px-3 lg:px-4">
          <div className="flex items-center gap-3 py-3 sm:min-w-[220px]">
            <span className="hidden sm:block h-7 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
            <h1 className="heading-tool">
              Quick Labels
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <Card className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md flex flex-col">
            <CardContent className="p-6 flex-1 flex flex-col gap-4">
              <textarea
                id="label-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type whatever you want on the label…"
                className="w-full h-[180px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                suppressHydrationWarning
              />

              <div className="flex items-center gap-2 h-9">
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

              <div className="flex items-center gap-2 h-9">
                <Label className="text-sm">Pages</Label>
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-md p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setPages((p) => Math.max(MIN_PAGES, p - 1))}
                    disabled={pages <= MIN_PAGES}
                    aria-label="Remove page"
                    className="px-2 py-1.5 rounded bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100 flex items-center justify-center disabled:opacity-40 disabled:shadow-none disabled:bg-transparent"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-1 text-sm tabular-nums w-4 text-center">
                    {pages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPages((p) => Math.min(MAX_PAGES, p + 1))}
                    disabled={pages >= MAX_PAGES}
                    aria-label="Add page"
                    className="px-2 py-1.5 rounded bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100 flex items-center justify-center disabled:opacity-40 disabled:shadow-none disabled:bg-transparent"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {pages > 1 && (
                  <span className="text-xs text-gray-500">
                    text fills all {pages} pages
                  </span>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center">
                {text.trim() ? (
                  <LabelPreview
                    pages={pages}
                    pageWidthIn={pageWidthIn}
                    pageHeightIn={pageHeightIn}
                    fontPx={previewFontPx}
                    text={text}
                  />
                ) : (
                  <div
                    className={`border border-gray-200 dark:border-gray-700 rounded-md bg-white flex items-center justify-center ${
                      isLandscape ? "w-[300px] h-[200px]" : "w-[200px] h-[300px]"
                    }`}
                  >
                    <span className="text-gray-400 font-normal text-sm">
                      Preview
                    </span>
                  </div>
                )}
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
                  {pages > 1 ? `Print ${pages} Pages` : "Print Label"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md flex flex-col">
            <CardContent className="p-6 flex-1 flex flex-col gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) =>
                  handleFileSelected(e.target.files?.[0] ?? null)
                }
              />

              <div className="h-[180px]">
                {!upload ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full h-full rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex flex-col items-center justify-center gap-2 text-gray-600 dark:text-gray-300 disabled:opacity-60"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="font-medium">Uploading…</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8" />
                        <span className="font-medium">
                          Click to choose a file
                        </span>
                        <span className="text-xs text-gray-500">
                          PNG, JPG, or PDF · saved so other computers can print
                        </span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3 rounded-md border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex items-center gap-2 min-w-0 max-w-full">
                      {upload.kind === "pdf" ? (
                        <FileIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      )}
                      <span className="truncate text-sm">{upload.file.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={clearUpload}>
                      <X className="mr-1 h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              {/* Spacers matching the left card's Orientation + Pages rows so previews align */}
              <div className="h-9" aria-hidden />
              <div className="h-9" aria-hidden />

              <div className="flex-1 flex items-center justify-center">
                <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white overflow-hidden w-[200px] h-[300px] flex items-center justify-center">
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

        <Card className="mt-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-semibold">Saved labels</h2>
              <span className="text-xs text-gray-500">
                Available on every computer
              </span>
            </div>
            {savedLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : savedLabels.length === 0 ? (
              <p className="text-sm text-gray-500 py-6">
                No labels saved yet.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {savedLabels.map((s) => {
                  const kind = kindFromFilename(s.filename);
                  const uploaded = s.uploadedAt
                    ? new Date(s.uploadedAt).toLocaleString()
                    : "";
                  return (
                    <li
                      key={s.key}
                      className="flex items-center gap-3 py-2"
                    >
                      {kind === "pdf" ? (
                        <FileIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {s.filename}
                        </div>
                        <div className="text-xs text-gray-500">{uploaded}</div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => printSavedLabel(s)}
                        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                      >
                        <Printer className="mr-1 h-4 w-4" />
                        Print
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSavedLabel(s.key)}
                        disabled={deletingKey === s.key}
                      >
                        {deletingKey === s.key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
