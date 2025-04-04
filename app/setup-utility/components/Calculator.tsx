"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColumnTitles, ItemSizes } from "@/typings/types";
import { Design, ColorDistribution } from "../types";
import { useOrderStore } from "@/stores/useOrderStore";
import { useState } from "react";
import { PrintLabel, printStyles } from "./PrintLabel";

interface CalculatorProps {
  selectedDesign: Design;
  selectedSize: ItemSizes | "custom";
  width: string;
  height: string;
  colorDistribution: ColorDistribution | null;
  onSizeChange: (value: string) => void;
  onDimensionChange: (dimension: "width" | "height", value: string) => void;
  onOrderSelect: (order: any) => void;
}

export function Calculator({
  selectedSize,
  selectedDesign,
  width,
  height,
  colorDistribution,
  onSizeChange,
  onDimensionChange,
  onOrderSelect,
}: CalculatorProps) {
  const { searchQuery, setSearchQuery, searchResults } = useOrderStore();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const handleOrderSelect = (order: any) => {
    setSelectedOrder(order);
    onOrderSelect(order);
  };

  return (
    <Card className="bg-white dark:bg-gray-800 ">
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
                      selectedOrder.values.find(
                        (v) => v.columnName === "Customer Name"
                      )?.text
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
                          <span style={printStyles.label}>Total Pieces:</span>{" "}
                          <span style={printStyles.value}>
                            {colorDistribution.totalPieces}
                          </span>
                        </div>

                        <div style={{ marginBottom: "12px" }}>
                          <span style={printStyles.label}>Adjustment:</span>{" "}
                          <span style={printStyles.value}>
                            {colorDistribution.adjustmentCount} pieces{" "}
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
                                      (count / colorDistribution.totalPieces) *
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
            onChange={(e) =>
              setSearchQuery(e.target.value, [ColumnTitles.Customer_Name])
            }
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 100)}
            className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />

          {isSearchFocused && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg">
              {searchResults.map((order) => (
                <div
                  key={order.id}
                  onMouseDown={() => handleOrderSelect(order)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                >
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    {order.values.find((v) => v.columnName === "Customer Name")
                      ?.text || "Unnamed Order"}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {order.values.find((v) => v.columnName === "Design")?.text +
                      " - " +
                      order.values.find((v) => v.columnName === "Size")?.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="size-select"
            className="text-gray-900 dark:text-gray-100"
          >
            Choose a size:
          </Label>
          <Select value={selectedSize} onValueChange={onSizeChange}>
            <SelectTrigger
              id="size-select"
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <SelectValue placeholder="Choose a size" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-700">
              {Object.values(ItemSizes).map((size) => (
                <SelectItem
                  key={size}
                  value={size}
                  className="text-gray-900 dark:text-gray-100"
                >
                  {size}
                </SelectItem>
              ))}
              <SelectItem
                value="custom"
                className="text-gray-900 dark:text-gray-100"
              >
                Custom
              </SelectItem>
            </SelectContent>
          </Select>
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
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <Input
              id="custom-height"
              type="number"
              placeholder="Height"
              value={height}
              onChange={(e) => onDimensionChange("height", e.target.value)}
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {colorDistribution && (
          <>
            <DistributionCard
              title="Total Pieces"
              content={colorDistribution.totalPieces.toString()}
            />
            <DistributionCard
              title="Adjustment"
              content={`${colorDistribution.adjustmentCount} pieces ${
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
    <Card className="bg-white dark:bg-gray-700">
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
  const totalPieces = distribution.reduce((sum, { count }) => sum + count, 0);

  return (
    <Card className="bg-white dark:bg-gray-700">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-gray-100">
          Distribution Diagram
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full flex flex-wrap">
          {distribution.map(({ color, count }, index) => (
            <div
              key={index}
              style={{
                backgroundColor: color,
                width: `${(count / totalPieces) * 100}%`,
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
