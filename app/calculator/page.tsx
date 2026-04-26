"use client";

import React, { useEffect, useRef, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ItemSizes } from "@/typings/types";

interface CostBreakdown {
  basePrice: number;
  shipping: {
    base: number;
    additionalHeight: number;
    total: number;
  };

  total: number;
  weight: {
    grams: number;
    pounds: number;
  };
  debug?: {
    dimensions: { height: number; width: number };
    squares: { height: number; width: number; total: number };
  };
}

const SQUARE_SIZE = 3; // Square size in inches
const DEFAULT_CARD_WIDTH = 480; // Default card width in pixels (increased from 400)
const DIAGRAM_PADDING = 40; // Padding around the diagram

const FIXED_PRICE_PER_SQUARE = 4.2;

const CALCULATOR_SIZES: string[] = [
  ...Object.values(ItemSizes),
  "40 x 16",
];

export default function CustomArtRequest() {
  const [formData, setFormData] = useState({
    height: "36",
    width: "60",
    unit: "inches" as "inches" | "feet",
    selectedSize: "custom" as ItemSizes | "custom",
  });
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown>({
    basePrice: 0,
    shipping: {
      base: 0,
      additionalHeight: 0,
      total: 0,
    },
    total: 0,
    weight: {
      grams: 0,
      pounds: 0,
    },
  });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    updateCostBreakdown(formData.height, formData.width);
  }, []);

  const calculateCost = (
    h: number,
    w: number
  ): CostBreakdown => {
    // Convert dimensions to squares (3 inches per square)
    const heightInSquares = Math.round(h / SQUARE_SIZE);
    const widthInSquares = Math.round(w / SQUARE_SIZE);
    const totalSquares = heightInSquares * widthInSquares;

    const debugInfo = {
      dimensions: { height: h, width: w },
      squares: {
        height: heightInSquares,
        width: widthInSquares,
        total: totalSquares,
      },
    };

    // Calculate weight
    const weightInGrams = totalSquares * 96;
    const weightInPounds = weightInGrams / 453.592; // Convert grams to pounds

    // Calculate base price using fixed rate
    const basePrice = totalSquares * FIXED_PRICE_PER_SQUARE;

    // Calculate shipping
    const baseShipping = 0;
    let additionalHeightCharge = 0;
    if (h > 65) {
      const extraHeight = h - 65;
      additionalHeightCharge = Math.ceil(extraHeight / 16) * 100;
    }
    const totalShipping =
      baseShipping + additionalHeightCharge;

    // Calculate total
    const total = basePrice + totalShipping;

    return {
      basePrice,
      shipping: {
        base: baseShipping,
        additionalHeight: additionalHeightCharge,
        total: totalShipping,
      },
      total,
      weight: {
        grams: weightInGrams,
        pounds: weightInPounds,
      },
      debug: debugInfo,
    };
  };

  const updateCostBreakdown = (h: string, w: string) => {
    const heightInInches = parseFloat(h) * (formData.unit === "feet" ? 12 : 1);
    const widthInInches = parseFloat(w) * (formData.unit === "feet" ? 12 : 1);
    if (!isNaN(heightInInches) && !isNaN(widthInInches) && widthInInches > 0) {
      setCostBreakdown(
        calculateCost(heightInInches, widthInInches)
      );
    } else {
      setCostBreakdown({
        basePrice: 0,
        shipping: { base: 0, additionalHeight: 0, total: 0 },
        total: 0,
        weight: { grams: 0, pounds: 0 },
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      selectedSize: "custom",
    }));
    updateCostBreakdown(
      name === "height" ? value : formData.height,
      name === "width" ? value : formData.width
    );
  };

  const handleUnitChange = (newUnit: "inches" | "feet") => {
    const factor = newUnit === "feet" ? 1 / 12 : 12;
    const newHeight = (parseFloat(formData.height) * factor).toFixed(
      newUnit === "feet" ? 2 : 0
    );
    const newWidth = (parseFloat(formData.width) * factor).toFixed(
      newUnit === "feet" ? 2 : 0
    );
    setFormData((prev) => ({
      ...prev,
      unit: newUnit,
      height: newHeight,
      width: newWidth,
    }));
    updateCostBreakdown(newHeight, newWidth);
  };

  const handleSizeSelect = (size: string) => {
    if (size !== "custom") {
      const [width = "0", height = "0"] = size
        .split(" x ")
        .map((s) => parseInt(s) * SQUARE_SIZE);
      const newWidth = width.toString();
      const newHeight = height.toString();
      setFormData((prev) => ({
        ...prev,
        selectedSize: size as ItemSizes | "custom",
        width: newWidth,
        height: newHeight,
        unit: "inches",
      }));
      updateCostBreakdown(newHeight, newWidth);
    } else {
      setFormData((prev) => ({
        ...prev,
        selectedSize: "custom",
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(
      `Request submitted for a ${formData.height} ${formData.unit} x ${
        formData.width
      } ${formData.unit} art piece. Total cost: $${costBreakdown.total.toFixed(
        2
      )}`
    );
  };

  const standardSizeCosts = React.useMemo(() => {
    return CALCULATOR_SIZES.map((size) => {
      const [widthSquares = 0, heightSquares = 0] = size
        .split(" x ")
        .map((s) => parseInt(s));
      // Note: handleSizeSelect logic implies:
      // width = first part * SQUARE_SIZE
      // height = second part * SQUARE_SIZE
      // calculateCost takes (h, w)
      const widthInches = widthSquares * SQUARE_SIZE;
      const heightInches = heightSquares * SQUARE_SIZE;
      
      // We need to be careful with width vs height mapping.
      // In handleSizeSelect:
      // const [width = "0", height = "0"] = size.split(" x ")...
      // So first number is Width, second is Height.
      
      const cost = calculateCost(heightInches, widthInches);
      
      const minDim = Math.min(widthInches, heightInches);
      const maxDim = Math.max(widthInches, heightInches);
      const maxDimFeet = parseFloat((maxDim / 12).toFixed(2));
      
      return {
        size,
        cost: cost.total,
        label: `${minDim}" x ${maxDimFeet} Feet`,
      };
    });
  }, []);

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-950 text-black dark:text-white">
      <div className="select-none bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-3 sm:min-w-[220px]">
            <span className="hidden sm:block h-7 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight bg-gradient-to-br from-gray-900 to-blue-700 dark:from-white dark:to-blue-300 bg-clip-text text-transparent [-webkit-text-fill-color:transparent] [forced-color-adjust:none]">
              Custom Art Calculator
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Standard Sizes Sidebar */}
          <Card className="rounded-2xl w-full lg:w-72 shrink-0 lg:sticky lg:top-20">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Standard Sizes</CardTitle>
              <CardDescription className="text-xs">
                Quick select a standard configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              {standardSizeCosts.map((item) => {
                const isActive = formData.selectedSize === item.size;
                return (
                  <button
                    key={item.size}
                    type="button"
                    onClick={() => handleSizeSelect(item.size)}
                    className={`flex flex-col items-start text-left gap-0.5 px-3 py-2.5 rounded-xl ring-1 ring-inset transition-colors w-full ${
                      isActive
                        ? "bg-blue-600 text-white ring-blue-600 shadow-sm shadow-blue-600/30"
                        : "bg-gray-100 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200 ring-gray-200/60 dark:ring-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700/60"
                    }`}
                  >
                    <span className="font-semibold text-sm">{item.size}</span>
                    <span
                      className={`text-xs font-normal ${
                        isActive ? "text-white/80" : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card ref={cardRef} className="rounded-2xl w-full max-w-xl flex-1">
            <CardHeader>
              <CardTitle className="text-xl bg-gradient-to-br from-gray-900 to-blue-700 dark:from-white dark:to-blue-300 bg-clip-text text-transparent [-webkit-text-fill-color:transparent] [forced-color-adjust:none]">
                Custom Art Request
              </CardTitle>
              <CardDescription>
                Enter the dimensions for your custom art piece
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid w-full items-center gap-6">
                  <div className="space-y-2">
                    <Label>Select Size</Label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleSizeSelect("custom")}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium ring-1 ring-inset transition-colors ${
                          formData.selectedSize === "custom"
                            ? "bg-blue-600 text-white ring-blue-600 shadow-sm shadow-blue-600/30"
                            : "bg-gray-100 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200 ring-gray-200/60 dark:ring-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700/60"
                        }`}
                      >
                        Custom
                      </button>
                      {CALCULATOR_SIZES.map((size) => {
                        const isActive = formData.selectedSize === size;
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => handleSizeSelect(size)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium ring-1 ring-inset transition-colors ${
                              isActive
                                ? "bg-blue-600 text-white ring-blue-600 shadow-sm shadow-blue-600/30"
                                : "bg-gray-100 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200 ring-gray-200/60 dark:ring-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700/60"
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="height">Height</Label>
                      <Input
                        required
                        id="height"
                        name="height"
                        placeholder="Enter height"
                        type="number"
                        value={formData.height}
                        onChange={handleInputChange}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="width">Width</Label>
                      <Input
                        required
                        id="width"
                        name="width"
                        placeholder="Enter width"
                        type="number"
                        value={formData.width}
                        onChange={handleInputChange}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <RadioGroup
                      value={formData.unit}
                      onValueChange={handleUnitChange}
                      className="flex space-x-6 p-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem id="inches" value="inches" />
                        <Label htmlFor="inches" className="cursor-pointer">
                          Inches
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem id="feet" value="feet" />
                        <Label htmlFor="feet" className="cursor-pointer">
                          Feet
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col items-start border-t pt-6">
              <div className="w-full space-y-2">
                <div className="mb-4 p-5 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-sm font-mono border border-gray-200 dark:border-gray-800">
                  <h4 className="text-gray-500 dark:text-gray-400 mb-3 font-semibold uppercase text-xs tracking-wider">
                    Cost Breakdown
                  </h4>
                  {costBreakdown.debug && (
                    <div className="space-y-2 text-gray-700 dark:text-gray-300">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Dimensions:</span>
                        <span>
                          {costBreakdown.debug.dimensions.height}" ×{" "}
                          {costBreakdown.debug.dimensions.width}"
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Squares:</span>
                        <span>{costBreakdown.debug.squares.total} squares</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Weight:</span>
                        <span>{costBreakdown.weight.pounds.toFixed(1)} lb</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 rounded-xl border border-emerald-500/20 w-full">
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Estimated Total
                  </span>
                  <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    ${costBreakdown.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
