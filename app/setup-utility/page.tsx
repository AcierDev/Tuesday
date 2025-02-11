"use client";

import { Suspense, useEffect, useState } from "react";
import { ReadonlyURLSearchParams, useSearchParams } from "next/navigation";
import { DESIGN_COLORS, ItemDesignImages } from "@/typings/constants";
import { ColumnTitles, Item, ItemDesigns, ItemSizes } from "@/typings/types";
import { Design, ColorDistribution } from "./types";
import { DesignSelector } from "./components/DesignSelector";
import { DesignDetails } from "./components/DesignDetails";
import { Calculator } from "./components/Calculator";
import { PackagingDetails } from "./components/PackagingDetails";
import { BackboardDetails } from "./components/BackboardDetails";

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

function UtilitiesContent({
  UrlParams,
}: {
  UrlParams: ReadonlyURLSearchParams;
}) {
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
  const [selectedOrder, setSelectedOrder] = useState<Item | null>(null);

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
      distribution[index]!.count += useMethod1 ? 1 : -1;
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
    const designId = UrlParams.get("design");
    const size = UrlParams.get("size");

    if (designId) {
      const design = designs.find((d) => d.name === designId);
      if (design) setSelectedDesign(design);
    }

    if (size) {
      if (Object.values(ItemSizes).includes(size as ItemSizes)) {
        setSelectedSize(size as ItemSizes);
        const [w = "", h = ""] = size.split("x").map((dim) => dim.trim());
        setWidth(w);
        setHeight(h);
      }
    }
  }, [UrlParams]);

  useEffect(() => {
    if (selectedSize !== "custom") {
      const [w = "", h = ""] = selectedSize.split("x").map((dim) => dim.trim());
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

  const handleOrderSelect = (order: Item) => {
    setSelectedDesign(
      designs.find(
        (d) =>
          d.name ===
          order.values.find((v) => v.columnName === ColumnTitles.Design)?.text
      ) ?? null
    );
    setSelectedSize(
      order.values.find((v) => v.columnName === ColumnTitles.Size)?.text as
        | ItemSizes
        | "custom"
    );
    setSelectedOrder(order);
  };

  return (
    <div className="container mx-auto p-4 space-y-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <h1 className="text-3xl font-bold flex items-center justify-between">
        Setup Utility
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
            onOrderSelect={handleOrderSelect}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PackagingDetails
          selectedSize={selectedSize}
          selectedOrder={selectedOrder}
        />
        <BackboardDetails
          selectedSize={selectedSize}
          selectedOrder={selectedOrder}
        />
      </div>
    </div>
  );
}

export default function UtilitiesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UrlParamsWrapper>
        {(UrlParams: ReadonlyURLSearchParams) => (
          <UtilitiesContent UrlParams={UrlParams} />
        )}
      </UrlParamsWrapper>
    </Suspense>
  );
}

function UrlParamsWrapper({
  children,
}: {
  children: (UrlParams: ReadonlyURLSearchParams) => React.ReactNode;
}) {
  const UrlParams = useSearchParams();
  return children(UrlParams);
}
