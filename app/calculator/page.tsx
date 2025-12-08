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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    blocks: { height: number; width: number; total: number };
  };
}

const BLOCK_SIZE = 3; // Block size in inches
const DEFAULT_CARD_WIDTH = 480; // Default card width in pixels (increased from 400)
const DIAGRAM_PADDING = 40; // Padding around the diagram

const FIXED_PRICE_PER_BLOCK = 3.9;

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
    // Convert dimensions to blocks (3 inches per block)
    const heightInBlocks = Math.round(h / BLOCK_SIZE);
    const widthInBlocks = Math.round(w / BLOCK_SIZE);
    const totalBlocks = heightInBlocks * widthInBlocks;

    const debugInfo = {
      dimensions: { height: h, width: w },
      blocks: {
        height: heightInBlocks,
        width: widthInBlocks,
        total: totalBlocks,
      },
    };

    // Calculate weight
    const weightInGrams = totalBlocks * 96;
    const weightInPounds = weightInGrams / 453.592; // Convert grams to pounds

    // Calculate base price using fixed rate
    const basePrice = totalBlocks * FIXED_PRICE_PER_BLOCK;

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

  const handleSizeSelect = (size: ItemSizes | "custom") => {
    if (size !== "custom") {
      const [width = "0", height = "0"] = size
        .split(" x ")
        .map((s) => parseInt(s) * BLOCK_SIZE);
      const newWidth = width.toString();
      const newHeight = height.toString();
      setFormData((prev) => ({
        ...prev,
        selectedSize: size,
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
    return Object.values(ItemSizes).map((size) => {
      const [widthBlocks = 0, heightBlocks = 0] = size
        .split(" x ")
        .map((s) => parseInt(s));
      // Note: handleSizeSelect logic implies:
      // width = first part * BLOCK_SIZE
      // height = second part * BLOCK_SIZE
      // calculateCost takes (h, w)
      const widthInches = widthBlocks * BLOCK_SIZE;
      const heightInches = heightBlocks * BLOCK_SIZE;
      
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
    <div className="min-h-screen w-full flex items-start justify-center p-8 pt-12">
      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl items-start justify-center">
        {/* Standard Sizes Sidebar */}
        <Card className="w-full lg:w-72 bg-[#1a1f2b]/95 border-gray-800 backdrop-blur-sm shrink-0 lg:sticky lg:top-8">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-gray-200">
              Standard Sizes
            </CardTitle>
            <CardDescription className="text-gray-400 text-xs">
              Quick select a standard configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
            {standardSizeCosts.map((item) => (
              <Button
                key={item.size}
                variant="outline"
                className="justify-start bg-gray-800/50 border-gray-700 hover:bg-gray-700 hover:text-white h-auto py-3 px-4 w-full"
                onClick={() => handleSizeSelect(item.size)}
              >
                <div className="flex flex-col items-start text-left gap-0.5">
                  <span className="font-semibold text-sm text-gray-200">
                    {item.size}
                  </span>
                  <span className="text-xs text-gray-400 font-normal">
                    {item.label}
                  </span>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card
          ref={cardRef}
          className="w-full max-w-xl bg-[#1a1f2b]/95 border-gray-800 backdrop-blur-sm flex-1"
        >
          <CardHeader>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Custom Art Request
            </CardTitle>
            <CardDescription className="text-gray-400">
              Enter the dimensions for your custom art piece
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid w-full items-center gap-6">
                <div className="space-y-2">
                  <Label htmlFor="size-select" className="text-gray-300">
                    Select Size
                  </Label>
                  <Select
                    value={formData.selectedSize}
                    onValueChange={handleSizeSelect}
                  >
                    <SelectTrigger
                      id="size-select"
                      className="bg-gray-800 border-gray-700 h-11"
                    >
                      <SelectValue placeholder="Choose a size" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="custom">Custom</SelectItem>
                      {Object.values(ItemSizes).map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="height" className="text-gray-300">
                      Height
                    </Label>
                    <Input
                      required
                      id="height"
                      name="height"
                      placeholder="Enter height"
                      type="number"
                      value={formData.height}
                      onChange={handleInputChange}
                      className="bg-gray-800 border-gray-700 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="width" className="text-gray-300">
                      Width
                    </Label>
                    <Input
                      required
                      id="width"
                      name="width"
                      placeholder="Enter width"
                      type="number"
                      value={formData.width}
                      onChange={handleInputChange}
                      className="bg-gray-800 border-gray-700 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Unit</Label>
                  <RadioGroup
                    value={formData.unit}
                    onValueChange={handleUnitChange}
                    className="flex space-x-6 p-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem id="inches" value="inches" />
                      <Label
                        htmlFor="inches"
                        className="text-gray-300 cursor-pointer"
                      >
                        Inches
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem id="feet" value="feet" />
                      <Label
                        htmlFor="feet"
                        className="text-gray-300 cursor-pointer"
                      >
                        Feet
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-start border-t border-gray-800 pt-6">
            <div className="w-full space-y-2">
              <div className="mb-4 p-5 bg-gray-900/50 rounded-lg text-sm font-mono border border-gray-800">
                <h4 className="text-gray-400 mb-3 font-semibold uppercase text-xs tracking-wider">
                  Cost Breakdown
                </h4>
                {costBreakdown.debug && (
                  <div className="space-y-2 text-gray-300">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Dimensions:</span>
                      <span>
                        {costBreakdown.debug.dimensions.height}" ×{" "}
                        {costBreakdown.debug.dimensions.width}"
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Blocks:</span>
                      <span>
                        {costBreakdown.debug.blocks.total} blocks
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Weight:</span>
                      <span>
                        {costBreakdown.weight.pounds.toFixed(1)} lb
                      </span>
                    </div>
                    <div className="border-t border-gray-800 my-2"></div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20 w-full">
                <span className="text-sm font-medium text-green-400">
                  Estimated Total
                </span>
                <span className="text-2xl font-bold text-green-400">
                  ${costBreakdown.total.toFixed(2)}
                </span>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
