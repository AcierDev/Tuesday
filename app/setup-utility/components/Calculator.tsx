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
import { ItemSizes } from "@/typings/types";
import { Design, ColorDistribution } from "../types";

interface CalculatorProps {
  selectedDesign: Design;
  selectedSize: ItemSizes | "custom";
  width: string;
  height: string;
  colorDistribution: ColorDistribution | null;
  onSizeChange: (value: string) => void;
  onDimensionChange: (dimension: "width" | "height", value: string) => void;
}

export function Calculator({
  selectedDesign,
  selectedSize,
  width,
  height,
  colorDistribution,
  onSizeChange,
  onDimensionChange,
}: CalculatorProps) {
  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-gray-100">
          Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
