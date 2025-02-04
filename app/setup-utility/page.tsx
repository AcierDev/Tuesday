"use client";

import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { DESIGN_COLORS, ItemDesignImages } from "@/typings/constants";
import { ItemDesigns, ItemSizes } from "@/typings/types";
import { renderToString } from "react-dom/server";
import { Design, ColorDistribution } from "./types";
import { DesignSelector } from "./components/DesignSelector";
import { DesignDetails } from "./components/DesignDetails";
import { Calculator } from "./components/Calculator";
import { PackagingDetails } from "./components/PackagingDetails";
import { PrintableContent } from "./components/PrintableContent";

const designs: Design[] = Object.values(ItemDesigns).map((design, index) => {
  const category = design.toLowerCase().includes("stripe")
    ? "striped"
    : design.toLowerCase().includes("tile")
    ? "tiled"
    : "geometric";

  return {
    id: index.toString(),
    name: design,
    imageUrl: ItemDesignImages[design],
    colors: Object.values(DESIGN_COLORS[design] ?? {})?.map((val) => val.hex),
    category,
  };
});

function UtilitiesContent() {
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(
    designs[0]!
  );
  const [selectedSize, setSelectedSize] = useState<ItemSizes | "custom">(
    ItemSizes.TwentyEight_By_Sixteen
  );
  const [width, setWidth] = useState<string>("14");
  const [height, setHeight] = useState<string>("7");
  const [isDesignSectionExpanded, setIsDesignSectionExpanded] = useState(false);
  const [showAdditionalSections, setShowAdditionalSections] = useState(false);

  const calculateColorCount = (): ColorDistribution | null => {
    if (!selectedDesign || !width || !height) return null;

    const totalPieces = parseInt(width) * parseInt(height);
    const colorCount = selectedDesign.colors.length;
    const averagePiecesPerColor = totalPieces / colorCount;

    const basePiecesPerColor1 = Math.floor(averagePiecesPerColor);
    const extrasToAdd = totalPieces - basePiecesPerColor1 * colorCount;

    const basePiecesPerColor2 = Math.ceil(averagePiecesPerColor);
    const extrasToSubtract = basePiecesPerColor2 * colorCount - totalPieces;

    const useMethod1 = extrasToAdd <= extrasToSubtract;

    const basePiecesPerColor = useMethod1
      ? basePiecesPerColor1
      : basePiecesPerColor2;
    const adjustmentCount = useMethod1 ? extrasToAdd : extrasToSubtract;
    const adjustmentType = useMethod1 ? "add" : "subtract";

    const distribution = selectedDesign.colors.map((color) => ({
      color,
      count: basePiecesPerColor,
    }));

    for (let i = 0; i < adjustmentCount; i++) {
      const index = Math.floor(i * (colorCount / adjustmentCount));
      distribution[index].count += useMethod1 ? 1 : -1;
    }

    return {
      totalPieces,
      colorCount,
      distribution,
      adjustmentCount,
      adjustmentType,
    };
  };

  useEffect(() => {
    if (selectedSize !== "custom") {
      const [w, h] = selectedSize.split("x").map((dim) => dim.trim());
      setWidth(w);
      setHeight(h);
    }
  }, [selectedSize]);

  const handleSizeChange = (value: string) => {
    setSelectedSize(value as ItemSizes | "custom");
  };

  const handleDimensionChange = (
    dimension: "width" | "height",
    value: string
  ) => {
    if (dimension === "width") {
      setWidth(value);
    } else {
      setHeight(value);
    }

    const newSize = `${width} x ${height}`;
    if (Object.values(ItemSizes).includes(newSize as ItemSizes)) {
      setSelectedSize(newSize as ItemSizes);
    } else {
      setSelectedSize("custom");
    }
  };

  const colorDistribution = calculateColorCount();

  const getImageDimensions = (url: string) => {
    const params = new URLSearchParams(url.split("?")[1]);
    return {
      width: parseInt(params.get("width") || "0"),
      height: parseInt(params.get("height") || "0"),
    };
  };

  const handlePrint = () => {
    if (!selectedDesign || !colorDistribution) return;

    const printWindow = window.open("", "PRINT", "height=800,width=1200");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${selectedDesign.name} Design Summary</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 0;
                padding: 0;
              }
              .printable-content { 
                width: 4in;
                height: 6in;
                padding: 0.25in;
                box-sizing: border-box;
              }
              @media print {
                body { 
                  -webkit-print-color-adjust: exact;
                  size: 4in 6in;
                  margin: 0;
                }
              }
            </style>
          </head>
          <body>
            ${
              printWindow.document
                .createElement("div")
                .appendChild(
                  printWindow.document.importNode(
                    new DOMParser().parseFromString(
                      `<div>${renderToString(
                        <PrintableContent
                          design={selectedDesign}
                          size={selectedSize}
                          colorDistribution={colorDistribution}
                        />
                      )}</div>`,
                      "text/html"
                    ).body.firstChild!,
                    true
                  )
                ).outerHTML
            }
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <h1 className="text-3xl font-bold flex items-center justify-between">
        Setup Utility
        {selectedDesign && colorDistribution && (
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Summary
          </Button>
        )}
      </h1>

      <DesignSelector
        designs={designs}
        selectedDesign={selectedDesign}
        setSelectedDesign={setSelectedDesign}
        isDesignSectionExpanded={isDesignSectionExpanded}
        setIsDesignSectionExpanded={setIsDesignSectionExpanded}
        showAdditionalSections={showAdditionalSections}
        setShowAdditionalSections={setShowAdditionalSections}
      />

      {selectedDesign && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DesignDetails
            design={selectedDesign}
            getImageDimensions={getImageDimensions}
          />

          <Calculator
            selectedDesign={selectedDesign}
            selectedSize={selectedSize}
            width={width}
            height={height}
            colorDistribution={colorDistribution}
            onSizeChange={handleSizeChange}
            onDimensionChange={handleDimensionChange}
          />
        </div>
      )}

      <PackagingDetails selectedSize={selectedSize} />
    </div>
  );
}

export default function UtilitiesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchParamsWrapper>
        {(searchParams) => <UtilitiesContent searchParams={searchParams} />}
      </SearchParamsWrapper>
    </Suspense>
  );
}

function SearchParamsWrapper({ children }) {
  const searchParams = useSearchParams();
  return children(searchParams);
}
