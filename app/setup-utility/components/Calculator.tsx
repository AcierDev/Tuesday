"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ItemSizes, ItemStatus } from "@/typings/types";
import { Design, ColorDistribution } from "../types";
import { useOrderStore } from "@/stores/useOrderStore";
import { useMemo, useState } from "react";
import { PrintLabel, printStyles } from "./PrintLabel";
import {
  DESIGN_PILL_FULL,
  PILL_INTERACTIVE,
  PILL_SELECTED_RING,
  createDesignBackground,
} from "@/components/ui/order-pills";

interface CalculatorProps {
  designs: Design[];
  selectedDesign: Design;
  setSelectedDesign: (design: Design) => void;
  selectedSize: ItemSizes | "custom";
  width: string;
  height: string;
  colorDistribution: ColorDistribution | null;
  onSizeChange: (value: string) => void;
  onDimensionChange: (dimension: "width" | "height", value: string) => void;
  onOrderSelect: (order: any) => void;
}

export function Calculator({
  designs,
  selectedSize,
  selectedDesign,
  setSelectedDesign,
  width,
  height,
  colorDistribution,
  onSizeChange,
  onDimensionChange,
  onOrderSelect,
}: CalculatorProps) {
  const items = useOrderStore((state) => state.items);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Search only active orders by customer name — never anything in the Done
  // (or Hidden) section. Kept local so it doesn't touch the shared store search
  // (which also fires a server-side Done-items lookup used by the orders board).
  const searchResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return [];
    return items.filter(
      (item) =>
        item.status !== ItemStatus.Done &&
        item.status !== ItemStatus.Hidden &&
        item.customerName?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const handleOrderSelect = (order: any) => {
    setSelectedOrder(order);
    onOrderSelect(order);
  };

  return (
    <Card className="rounded-2xl bg-white/90 dark:bg-gray-900/70 backdrop-blur-md border-gray-200/80 dark:border-white/10 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-gray-900 dark:text-gray-100">
            Calculator
          </CardTitle>
          <PrintLabel
            labelContent={
              <div style={printStyles.container}>
                {selectedOrder && (
                  <div style={printStyles.customerName}>
                    Customer:{" "}
                    {
                      selectedOrder.customerName
                    }
                  </div>
                )}
                <h2 style={printStyles.header}>Calculator Details</h2>

                <div style={printStyles.section}>
                  <h3 style={printStyles.sectionTitle as React.CSSProperties}>
                    Dimensions
                  </h3>
                  <div style={printStyles.grid}>
                    <div>
                      <span style={printStyles.label}>Size:</span>
                      <div style={printStyles.value}>{selectedSize}</div>
                    </div>
                    <div>
                      <span style={printStyles.label}>Design: </span>
                      <div style={printStyles.value}>{selectedDesign.name}</div>
                    </div>
                  </div>
                </div>

                {colorDistribution && (
                  <>
                    <div style={printStyles.divider} />

                    <div style={printStyles.section}>
                      <h3
                        style={printStyles.sectionTitle as React.CSSProperties}
                      >
                        Color Distribution
                      </h3>
                      <div style={printStyles.content}>
                        <div style={{ marginBottom: "12px" }}>
                          <span style={printStyles.label}>Total Squares:</span>{" "}
                          <span style={printStyles.value}>
                            {colorDistribution.totalSquares}
                          </span>
                        </div>

                        <div style={{ marginBottom: "12px" }}>
                          <span style={printStyles.label}>Adjustment:</span>{" "}
                          <span style={printStyles.value}>
                            {colorDistribution.adjustmentCount} squares{" "}
                            {colorDistribution.adjustmentType === "add"
                              ? "added to"
                              : "subtracted from"}{" "}
                            colors
                          </span>
                        </div>

                        <div>
                          <div
                            style={{
                              ...printStyles.label,
                              marginBottom: "8px",
                            }}
                          >
                            Distribution:
                          </div>
                          <div
                            style={{
                              display: "flex",
                              width: "100%",
                              height: "40px",
                              borderRadius: "4px",
                              overflow: "hidden",
                            }}
                          >
                            {colorDistribution.distribution.map(
                              ({ color, count }, index) => (
                                <div
                                  key={index}
                                  style={{
                                    width: `${
                                      (count / colorDistribution.totalSquares) *
                                      100
                                    }%`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "black",
                                    fontSize: "11px",
                                    fontWeight: "200",
                                    border: "1px solid black",
                                  }}
                                >
                                  {count}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div style={printStyles.signatureSection}>
                  <div style={printStyles.signatureLine} />
                  <div style={printStyles.signatureLabel}>Verified By</div>
                </div>
              </div>
            }
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative space-y-2">
          <Label
            htmlFor="order-search"
            className="text-gray-900 dark:text-gray-100"
          >
            Search Orders:
          </Label>
          <Input
            id="order-search"
            type="search"
            placeholder="Search customer names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 100)}
            className=""
          />

          {isSearchFocused && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-md shadow-lg">
              {searchResults.map((order) => (
                <div
                  key={order.id}
                  onMouseDown={() => handleOrderSelect(order)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                >
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {order.customerName || "Unnamed Order"}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {order.design +
                      " - " +
                      order.size}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-gray-900 dark:text-gray-100">
            Choose a size:
          </Label>
          <div className="flex flex-wrap gap-2">
            {Object.values(ItemSizes).map((size) => {
              const isActive = selectedSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => onSizeChange(size)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ring-1 ring-inset transition-all duration-150 hover:-translate-y-0.5 hover:scale-[1.04] active:scale-95 ${
                    isActive
                      ? "bg-blue-600 text-white ring-blue-600 shadow-md shadow-blue-600/10 hover:shadow-lg hover:shadow-blue-600/15"
                      : "bg-gray-100 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200 ring-gray-200/60 dark:ring-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700/60 hover:shadow-sm"
                  }`}
                >
                  {size}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onSizeChange("custom")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ring-1 ring-inset transition-all duration-150 hover:-translate-y-0.5 hover:scale-[1.04] active:scale-95 ${
                selectedSize === "custom"
                  ? "bg-blue-600 text-white ring-blue-600 shadow-md shadow-blue-600/10 hover:shadow-lg hover:shadow-blue-600/15"
                  : "bg-gray-100 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200 ring-gray-200/60 dark:ring-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700/60 hover:shadow-sm"
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-900 dark:text-gray-100">
            Choose a design:
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {designs.map((design) => {
              const isSelected = selectedDesign.id === design.id;
              return (
                <button
                  key={design.id}
                  type="button"
                  onClick={() => setSelectedDesign(design)}
                  className={`${DESIGN_PILL_FULL} ${PILL_INTERACTIVE} ${
                    isSelected ? PILL_SELECTED_RING : ""
                  }`}
                  style={{ background: createDesignBackground(design.name) }}
                >
                  {design.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="custom-width"
            className="text-gray-900 dark:text-gray-100"
          >
            Dimensions:
          </Label>
          <div className="flex space-x-2">
            <Input
              id="custom-width"
              type="number"
              placeholder="Width"
              value={width}
              onChange={(e) => onDimensionChange("width", e.target.value)}
              className=""
            />
            <Input
              id="custom-height"
              type="number"
              placeholder="Height"
              value={height}
              onChange={(e) => onDimensionChange("height", e.target.value)}
              className=""
            />
          </div>
        </div>

        {colorDistribution && (
          <>
            <DistributionCard
              title="Total Squares"
              content={colorDistribution.totalSquares.toString()}
            />
            <DistributionCard
              title="Adjustment"
              content={`${colorDistribution.adjustmentCount} squares ${
                colorDistribution.adjustmentType === "add"
                  ? "added to"
                  : "subtracted from"
              } colors, spread evenly across the design`}
            />
            <DistributionDiagram
              distribution={colorDistribution.distribution}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DistributionCard({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <Card className="rounded-xl bg-white/90 dark:bg-gray-900/70 backdrop-blur-md border-gray-200/80 dark:border-white/10 shadow-md">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-gray-100">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-900 dark:text-gray-100">{content}</p>
      </CardContent>
    </Card>
  );
}

function DistributionDiagram({
  distribution,
}: {
  distribution: ColorDistribution["distribution"];
}) {
  const totalSquares = distribution.reduce((sum, { count }) => sum + count, 0);

  return (
    <Card className="rounded-xl bg-white/90 dark:bg-gray-900/70 backdrop-blur-md border-gray-200/80 dark:border-white/10 shadow-md">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-gray-100">
          Distribution Diagram
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full flex flex-wrap overflow-hidden rounded-lg ring-1 ring-black/5 dark:ring-white/10">
          {distribution.map(({ color, count }, index) => (
            <div
              key={index}
              style={{
                backgroundColor: color,
                width: `${(count / totalSquares) * 100}%`,
              }}
              className="h-20 flex items-center justify-center"
            >
              <span className="text-xs font-bold text-white text-shadow">
                {count}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
