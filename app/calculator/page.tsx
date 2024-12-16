"use client";

import { ExternalLink, Info, Mail, ShoppingCart } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
}

const BLOCK_SIZE = 3; // Block size in inches
const DEFAULT_CARD_WIDTH = 400; // Default card width in pixels
const DIAGRAM_PADDING = 40; // Padding around the diagram

enum ItemSizes {
  Fourteen_By_Seven = "14 x 7",
  Sixteen_By_Six = "16 x 6",
  Sixteen_By_Ten = "16 x 10",
  Nineteen_By_Ten = "19 x 10",
  TwentyTwo_By_Ten = "22 x 10",
  Nineteen_By_Eleven = "19 x 11",
  TwentyTwo_By_Eleven = "22 x 11",
  TwentySeven_By_Eleven = "27 x 11",
  TwentySeven_By_Fifteen = "27 x 15",
  ThirtyOne_By_Fifteen = "31 x 15",
  ThirtySix_By_Fifteen = "36 x 15",
}

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
        <span>
          {width} {unit} width
        </span>
      </div>
      <div className="flex items-start justify-center">
        <div
          className="text-sm text-muted-foreground mr-2"
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
          className="relative border border-gray-400"
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
                      border: "1px solid blue",
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

type CheckedState = boolean | "indeterminate";

interface ParsedSize {
  width: number;
  height: number;
}

