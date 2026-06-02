"use client";

import React, { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PILL_INTERACTIVE,
  PILL_SELECTED_RING,
  SizePillContent,
  sizePillFullClass,
} from "@/components/ui/order-pills";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ItemSizes } from "@/typings/types";

interface CostBreakdown {
  pricePerSquare: number;
  basePrice: number;
  shipping: {
    base: number;
    additionalHeight: number;
    total: number;
  };
  rawTotal: number; // before rounding to the nearest $5
  total: number; // rounded to the nearest $5
  weight: {
    grams: number;
    pounds: number; // rounded UP to the nearest pound
  };
  dims: {
    height: { inches: number; squares: number };
    width: { inches: number; squares: number };
    totalSquares: number;
  };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const SQUARE_SIZE = 3; // inches per square (dimensions round to the nearest 3")
const DEFAULT_PRICE_PER_SQUARE = 4.2; // dollars per square
const TOTAL_ROUNDING_INCREMENT = 5; // estimated total rounds to the nearest $5
const GRAMS_PER_SQUARE = 96;
const GRAMS_PER_POUND = 453.592;
const SHIPPING_HEIGHT_THRESHOLD = 65; // inches before extra-height shipping kicks in
const SHIPPING_HEIGHT_STEP = 16; // inches per extra-height charge
const SHIPPING_HEIGHT_CHARGE = 100; // dollars per extra-height step

// "40 x 16" is already the last ItemSizes member, so the enum values alone
// cover every standard size — appending it again would double-render it.
const CALCULATOR_SIZES: string[] = [...Object.values(ItemSizes)];

// Shepit sizes are labeled directly in inches (e.g. `18" x 24"`) rather than
// in 3"-square counts like the standard sizes. The size-select handler treats
// any string with a quote as raw inches and skips the × SQUARE_SIZE step.
const SHEPIT_SIZES: string[] = ['10" x 18"', '18" x 24"', '24" x 36"'];

const isInchSize = (size: string) => size.includes('"');

const formatMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const emptyBreakdown = (pricePerSquare: number): CostBreakdown => ({
  pricePerSquare,
  basePrice: 0,
  shipping: { base: 0, additionalHeight: 0, total: 0 },
  rawTotal: 0,
  total: 0,
  weight: { grams: 0, pounds: 0 },
  dims: {
    height: { inches: 0, squares: 0 },
    width: { inches: 0, squares: 0 },
    totalSquares: 0,
  },
});

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 💰 COST CALCULATION                                                  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const computeBreakdown = (
  heightStr: string,
  widthStr: string,
  unit: "inches" | "feet",
  pricePerSquare: number
): CostBreakdown => {
  const factor = unit === "feet" ? 12 : 1;
  const rawHeight = parseFloat(heightStr) * factor;
  const rawWidth = parseFloat(widthStr) * factor;

  if (
    isNaN(rawHeight) ||
    isNaN(rawWidth) ||
    rawHeight <= 0 ||
    rawWidth <= 0
  ) {
    return emptyBreakdown(pricePerSquare);
  }

  // Round each dimension to the nearest 3" (one square).
  const heightInches = Math.round(rawHeight / SQUARE_SIZE) * SQUARE_SIZE;
  const widthInches = Math.round(rawWidth / SQUARE_SIZE) * SQUARE_SIZE;
  const heightSquares = heightInches / SQUARE_SIZE;
  const widthSquares = widthInches / SQUARE_SIZE;
  const totalSquares = heightSquares * widthSquares;

  // Weight rounded UP to the nearest pound.
  const weightInGrams = totalSquares * GRAMS_PER_SQUARE;
  const weightInPounds = Math.ceil(weightInGrams / GRAMS_PER_POUND);

  const basePrice = totalSquares * pricePerSquare;

  let additionalHeightCharge = 0;
  if (heightInches > SHIPPING_HEIGHT_THRESHOLD) {
    const extraHeight = heightInches - SHIPPING_HEIGHT_THRESHOLD;
    additionalHeightCharge =
      Math.ceil(extraHeight / SHIPPING_HEIGHT_STEP) * SHIPPING_HEIGHT_CHARGE;
  }
  const totalShipping = additionalHeightCharge;

  const rawTotal = basePrice + totalShipping;
  // Always round the estimated total to the nearest $5.
  const total =
    Math.round(rawTotal / TOTAL_ROUNDING_INCREMENT) * TOTAL_ROUNDING_INCREMENT;

  return {
    pricePerSquare,
    basePrice,
    shipping: {
      base: 0,
      additionalHeight: additionalHeightCharge,
      total: totalShipping,
    },
    rawTotal,
    total,
    weight: { grams: weightInGrams, pounds: weightInPounds },
    dims: {
      height: { inches: heightInches, squares: heightSquares },
      width: { inches: widthInches, squares: widthSquares },
      totalSquares,
    },
  };
};

export default function CustomArtRequest() {
  const [formData, setFormData] = useState({
    height: "36",
    width: "60",
    unit: "inches" as "inches" | "feet",
    selectedSize: "custom" as string,
  });
  const [pricePerSquare, setPricePerSquare] = useState(
    String(DEFAULT_PRICE_PER_SQUARE)
  );
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown>(
    emptyBreakdown(DEFAULT_PRICE_PER_SQUARE)
  );

  // Effective price: falls back to the default if the field is blank/invalid.
  const parsedPrice = parseFloat(pricePerSquare);
  const effectivePrice =
    isNaN(parsedPrice) || parsedPrice < 0 ? DEFAULT_PRICE_PER_SQUARE : parsedPrice;

  // Recompute whenever any input changes. Keying off formData (rather than
  // recomputing inside each handler) keeps the math in sync with the unit —
  // the old code read a stale unit and mis-computed after a Feet/Inches switch.
  useEffect(() => {
    setCostBreakdown(
      computeBreakdown(
        formData.height,
        formData.width,
        formData.unit,
        effectivePrice
      )
    );
  }, [formData.height, formData.width, formData.unit, effectivePrice]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      selectedSize: "custom",
    }));
  };

  const handleUnitChange = (newUnit: "inches" | "feet") => {
    const factor = newUnit === "feet" ? 1 / 12 : 12;
    // Keep a blank/invalid field as-is rather than writing the literal "NaN".
    const convert = (value: string) => {
      const n = parseFloat(value);
      return isNaN(n) ? value : (n * factor).toFixed(newUnit === "feet" ? 2 : 0);
    };
    setFormData((prev) => ({
      ...prev,
      unit: newUnit,
      height: convert(formData.height),
      width: convert(formData.width),
    }));
  };

  const handleSizeSelect = (size: string) => {
    if (size !== "custom") {
      // Shepit sizes are already in inches ("10\" x 18\""); standard sizes
      // are in 3"-square counts ("14 x 7" → 42" x 21"). parseInt strips the
      // quote so both shapes parse the same.
      const inchSize = isInchSize(size);
      const [width = "0", height = "0"] = size
        .split(/\s*x\s*/)
        .map((s) => parseInt(s) * (inchSize ? 1 : SQUARE_SIZE));
      setFormData((prev) => ({
        ...prev,
        selectedSize: size,
        width: width.toString(),
        height: height.toString(),
        unit: "inches",
      }));
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
      `Request submitted for a ${formData.height} ${formData.unit} x ${formData.width} ${formData.unit} art piece. Total cost: ${formatMoney(
        costBreakdown.total
      )}`
    );
  };

  const standardSizeCosts = React.useMemo(() => {
    return CALCULATOR_SIZES.map((size) => {
      const [widthSquares = 0, heightSquares = 0] = size
        .split(" x ")
        .map((s) => parseInt(s));
      // In handleSizeSelect the first number is Width, second is Height.
      const widthInches = widthSquares * SQUARE_SIZE;
      const heightInches = heightSquares * SQUARE_SIZE;

      const cost = computeBreakdown(
        String(heightInches),
        String(widthInches),
        "inches",
        effectivePrice
      );

      const minDim = Math.min(widthInches, heightInches);
      const maxDim = Math.max(widthInches, heightInches);
      const maxDimFeet = parseFloat((maxDim / 12).toFixed(2));

      return {
        size,
        cost: cost.total,
        label: `${minDim}" x ${maxDimFeet} Feet`,
      };
    });
  }, [effectivePrice]);

  const hasDims = costBreakdown.dims.totalSquares > 0;
  const priceChanged = effectivePrice !== DEFAULT_PRICE_PER_SQUARE;

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-950 text-black dark:text-white">
      <div className="select-none bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-full mx-auto px-2 sm:px-3 lg:px-4">
          <div className="flex items-center gap-3 py-3 sm:min-w-[220px]">
            <span className="hidden sm:block h-7 w-1 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
            <h1 className="heading-tool">Custom Art Calculator</h1>
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
                    className={`flex flex-col items-start text-left gap-1.5 px-3 py-2.5 rounded-xl ring-1 ring-inset transition-colors w-full ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-950/40 ring-blue-500"
                        : "bg-gray-100 dark:bg-gray-800/60 ring-gray-200/60 dark:ring-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700/60"
                    }`}
                  >
                    <span className={sizePillFullClass(item.size)}>
                      <SizePillContent size={item.size} />
                    </span>
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                      {item.label} · {formatMoney(item.cost)}
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-2xl w-full max-w-xl flex-1">
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
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSizeSelect("custom")}
                        className={`${sizePillFullClass("Custom")} ${PILL_INTERACTIVE} ${
                          formData.selectedSize === "custom"
                            ? PILL_SELECTED_RING
                            : ""
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
                            className={`${sizePillFullClass(size)} ${PILL_INTERACTIVE} ${
                              isActive ? PILL_SELECTED_RING : ""
                            }`}
                          >
                            <SizePillContent size={size} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Shepit</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {SHEPIT_SIZES.map((size) => {
                        const isActive = formData.selectedSize === size;
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => handleSizeSelect(size)}
                            className={`${sizePillFullClass(size)} ${PILL_INTERACTIVE} ${
                              isActive ? PILL_SELECTED_RING : ""
                            }`}
                          >
                            <SizePillContent size={size} />
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

                  <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
                    Dimensions are rounded to the nearest 3&Prime; (1 square = 3&Prime;).
                  </p>

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

                  <div className="space-y-2">
                    <Label htmlFor="pricePerSquare">
                      Price per square{" "}
                      <span className="text-gray-400 font-normal">(temporary)</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="relative w-40">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <Input
                          id="pricePerSquare"
                          name="pricePerSquare"
                          type="number"
                          step="0.1"
                          min="0"
                          value={pricePerSquare}
                          onChange={(e) => setPricePerSquare(e.target.value)}
                          className="h-10 pl-6"
                        />
                      </div>
                      <span className="text-sm text-gray-500">/ square</span>
                      {priceChanged && (
                        <button
                          type="button"
                          onClick={() =>
                            setPricePerSquare(String(DEFAULT_PRICE_PER_SQUARE))
                          }
                          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Reset to {formatMoney(DEFAULT_PRICE_PER_SQUARE)}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Defaults to {formatMoney(DEFAULT_PRICE_PER_SQUARE)}. Changes
                      here are temporary — they only affect this calculator.
                    </p>
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

                  {hasDims ? (
                    <>
                      <div className="space-y-2 text-gray-700 dark:text-gray-300">
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">
                            Dimensions
                            <span className="block text-[10px] text-gray-400">
                              rounded to nearest 3&Prime;
                            </span>
                          </span>
                          <span className="text-right">
                            {costBreakdown.dims.height.inches}&Prime; (
                            {costBreakdown.dims.height.squares} sqrs) &times;{" "}
                            {costBreakdown.dims.width.inches}&Prime; (
                            {costBreakdown.dims.width.squares} sqrs)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Squares</span>
                          <span>
                            {costBreakdown.dims.height.squares} &times;{" "}
                            {costBreakdown.dims.width.squares} ={" "}
                            {costBreakdown.dims.totalSquares} sqrs
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Weight
                            <span className="block text-[10px] text-gray-400">
                              rounded up
                            </span>
                          </span>
                          <span>{costBreakdown.weight.pounds} lb</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800 space-y-1 text-gray-700 dark:text-gray-300">
                        <div className="text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase text-[10px] tracking-wider">
                          Estimated total math
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>
                            {costBreakdown.dims.totalSquares} sqrs &times;{" "}
                            {formatMoney(costBreakdown.pricePerSquare)}
                          </span>
                          <span>{formatMoney(costBreakdown.basePrice)}</span>
                        </div>
                        {costBreakdown.shipping.total > 0 && (
                          <div className="flex justify-between gap-2">
                            <span className="text-gray-500">
                              Shipping (height &gt; {SHIPPING_HEIGHT_THRESHOLD}
                              &Prime;)
                            </span>
                            <span>+ {formatMoney(costBreakdown.shipping.total)}</span>
                          </div>
                        )}
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Subtotal</span>
                          <span>{formatMoney(costBreakdown.rawTotal)}</span>
                        </div>
                        <div className="flex justify-between gap-2 font-semibold">
                          <span className="text-gray-500">
                            Rounded to nearest ${TOTAL_ROUNDING_INCREMENT}
                          </span>
                          <span>{formatMoney(costBreakdown.total)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500">
                      Enter a valid height and width to see the estimate.
                    </p>
                  )}
                </div>

                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 rounded-xl border border-emerald-500/20 w-full">
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Estimated Total
                  </span>
                  <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {formatMoney(costBreakdown.total)}
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
