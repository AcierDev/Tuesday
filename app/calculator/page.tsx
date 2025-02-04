"use client";

import { ExternalLink, Mail, ShoppingCart } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItemSizes } from "@/typings/types";

interface CostBreakdown {
  basePrice: number;
  shipping: {
    base: number;
    additionalHeight: number;
    expedited: number;
    total: number;
  };
  tax: number;
  total: number;
  debug?: {
    dimensions: { height: number; width: number };
    blocks: { height: number; width: number; total: number };
  };
}

const BLOCK_SIZE = 3; // Block size in inches
const DEFAULT_CARD_WIDTH = 480; // Default card width in pixels (increased from 400)
const DIAGRAM_PADDING = 40; // Padding around the diagram

const PRICE_DATA_POINTS = [
  { squares: 67, price: 385.0 },
  { squares: 98, price: 485.0 },
  { squares: 160, price: 720.0 },
  { squares: 200, price: 850.0 },
  { squares: 240, price: 950.0 },
  { squares: 288, price: 1125.0 },
  { squares: 336, price: 1225.0 },
  { squares: 448, price: 1625.0 },
  { squares: 512, price: 1825.0 },
  { squares: 576, price: 2025.0 },
];

const interpolatePrice = (
  squares: number,
  points: typeof PRICE_DATA_POINTS
): number => {
  console.log(`Interpolating price for ${squares} squares`);

  // First, check for exact match
  const exactMatch = points.find((point) => point.squares === squares);
  if (exactMatch) {
    console.log(`Found exact match: $${exactMatch.price}`);
    return exactMatch.price;
  }

  // If below the smallest size, use the smallest price
  if (squares < points[0].squares) {
    return points[0].price;
  }

  // If above the largest size, calculate based on the last two points
  if (squares > points[points.length - 1].squares) {
    const lastPoint = points[points.length - 1];
    const secondLastPoint = points[points.length - 2];

    // Calculate the price per square for the last two points
    const lastPricePerSquare = lastPoint.price / lastPoint.squares;
    const secondLastPricePerSquare =
      secondLastPoint.price / secondLastPoint.squares;

    // Use the average price per square of the last two points
    const averagePricePerSquare =
      (lastPricePerSquare + secondLastPricePerSquare) / 2;

    // Calculate the final price
    const finalPrice = squares * averagePricePerSquare;

    console.log(`Extrapolated price: $${finalPrice}`);
    return finalPrice;
  }

  // For sizes between data points, use linear interpolation
  for (let i = 1; i < points.length; i++) {
    const lower = points[i - 1];
    const upper = points[i];
    if (!upper || !lower) continue;

    if (squares < upper.squares) {
      const proportion =
        (squares - lower.squares) / (upper.squares - lower.squares);
      const interpolatedPrice =
        lower.price + proportion * (upper.price - lower.price);
      console.log(
        `Interpolated between ${lower.squares} ($${lower.price}) and ${upper.squares} ($${upper.price})`
      );
      console.log(
        `Proportion: ${proportion}, Final price: $${interpolatedPrice}`
      );
      return interpolatedPrice;
    }
  }

  // Fallback to last price if all else fails
  const fallbackPrice = points[points.length - 1]?.price ?? 0;
  console.log(`Using fallback price: $${fallbackPrice}`);
  return fallbackPrice;
};

