"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Printer, ImageIcon, FileIcon, History } from "lucide-react";
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
    id: 10,
    name: "Hanging Examples OLD",
    src: "/images/hanging-examples-old.png",
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
    id: 10,
    name: "14x7",
    src: "/images/box-sizes/14x7.jpg",
    orientation: "portrait",
    type: "image",
  },
  {
    id: 11,
    name: "16x6",
    src: "/images/box-sizes/16x6.jpg",
    orientation: "portrait",
    type: "image",
  },
  {
    id: 12,
    name: "16x10",
    src: "/images/box-sizes/16x10.jpg",
    orientation: "portrait",
    type: "image",
  },
  {
    id: 13,
    name: "20x10",
    src: "/images/box-sizes/20x10.jpg",
    orientation: "portrait",
    type: "image",
  },
  {
    id: 14,
    name: "20x12",
    src: "/images/box-sizes/20x12.jpg",
    orientation: "portrait",
    type: "image",
  },
  {
    id: 15,
    name: "24x10",
    src: "/images/box-sizes/24x10.jpg",
    orientation: "portrait",
    type: "image",
  },
  {
    id: 16,
    name: "24x12",
    src: "/images/box-sizes/24x12.jpg",
    orientation: "portrait",
    type: "image",
  },
  {
    id: 17,
    name: "28x12",
    src: "/images/box-sizes/28x12.jpg",
    orientation: "portrait",
    type: "image",
  },
  {
    id: 18,
    name: "28x16",
    src: "/images/box-sizes/28x16.jpg",
    orientation: "portrait",
    type: "image",
  },
  {
    id: 19,
    name: "36x16",
    src: "/images/box-sizes/36x16.jpg",
    orientation: "portrait",
    type: "image",
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

export default function LabelPrinter() {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]!.id);
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
  const imageTemplates = TEMPLATES.filter(
    (t) => t.type === "image" && !/^\d+x\d+$/.test(t.name)
  );
  const boxTemplates = TEMPLATES.filter(
    (t) => t.type === "image" && /^\d+x\d+$/.test(t.name)
  );
  const pdfTemplates = TEMPLATES.filter((t) => t.type === "pdf");

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <CardHeader className="text-center mb-8">
          <CardTitle className="text-4xl font-bold text-gray-900 dark:text-white">
            Label Printing Station
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Professional-grade printing for your shipping needs
          </p>
        </CardHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Template Selection Panel */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md">
            <CardContent className="p-6">
              <Tabs defaultValue="images" className="space-y-6">
                <TabsList className="w-full">
                  <TabsTrigger value="images" className="w-1/3">
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Labels
                  </TabsTrigger>
                  <TabsTrigger value="boxes" className="w-1/3">
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Box Sizes
                  </TabsTrigger>
                  <TabsTrigger value="pdfs" className="w-1/3">
                    <FileIcon className="mr-2 h-4 w-4" />
                    PDFs
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="images" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {imageTemplates.map((template) => (
                      <motion.div
                        key={template.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          selectedTemplate === template.id
                            ? "border-blue-500 shadow-lg"
                            : "border-transparent"
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
                </TabsContent>

                <TabsContent value="boxes" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {boxTemplates.map((template) => (
                      <motion.div
                        key={template.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          selectedTemplate === template.id
                            ? "border-blue-500 shadow-lg"
                            : "border-transparent"
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
                </TabsContent>

                <TabsContent value="pdfs" className="space-y-4">
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">
                        Standard
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {pdfTemplates
                          .filter((t) => !t.name.includes("(Vertical)"))
                          .map((template) => (
                            <motion.div
                              key={template.id}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                                selectedTemplate === template.id
                                  ? "border-blue-500 shadow-lg"
                                  : "border-gray-200 dark:border-gray-700"
                              }`}
                              onClick={() => setSelectedTemplate(template.id)}
                            >
                              <FileIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                              <div className="text-center font-medium">
                                {template.name}
                              </div>
                            </motion.div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">
                        Vertical
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {pdfTemplates
                          .filter((t) => t.name.includes("(Vertical)"))
                          .map((template) => (
                            <motion.div
                              key={template.id}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                                selectedTemplate === template.id
                                  ? "border-blue-500 shadow-lg"
                                  : "border-gray-200 dark:border-gray-700"
                              }`}
                              onClick={() => setSelectedTemplate(template.id)}
                            >
                              <FileIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                              <div className="text-center font-medium">
                                {template.name}
                              </div>
                            </motion.div>
                          ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="aspect-[4/6] relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
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

                <div className="flex justify-between items-center">
                  <Button
                    onClick={handlePrint}
                    disabled={
                      selectedTemplateData?.type === "pdf" && !pdfLoaded
                    }
                    className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    <Printer className="mr-2 h-5 w-5" />
                    Print{" "}
                    {selectedTemplateData?.type === "pdf" ? "PDF" : "Label"}
                  </Button>
                </div>
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