const parseSizeString = (size: string): ParsedSize | null => {
  const [w, h] = size.split(" x ").map((s) => parseInt(s));
  if (isNaN(w) || isNaN(h)) return null;
  return { width: w * BLOCK_SIZE, height: h * BLOCK_SIZE };
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const pricePerSquareInch = 0.5;
    const basePrice = h * w * pricePerSquareInch;

    const baseShipping = 20;
    let additionalHeightCharge = 0;
    if (h > 65) {
      const extraHeight = h - 65;
      additionalHeightCharge = Math.ceil(extraHeight / 16) * 100;
    }
    const expeditedCharge = expedited ? 75 : 0;
    const totalShipping =
      baseShipping + additionalHeightCharge + expeditedCharge;

    const taxRate = 0.1;
    const tax = (basePrice + totalShipping) * taxRate;

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
    };
  };

  const updateCostBreakdown = (h: string, w: string) => {
    setIsLoading(true);
    setError(null);
    const heightInInches = parseFloat(h) * (formData.unit === "feet" ? 12 : 1);
    const widthInInches = parseFloat(w) * (formData.unit === "feet" ? 12 : 1);
    if (!isNaN(heightInInches) && !isNaN(widthInInches) && widthInInches > 0) {
      setCostBreakdown(
        calculateCost(heightInInches, widthInInches, formData.isExpedited)
      );
    } else {
      setError("Invalid dimensions. Please check your input.");
      setCostBreakdown({
        basePrice: 0,
        shipping: { base: 0, additionalHeight: 0, expedited: 0, total: 0 },
        tax: 0,
        total: 0,
      });
    }
    setIsLoading(false);
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
    setFormData((prev) => ({
      ...prev,
      isExpedited: checked,
    }));
    updateCostBreakdown(formData.height, formData.width);
  };

  const handleSizeSelect = (size: ItemSizes | "custom") => {
    if (size !== "custom") {
      const parsedSize = parseSizeString(size);
      if (parsedSize) {
        const { width, height } = parsedSize;
        setFormData((prev) => ({
          ...prev,
          selectedSize: size,
          width: width.toString(),
          height: height.toString(),
          unit: "inches",
        }));
        updateCostBreakdown(height.toString(), width.toString());
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        selectedSize: "custom",
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (error) {
      alert("Please correct the errors before submitting.");
      return;
    }
    alert(
      `Request submitted for a ${formData.height} ${formData.unit} x ${
        formData.width
      } ${formData.unit} art piece. Total cost: $${costBreakdown.total.toFixed(
        2
      )}`
    );
  };

  return (
    <Card
      ref={cardRef}
      className="w-full mx-auto bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-lg border-t border-gray-100 dark:border-gray-800"
      style={{
        maxWidth: `${Math.max(
          scale * parseFloat(formData.width) + DIAGRAM_PADDING * 2,
          DEFAULT_CARD_WIDTH
        )}px`,
      }}
    >
      <CardHeader className="space-y-1">
        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Custom Art Request
        </CardTitle>
        <CardDescription className="text-lg">
          Design your perfect piece with our interactive size calculator
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="dimensions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 rounded-lg p-1 bg-gray-100 dark:bg-gray-800">
            <TabsTrigger
              value="dimensions"
              className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all duration-200"
            >
              Dimensions
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all duration-200"
            >
              Preview
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dimensions">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid w-full items-center gap-4">
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                    {error}
                  </div>
                )}
                <div>
                  <Label htmlFor="size-select" className="text-lg font-medium">
                    Select Size
                  </Label>
                  <Select
                    value={formData.selectedSize}
                    onValueChange={handleSizeSelect}
                  >
                    <SelectTrigger
                      id="size-select"
                      className="w-full border-2 hover:border-primary transition-colors duration-200"
                      aria-label="Select Size"
                      aria-describedby="size-select-description"
                    >
                      <SelectValue placeholder="Choose a size" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      <SelectItem value="custom" className="font-medium">
                        Custom Size
                      </SelectItem>
                      <div className="h-px bg-gray-200 my-2" />
                      {Object.values(ItemSizes).map((size) => (
                        <SelectItem key={size} value={size}>
                          {size} inches
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div
                    id="size-select-description"
                    className="text-sm text-gray-500"
                  >
                    Choose a predefined size or enter custom dimensions.
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="height" className="text-lg font-medium">
                      Height
                    </Label>
                    <div className="relative">
                      <Input
                        required
                        id="height"
                        name="height"
                        className="pl-3 pr-12 border-2 hover:border-primary transition-colors duration-200"
                        placeholder="Enter height"
                        type="number"
                        min="1"
                        step="0.01"
                        value={formData.height}
                        onChange={handleInputChange}
                        aria-label="Height"
                        aria-describedby="height-description"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                        {formData.unit}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="width" className="text-lg font-medium">
                      Width
                    </Label>
                    <div className="relative">
                      <Input
                        required
                        id="width"
                        name="width"
                        className="pl-3 pr-12 border-2 hover:border-primary transition-colors duration-200"
                        placeholder="Enter width"
                        type="number"
                        min="1"
                        step="0.01"
                        value={formData.width}
                        onChange={handleInputChange}
                        aria-label="Width"
                        aria-describedby="width-description"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                        {formData.unit}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-lg font-medium">Unit</Label>
                  <RadioGroup
                    value={formData.unit}
                    onValueChange={handleUnitChange}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem id="inches" value="inches" />
                      <Label htmlFor="inches">Inches</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem id="feet" value="feet" />
                      <Label htmlFor="feet">Feet</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.isExpedited}
                    id="expedited"
                    onCheckedChange={handleExpeditedChange}
                  />
                  <Label htmlFor="expedited" className="text-lg">
                    Expedited Shipping (+$75)
                  </Label>
                </div>
                <Button
                  className="mt-4 w-full"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </form>
          </TabsContent>
          <TabsContent
            value="preview"
            className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={showBlocks}
                    id="showBlocks"
                    className="border-2"
                    onCheckedChange={(checked: CheckedState) => {
                      if (typeof checked === "boolean") {
                        setShowBlocks(checked);
                      }
                    }}
                  />
                  <Label htmlFor="showBlocks" className="text-sm font-medium">
                    Show Grid
                  </Label>
                </div>
                <div className="text-sm text-gray-500">
                  Scale: {(scale * 100).toFixed(0)}%
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-inner p-4">
                <ArtDiagram
                  height={parseFloat(formData.height)}
                  scale={scale}
                  showBlocks={showBlocks}
                  unit={formData.unit}
                  width={parseFloat(formData.width)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col items-start space-y-4">
        <div className="w-full space-y-2 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Total Cost: ${costBreakdown.total.toFixed(2)}
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="outline">
                  <Info className="h-5 w-5" />
                  <span className="sr-only">Cost breakdown</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium text-lg">Cost Breakdown</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">Base Price:</span>
                      <span>${costBreakdown.basePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Shipping:</span>
                      <span>${costBreakdown.shipping.total.toFixed(2)}</span>
                    </div>
                    <div className="pl-4 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Base Shipping:</span>
                        <span>${costBreakdown.shipping.base.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Additional Height:</span>
                        <span>
                          ${costBreakdown.shipping.additionalHeight.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expedited:</span>
                        <span>
                          ${costBreakdown.shipping.expedited.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Tax:</span>
                      <span>${costBreakdown.tax.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <Button
            className="w-full text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
            disabled={isLoading}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Order Now
          </Button>
          <Button
            className="w-full text-lg"
            variant="outline"
            disabled={isLoading}
          >
            <Mail className="w-5 h-5 mr-2" />
            Email
          </Button>
          <Button
            className="w-full text-lg"
            variant="secondary"
            disabled={isLoading}
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            Etsy
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
