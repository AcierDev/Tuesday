"use client";

import { Suspense, useEffect, useState } from "react";
import { ReadonlyURLSearchParams, useSearchParams } from "next/navigation";
import { DESIGN_COLORS, ItemDesignImages } from "@/typings/constants";
import { Item, ItemDesigns, ItemSizes } from "@/typings/types";
import { Design, ColorDistribution } from "./types";
import { DesignSelector } from "./components/DesignSelector";
import { DesignDetails } from "./components/DesignDetails";
import { Calculator } from "./components/Calculator";
import { PackagingDetails } from "./components/PackagingDetails";
import { BackboardDetails } from "./components/BackboardDetails";

const designs: Design[] = Object.values(ItemDesigns).map((design, index) => {
  const category = design.toLowerCase().includes("stripe")
    ? "striped"
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

    const totalSquares = parseInt(width) * parseInt(height);
    const colorCount = selectedDesign.colors.length;
    const averageSquaresPerColor = totalSquares / colorCount;

    const baseSquaresPerColor1 = Math.floor(averageSquaresPerColor);
    const extrasToAdd = totalSquares - baseSquaresPerColor1 * colorCount;

    const baseSquaresPerColor2 = Math.ceil(averageSquaresPerColor);
    const extrasToSubtract = baseSquaresPerColor2 * colorCount - totalSquares;

    const useMethod1 = extrasToAdd <= extrasToSubtract;

    const baseSquaresPerColor = useMethod1
      ? baseSquaresPerColor1
      : baseSquaresPerColor2;
    const adjustmentCount = useMethod1 ? extrasToAdd : extrasToSubtract;
    const adjustmentType = useMethod1 ? "add" : "subtract";

    const distribution = selectedDesign.colors.map((color) => ({
      color,
      count: baseSquaresPerColor,
    }));

    for (let i = 0; i < adjustmentCount; i++) {
      const index = Math.floor(i * (colorCount / adjustmentCount));
      distribution[index]!.count += useMethod1 ? 1 : -1;
    }

    return {
      totalSquares,
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
          order.design
      ) ?? null
    );
    setSelectedSize(
      order.size as
        | ItemSizes
        | "custom"
    );
    setSelectedOrder(order);
  };

  return (
    <div className="relative flex flex-col min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/40 dark:from-slate-900 dark:via-blue-950/60 dark:to-indigo-950/40 text-black dark:text-white overflow-hidden">
      {/* Ambient color blobs — purely decorative, behind everything */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden -z-0"
      >
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-blue-300/30 dark:bg-blue-500/30 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-indigo-300/25 dark:bg-indigo-500/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-cyan-300/20 dark:bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-2/3 left-0 h-72 w-72 rounded-full bg-fuchsia-300/15 dark:bg-fuchsia-500/15 blur-3xl" />
      </div>

      <div className="relative z-10 select-none bg-white/70 dark:bg-gray-950/70 backdrop-blur-xl border-b border-gray-200/80 dark:border-white/10 sticky top-0 z-50">
        <div className="max-w-full mx-auto px-2 sm:px-3 lg:px-4">
          <div className="flex items-center gap-3 py-3 sm:min-w-[220px]">
            <span className="hidden sm:block h-7 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 shadow-sm shadow-blue-500/40" />
            <h1 className="heading-tool">
              Setup Utility
            </h1>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-full mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
