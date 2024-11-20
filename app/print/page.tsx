"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Printer, UsbIcon } from "lucide-react";
import Image from "next/image";

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
    name: "Fragile Stickers",
    src: "/pdf/fragile-stickers.pdf",
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

  return (
    <Card className="w-full max-w-md mx-auto dark:bg-gray-800">
      <CardHeader className="text-center">
        <CardTitle>Label Printer</CardTitle>
        <CardDescription>
          Select a template and print your label or PDF
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4">
        <div className="w-full max-w-xs">
          <Label htmlFor="template" className="text-center block mb-2">
            Label Template
          </Label>
          <Select
            value={selectedTemplate.toString()}
            onValueChange={(value) => setSelectedTemplate(Number(value))}
          >
            <SelectTrigger id="template" className="dark:bg-gray-700">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATES.map((template) => (
                <SelectItem key={template.id} value={template.id.toString()}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-center">
          {selectedTemplateData?.type === "pdf" ? (
            <embed
              src={selectedTemplateData.src}
              type="application/pdf"
              width="300"
              height="200"
              className="border border-gray-200 rounded"
            />
          ) : (
            <Image
              src={selectedTemplateData?.src || ""}
              alt="Selected template"
              width={300}
              height={200}
              className="border border-gray-200 rounded"
            />
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button
          onClick={handlePrint}
          disabled={selectedTemplateData?.type === "pdf" && !pdfLoaded}
        >
          <Printer className="mr-2 h-4 w-4" />
          Print High-Quality{" "}
          {selectedTemplateData?.type === "pdf" ? "PDF" : '4" x 6" Label'}
        </Button>
      </CardFooter>

      {/* Hidden print content */}
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

      {/* Hidden iframe for PDF printing */}
      <iframe
        ref={iframeRef}
        style={{ display: "none" }}
        title="PDF Print Frame"
      />
    </Card>
  );
}
