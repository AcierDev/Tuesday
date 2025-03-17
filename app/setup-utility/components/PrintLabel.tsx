"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import { backIn } from "framer-motion";

interface PrintLabelProps {
  labelContent: React.ReactNode;
  buttonClassName?: string;
  buttonLabel?: string;
  customerName?: string;
}

export const printStyles = {
  container: {
    padding: "1px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    maxWidth: "400px",
  },
  header: {
    fontSize: "18px",
    fontWeight: "500",
    marginBottom: "16px",
    paddingBottom: "8px",
    borderBottom: "2px solid #e2e8f0",
    color: "#1a202c",
  },
  section: {
    marginBottom: "16px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "500",
    color: "#000",
    marginBottom: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  content: {
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#2d3748",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
    marginTop: "8px",
  },
  label: {
    fontWeight: "400",
    color: "#718096",
  },
  value: {
    color: "#2d3748",
    fontWeight: "400",
  },
  divider: {
    margin: "16px 0",
    height: "1px",
    backgroundColor: "#e2e8f0",
  },
  signatureSection: {
    marginTop: "20px",
    borderTop: "1px solid #ccc",
    paddingTop: "20px",
  },
  signatureLine: {
    borderBottom: "1px solid black",
    width: "200px",
    height: "1px",
    marginTop: "25px",
  },
  signatureLabel: {
    fontSize: "12px",
    color: "#666",
    marginTop: "4px",
  },
  customerName: {
    fontSize: "16px",
    fontWeight: "500",
    color: "#1a202c",
    marginBottom: "8px",
    textDecoration: "underline",
  },
} as const;

export function PrintLabel({
  labelContent,
  buttonClassName = "",
  buttonLabel = "Print Label",
  customerName,
}: PrintLabelProps) {
  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });

  return (
    <>
      <Button className={`gap-2 ${buttonClassName}`} onClick={handlePrint}>
        <Printer className="h-4 w-4" />
        {buttonLabel}
      </Button>
      <div className="hidden">
        <div
          ref={componentRef}
          style={{
            width: "4in",
            height: "6in",
            padding: "0.25in",
            border: "1px solid #000",
            fontFamily: "system-ui, -apple-system, sans-serif",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
            fontWeight: "400",
          }}
        >
          {customerName && (
            <div style={printStyles.customerName}>Customer: {customerName}</div>
          )}
          {labelContent}
        </div>
      </div>
    </>
  );
}