const ArtDiagram: React.FC<{
  height: number;
  width: number;
  unit: "inches" | "feet";
  scale: number;
  showBlocks: boolean;
}> = ({ height, width, unit, scale, showBlocks }) => {
  const diagramHeight = height * (unit === "feet" ? 12 : 1) * scale;
  const diagramWidth = width * (unit === "feet" ? 12 : 1) * scale;
  const blockSizePx = BLOCK_SIZE * scale;

  const blocksHeight = Math.floor(
    (height * (unit === "feet" ? 12 : 1)) / BLOCK_SIZE
  );
  const blocksWidth = Math.floor(
    (width * (unit === "feet" ? 12 : 1)) / BLOCK_SIZE
  );

  return (
    <div className="px-6 pb-6">
      <div className="flex justify-end text-sm text-muted-foreground mb-2">
        <span className="text-gray-400">
          {width} {unit} width
        </span>
      </div>
      <div className="flex items-start justify-center">
        <div
          className="text-sm text-gray-400 mr-2"
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            transform: "rotate(180deg)",
            height: `${diagramHeight}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {height} {unit} height
        </div>
        <div
          className="relative border border-gray-600 bg-gray-900/50 rounded-lg"
          style={{
            width: diagramWidth,
            height: diagramHeight,
          }}
        >
          {showBlocks
            ? Array.from({ length: blocksHeight }).map((_, rowIndex) =>
                Array.from({ length: blocksWidth }).map((_, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    style={{
                      position: "absolute",
                      top: rowIndex * blockSizePx,
                      left: colIndex * blockSizePx,
                      width: blockSizePx,
                      height: blockSizePx,
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      boxSizing: "border-box",
                    }}
                  />
                ))
              )
            : null}
        </div>
      </div>
    </div>
  );
};

export default function CustomArtRequest() {
  const [formData, setFormData] = useState({
    height: "36",
    width: "60",
    unit: "inches" as "inches" | "feet",
    isExpedited: false,
    selectedSize: "custom" as ItemSizes | "custom",
  });
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown>({
    basePrice: 0,
    shipping: {
      base: 0,
      additionalHeight: 0,
      expedited: 0,
      total: 0,
    },
    tax: 0,
    total: 0,
  });
  const [showBlocks, setShowBlocks] = useState(false);
  const [scale, setScale] = useState(1);
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"dimensions" | "preview">(
    "dimensions"
  );

  useEffect(() => {
    updateCostBreakdown(formData.height, formData.width);
  }, []);

  useEffect(() => {
    const calculateScale = () => {
      if (!cardRef.current) return 1;

      const cardWidth = cardRef.current.offsetWidth;
      const maxWidth = cardWidth - DIAGRAM_PADDING;
      const maxHeight = window.innerHeight * 0.6;
      const widthInInches =
        parseFloat(formData.width) * (formData.unit === "feet" ? 12 : 1);
      const heightInInches =
        parseFloat(formData.height) * (formData.unit === "feet" ? 12 : 1);
      const aspectRatio = widthInInches / heightInInches;

      let newScale: number;
      if (maxWidth / aspectRatio <= maxHeight) {
        newScale = maxWidth / widthInInches;
      } else {
        newScale = maxHeight / heightInInches;
      }

      return newScale;
    };

    const handleResize = () => {
      setScale(calculateScale());
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [formData.width, formData.height, formData.unit]);

  const calculateCost = (
    h: number,
    w: number,
    expedited: boolean
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

    // Calculate base price using interpolation
    const basePrice = interpolatePrice(totalBlocks, PRICE_DATA_POINTS);

    // Calculate shipping
    const baseShipping = 0;
    let additionalHeightCharge = 0;
    if (h > 65) {
      const extraHeight = h - 65;
      additionalHeightCharge = Math.ceil(extraHeight / 16) * 100;
    }
    const expeditedCharge = expedited ? 75 : 0;
    const totalShipping =
      baseShipping + additionalHeightCharge + expeditedCharge;

    // Calculate tax
    const taxRate = 0.1;
    const tax = (basePrice + totalShipping) * taxRate;

    // Calculate total
    const total = basePrice + totalShipping + tax;

    return {
      basePrice,
      shipping: {
        base: baseShipping,
        additionalHeight: additionalHeightCharge,
        expedited: expeditedCharge,
        total: totalShipping,
      },
      tax,
      total,
      debug: debugInfo,
    };
  };

  const updateCostBreakdown = (h: string, w: string) => {
    const heightInInches = parseFloat(h) * (formData.unit === "feet" ? 12 : 1);
    const widthInInches = parseFloat(w) * (formData.unit === "feet" ? 12 : 1);
    if (!isNaN(heightInInches) && !isNaN(widthInInches) && widthInInches > 0) {
      setCostBreakdown(
        calculateCost(heightInInches, widthInInches, formData.isExpedited)
      );
    } else {
      setCostBreakdown({
        basePrice: 0,
        shipping: { base: 0, additionalHeight: 0, expedited: 0, total: 0 },
        tax: 0,
        total: 0,
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

  const handleExpeditedChange = (checked: boolean) => {
    // Update the form data first
    setFormData((prev) => ({
      ...prev,
      isExpedited: checked,
    }));

    // Calculate dimensions in inches
    const heightInInches =
      parseFloat(formData.height) * (formData.unit === "feet" ? 12 : 1);
    const widthInInches =
      parseFloat(formData.width) * (formData.unit === "feet" ? 12 : 1);

    // Update cost breakdown with the new expedited status
    setCostBreakdown(calculateCost(heightInInches, widthInInches, checked));
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <Card
        ref={cardRef}
        className="w-full mx-auto bg-[#1a1f2b]/95 border-gray-800 backdrop-blur-sm"
        style={{
          maxWidth:
            activeTab === "preview"
              ? `${Math.max(
                  scale * parseFloat(formData.width) + DIAGRAM_PADDING * 2,
                  DEFAULT_CARD_WIDTH
                )}px`
              : `${DEFAULT_CARD_WIDTH}px`,
        }}
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
          <Tabs
            defaultValue="dimensions"
            className="w-full"
            onValueChange={(value) =>
              setActiveTab(value as "dimensions" | "preview")
            }
          >
            <TabsList className="grid w-full grid-cols-2 bg-gray-800/50">
              <TabsTrigger
                value="dimensions"
                className="data-[state=active]:bg-gray-700"
              >
                Dimensions
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="data-[state=active]:bg-gray-700"
              >
                Preview
              </TabsTrigger>
            </TabsList>
            <TabsContent value="dimensions">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid w-full items-center gap-4">
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
                        className="bg-gray-800 border-gray-700"
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
                        className="bg-gray-800 border-gray-700"
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
                        className="bg-gray-800 border-gray-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Unit</Label>
                    <RadioGroup
                      value={formData.unit}
                      onValueChange={handleUnitChange}
                      className="flex space-x-4"
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

                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      checked={formData.isExpedited}
                      id="expedited"
                      onCheckedChange={(checked) =>
                        handleExpeditedChange(checked === true)
                      }
                    />
                    <Label
                      htmlFor="expedited"
                      className="text-gray-300 cursor-pointer"
                    >
                      Expedited Shipping (+$75)
                    </Label>
                  </div>
                </div>
              </form>
            </TabsContent>
            <TabsContent value="preview">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={showBlocks}
                    id="showBlocks"
                    onCheckedChange={setShowBlocks}
                  />
                  <Label
                    htmlFor="showBlocks"
                    className="text-gray-300 cursor-pointer"
                  >
                    Show Blocks
                  </Label>
                </div>
                <ArtDiagram
                  height={parseFloat(formData.height)}
                  scale={scale}
                  showBlocks={showBlocks}
                  unit={formData.unit}
                  width={parseFloat(formData.width)}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col items-start border-t border-gray-800 pt-6">
          <div className="w-full space-y-2">
            <div className="mb-4 p-4 bg-gray-900 rounded-md text-sm font-mono">
              <h4 className="text-gray-400 mb-2">Debug Information:</h4>
              {costBreakdown.debug && (
                <div className="space-y-1 text-gray-300">
                  <div>
                    Dimensions: {costBreakdown.debug.dimensions.height}" ×{" "}
                    {costBreakdown.debug.dimensions.width}"
                  </div>
                  <div>
                    Blocks: {costBreakdown.debug.blocks.height} ×{" "}
                    {costBreakdown.debug.blocks.width} ={" "}
                    {costBreakdown.debug.blocks.total} total blocks
                  </div>
                  <div>Base Price: ${costBreakdown.basePrice.toFixed(2)}</div>
                  <div>
                    Price per Block: $
                    {(
                      costBreakdown.basePrice / costBreakdown.debug.blocks.total
                    ).toFixed(2)}
                  </div>
                  <div className="mt-2 border-t border-gray-800 pt-2">
                    <div>Shipping Breakdown:</div>
                    <div className="pl-4">
                      <div>
                        Base Shipping: ${costBreakdown.shipping.base.toFixed(2)}
                      </div>
                      <div>
                        Height Charge: $
                        {costBreakdown.shipping.additionalHeight.toFixed(2)}
                      </div>
                      <div>
                        Expedited Fee: $
                        {costBreakdown.shipping.expedited.toFixed(2)}
                      </div>
                      <div>
                        Total Shipping: $
                        {costBreakdown.shipping.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-800 pt-2">
                    <div>
                      Subtotal (Pre-tax): $
                      {(
                        costBreakdown.basePrice + costBreakdown.shipping.total
                      ).toFixed(2)}
                    </div>
                    <div>Tax (10%): ${costBreakdown.tax.toFixed(2)}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xl font-semibold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                Total Cost: ${costBreakdown.total.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 w-full mt-4">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Order
            </Button>
            <Button
              className="w-full border-gray-700 hover:bg-gray-800"
              variant="outline"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button className="w-full bg-gray-700 hover:bg-gray-600">
              <ExternalLink className="w-4 h-4 mr-2" />
              Etsy
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
