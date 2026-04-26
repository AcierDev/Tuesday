"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Printer, ImageIcon, FileIcon } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

// This would be replaced with your actual JPEG templates
const TEMPLATES = [
  {
    id: 1,
    name: "Drywall Anchors",
    src: "/images/drywall-anchors.png",
    orientation: "landscape",
    type: "image",
  },
  {
    id: 2,
    name: "Hanging Examples",
    src: "/images/hanging-examples.png",
    orientation: "portrait",
    type: "image",
  },
  {
    id: 9,
    name: "Fragile Stickers",
    src: "/images/fragile-stickers.jpg",
    orientation: "portrait",
    type: "image",
  },
  {
    id: 3,
    name: "2 Boxes",
    src: "/pdf/2-boxes.pdf",
    orientation: "portrait",
    type: "pdf",
  },
  {
    id: 4,
    name: "2 Panels",
    src: "/pdf/2-panels.pdf",
    orientation: "portrait",
    type: "pdf",
  },
  {
    id: 5,
    name: "3 Boxes",
    src: "/pdf/3-boxes.pdf",
    orientation: "portrait",
    type: "pdf",
  },
  {
    id: 6,
    name: "3 Panels",
    src: "/pdf/3-panels.pdf",
    orientation: "portrait",
    type: "pdf",
  },
  {
    id: 7,
    name: "4 Boxes",
    src: "/pdf/4-boxes.pdf",
    orientation: "portrait",
    type: "pdf",
  },
  {
    id: 8,
    name: "4 Panels",
    src: "/pdf/4-panels.pdf",
    orientation: "portrait",
    type: "pdf",
  },
  {
    id: 21,
    name: "",
    src: "/pdf/i-dont-do-anything.pdf",
    orientation: "portrait",
    type: "pdf",
  },
  {
    id: 20,
    name: "5 Panels",
    src: "/pdf/5-panels.pdf",
    orientation: "portrait",
    type: "pdf",
  },
  {
    id: 22,
    name: "2 Panels (Vertical)",
    src: "/pdf/vertical-2-panels.pdf",
    orientation: "portrait",
    type: "pdf",
  },
  {
    id: 23,
    name: "3 Panels (Vertical)",
    src: "/pdf/vertical-3-panels.pdf",
    orientation: "portrait",
    type: "pdf",
  },
  {
    id: 24,
    name: "4 Panels (Vertical)",
    src: "/pdf/vertical-4-panels.pdf",
    orientation: "portrait",
    type: "pdf",
  },
  {
    id: 25,
    name: "5 Panels (Vertical)",
    src: "/pdf/vertical-5-panes.pdf",
    orientation: "portrait",
    type: "pdf",
  },
];

type TabKey = "images" | "pdfs";

const TABS: { value: TabKey; label: string; icon: typeof ImageIcon }[] = [
  { value: "images", label: "Labels", icon: ImageIcon },
  { value: "pdfs", label: "PDFs", icon: FileIcon },
];

export default function LabelPrinter() {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]!.id);
  const [activeTab, setActiveTab] = useState<TabKey>("images");
  const printRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);

  useEffect(() => {
    const selectedTemplateData = TEMPLATES.find(
      (t) => t.id === selectedTemplate
    );
    if (selectedTemplateData?.type === "pdf") {
      setPdfLoaded(false);
      if (iframeRef.current) {
        iframeRef.current.src = selectedTemplateData.src;
        iframeRef.current.onload = () => setPdfLoaded(true);
      }
    }
  }, [selectedTemplate]);

  const handlePrint = () => {
    const selectedTemplateData = TEMPLATES.find(
      (t) => t.id === selectedTemplate
    );
    if (!selectedTemplateData) return;

    if (selectedTemplateData.type === "pdf") {
      if (iframeRef.current && pdfLoaded) {
        iframeRef.current.contentWindow?.print();
      } else {
        alert("PDF is still loading. Please try again in a moment.");
      }
    } else {
      const content = printRef.current;
      if (!content) return;

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Please allow popups for this website");
        return;
      }

      const isLandscape = selectedTemplateData.orientation === "landscape";

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Print High-Quality Label</title>
            <style>
              @page {
                size: ${isLandscape ? "6in 4in" : "4in 6in"};
                margin: 0;
              }
              html, body {
                margin: 0;
                padding: 0;
                width: ${isLandscape ? "6in" : "4in"};
                height: ${isLandscape ? "4in" : "6in"};
                display: flex;
                justify-content: center;
                align-items: center;
              }
              img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
              }
              @media print {
                html, body {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                img {
                  image-resolution: 300dpi;
                }
              }
            </style>
          </head>
          <body>
            ${content.innerHTML}
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const selectedTemplateData = TEMPLATES.find((t) => t.id === selectedTemplate);
  const imageTemplates = TEMPLATES.filter((t) => t.type === "image");
  const pdfTemplates = TEMPLATES.filter((t) => t.type === "pdf");

  const renderImageGrid = (templates: typeof TEMPLATES) => (
    <div className="grid grid-cols-2 gap-4">
      {templates.map((template) => (
        <motion.div
          key={template.id}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className={`cursor-pointer rounded-xl overflow-hidden ring-1 ring-inset transition-all ${
            selectedTemplate === template.id
              ? "ring-2 ring-blue-500 shadow-lg shadow-blue-500/20"
              : "ring-gray-200/70 dark:ring-gray-700/60 hover:ring-blue-300 dark:hover:ring-blue-700"
          }`}
          onClick={() => setSelectedTemplate(template.id)}
        >
          <Image
            src={template.src}
            alt={template.name}
            width={200}
            height={150}
            className="w-full h-32 object-cover"
          />
          <div className="p-2 text-center text-sm font-medium">
            {template.name}
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderPdfTile = (template: (typeof TEMPLATES)[number]) => (
    <motion.div
      key={template.id}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className={`cursor-pointer p-4 rounded-xl ring-1 ring-inset transition-all ${
        selectedTemplate === template.id
          ? "ring-2 ring-blue-500 shadow-lg shadow-blue-500/20"
          : "ring-gray-200/70 dark:ring-gray-700/60 hover:ring-blue-300 dark:hover:ring-blue-700"
      }`}
      onClick={() => setSelectedTemplate(template.id)}
    >
      <FileIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
      <div className="text-center font-medium">{template.name}</div>
    </motion.div>
  );

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-950 text-black dark:text-white">
      <div className="select-none bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-full mx-auto px-2 sm:px-3 lg:px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3 sm:flex-shrink-0 sm:min-w-[220px]">
              <span className="hidden sm:block h-7 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight bg-gradient-to-br from-gray-900 to-blue-700 dark:from-white dark:to-blue-300 bg-clip-text text-transparent [-webkit-text-fill-color:transparent] [forced-color-adjust:none]">
                Label Printing
              </h1>
            </div>

            {/* Tab toggle — sliding pill, matches the type toggle on Orders. */}
            <div className="flex justify-center sm:flex-1 sm:min-w-0">
              <ToggleGroup
                type="single"
                value={activeTab}
                onValueChange={(value) => {
                  if (value) setActiveTab(value as TabKey);
                }}
                className="inline-flex flex-wrap justify-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800/60 p-1 ring-1 ring-inset ring-gray-200/60 dark:ring-gray-700/60"
              >
                {TABS.map(({ value, label, icon: Icon }) => {
                  const isActive = activeTab === value;
                  return (
                    <ToggleGroupItem
                      key={value}
                      value={value}
                      aria-label={`Show ${label}`}
                      className="relative h-8 px-4 rounded-full text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-gray-200 hover:bg-transparent data-[state=on]:bg-transparent data-[state=on]:shadow-none data-[state=on]:text-gray-900 dark:data-[state=on]:text-white"
                    >
                      {isActive && (
                        <motion.span
                          layoutId="print-tab-pill"
                          className="absolute inset-0 pointer-events-none"
                          transition={{
                            type: "spring",
                            stiffness: 480,
                            damping: 36,
                          }}
                        >
                          <span className="absolute inset-0 bg-white dark:bg-gray-700 rounded-full shadow-sm animate-pill-squish" />
                        </motion.span>
                      )}
                      <span className="relative z-10 inline-flex items-center gap-1.5">
                        <Icon className="h-4 w-4" />
                        {label}
                      </span>
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </div>

            <div className="hidden sm:block sm:min-w-[220px]" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template Selection Panel */}
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              {activeTab === "images" && renderImageGrid(imageTemplates)}
              {activeTab === "pdfs" && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                      Standard
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {pdfTemplates
                        .filter((t) => !t.name.includes("(Vertical)"))
                        .map(renderPdfTile)}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                      Vertical
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {pdfTemplates
                        .filter((t) => t.name.includes("(Vertical)"))
                        .map(renderPdfTile)}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="aspect-[4/6] relative rounded-xl overflow-hidden ring-1 ring-inset ring-gray-200/70 dark:ring-gray-700/60">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedTemplate}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full h-full"
                    >
                      {selectedTemplateData?.type === "pdf" ? (
                        <embed
                          src={selectedTemplateData.src}
                          type="application/pdf"
                          className="w-full h-full"
                        />
                      ) : (
                        <Image
                          src={selectedTemplateData?.src || ""}
                          alt="Selected template"
                          fill
                          className="object-contain"
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <Button
                  onClick={handlePrint}
                  disabled={
                    selectedTemplateData?.type === "pdf" && !pdfLoaded
                  }
                  className="w-full h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-600/30 active:translate-y-0 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  <Printer className="mr-2 h-5 w-5" />
                  Print {selectedTemplateData?.type === "pdf" ? "PDF" : "Label"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hidden elements for printing */}
        <div ref={printRef} style={{ display: "none" }}>
          {selectedTemplateData?.type === "image" && (
            <Image
              src={selectedTemplateData.src}
              alt="Print template"
              width={1200}
              height={800}
              className="w-full h-auto"
            />
          )}
        </div>
        <iframe
          ref={iframeRef}
          style={{ display: "none" }}
          title="PDF Print Frame"
        />
      </div>
    </div>
  );
}
