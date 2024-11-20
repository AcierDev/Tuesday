"use client"

import { ExternalLink, Info, Mail, ShoppingCart } from "lucide-react"
import React, { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CostBreakdown {
  basePrice: number
  shipping: {
    base: number
    additionalHeight: number
    expedited: number
    total: number
  }
  tax: number
  total: number
}

const BLOCK_SIZE = 3 // Block size in inches
const DEFAULT_CARD_WIDTH = 400 // Default card width in pixels
const DIAGRAM_PADDING = 40 // Padding around the diagram

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
  height: number
  width: number
  unit: "inches" | "feet"
  scale: number
  showBlocks: boolean
}> = ({ height, width, unit, scale, showBlocks }) => {
  const diagramHeight = height * (unit === "feet" ? 12 : 1) * scale
  const diagramWidth = width * (unit === "feet" ? 12 : 1) * scale
  const blockSizePx = BLOCK_SIZE * scale

  const blocksHeight = Math.floor((height * (unit === "feet" ? 12 : 1)) / BLOCK_SIZE)
  const blocksWidth = Math.floor((width * (unit === "feet" ? 12 : 1)) / BLOCK_SIZE)

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
          {showBlocks ? Array.from({ length: blocksHeight }).map((_, rowIndex) =>
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
            ) : null}
        </div>
      </div>
    </div>
  )
}

export default function CustomArtRequest() {
  const [formData, setFormData] = useState({
    height: "36",
    width: "60",
    unit: "inches" as "inches" | "feet",
    isExpedited: false,
    selectedSize: "custom" as ItemSizes | "custom",
  })
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
  })
  const [showBlocks, setShowBlocks] = useState(false)
  const [scale, setScale] = useState(1)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    updateCostBreakdown(formData.height, formData.width)
  }, [])

  useEffect(() => {
    const calculateScale = () => {
      if (!cardRef.current) return 1

      const cardWidth = cardRef.current.offsetWidth
      const maxWidth = cardWidth - DIAGRAM_PADDING
      const maxHeight = globalThis.innerHeight * 0.6
      const widthInInches = parseFloat(formData.width) * (formData.unit === "feet" ? 12 : 1)
      const heightInInches = parseFloat(formData.height) * (formData.unit === "feet" ? 12 : 1)
      const aspectRatio = widthInInches / heightInInches

      let newScale: number
      if (maxWidth / aspectRatio <= maxHeight) {
        newScale = maxWidth / widthInInches
      } else {
        newScale = maxHeight / heightInInches
      }

      return newScale
    }

    const handleResize = () => {
      setScale(calculateScale())
    }

    handleResize()
    globalThis.addEventListener("resize", handleResize)
    return () => globalThis.removeEventListener("resize", handleResize)
  }, [formData.width, formData.height, formData.unit])

  const calculateCost = (h: number, w: number, expedited: boolean): CostBreakdown => {
    const pricePerSquareInch = 0.5
    const basePrice = h * w * pricePerSquareInch

    const baseShipping = 20
    let additionalHeightCharge = 0
    if (h > 65) {
      const extraHeight = h - 65
      additionalHeightCharge = Math.ceil(extraHeight / 16) * 100
    }
    const expeditedCharge = expedited ? 75 : 0
    const totalShipping = baseShipping + additionalHeightCharge + expeditedCharge

    const taxRate = 0.1
    const tax = (basePrice + totalShipping) * taxRate

    const total = basePrice + totalShipping + tax

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
    }
  }

  const updateCostBreakdown = (h: string, w: string) => {
    const heightInInches = parseFloat(h) * (formData.unit === "feet" ? 12 : 1)
    const widthInInches = parseFloat(w) * (formData.unit === "feet" ? 12 : 1)
    if (!isNaN(heightInInches) && !isNaN(widthInInches) && widthInInches > 0) {
      setCostBreakdown(calculateCost(heightInInches, widthInInches, formData.isExpedited))
    } else {
      setCostBreakdown({
        basePrice: 0,
        shipping: { base: 0, additionalHeight: 0, expedited: 0, total: 0 },
        tax: 0,
        total: 0,
      })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      selectedSize: "custom",
    }))
    updateCostBreakdown(name === "height" ? value : formData.height, name === "width" ? value : formData.width)
  }

  const handleUnitChange = (newUnit: "inches" | "feet") => {
    const factor = newUnit === "feet" ? 1 / 12 : 12
    const newHeight = (parseFloat(formData.height) * factor).toFixed(newUnit === "feet" ? 2 : 0)
    const newWidth = (parseFloat(formData.width) * factor).toFixed(newUnit === "feet" ? 2 : 0)
    setFormData((prev) => ({
      ...prev,
      unit: newUnit,
      height: newHeight,
      width: newWidth,
    }))
    updateCostBreakdown(newHeight, newWidth)
  }

  const handleExpeditedChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isExpedited: checked,
    }))
    updateCostBreakdown(formData.height, formData.width)
  }

  const handleSizeSelect = (size: ItemSizes | "custom") => {
    if (size !== "custom") {
      const [w, h] = size.split(" x ").map((s) => parseInt(s) * BLOCK_SIZE)
      const newWidth = w.toString()
      const newHeight = h.toString()
      setFormData((prev) => ({
        ...prev,
        selectedSize: size,
        width: newWidth,
        height: newHeight,
        unit: "inches",
      }))
      updateCostBreakdown(newHeight, newWidth)
    } else {
      setFormData((prev) => ({
        ...prev,
        selectedSize: "custom",
      }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert(
      `Request submitted for a ${formData.height} ${formData.unit} x ${formData.width} ${formData.unit} art piece. Total cost: $${costBreakdown.total.toFixed(
        2
      )}`
    )
  }

  return (
    <Card
      ref={cardRef}
      className="w-full mx-auto"
      style={{ maxWidth: `${Math.max(scale * parseFloat(formData.width) + DIAGRAM_PADDING * 2, DEFAULT_CARD_WIDTH)}px` }}
    >
      <CardHeader>
        <CardTitle>Custom Art Request</CardTitle>
        <CardDescription>Enter the dimensions for your custom art piece</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="dimensions">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="dimensions">
            <form onSubmit={handleSubmit}>
              <div className="grid w-full items-center gap-4">
                <div>
                  <Label htmlFor="size-select">Select Size</Label>
                  <Select value={formData.selectedSize} onValueChange={handleSizeSelect}>
                    <SelectTrigger id="size-select">
                      <SelectValue placeholder="Choose a size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom</SelectItem>
                      {Object.values(ItemSizes).map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="height">Height</Label>
                  <Input
                    required
                    id="height"
                    name="height"
                    placeholder="Enter height"
                    type="number"
                    value={formData.height}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="width">Width</Label>
                  <Input
                    required
                    id="width"
                    name="width"
                    placeholder="Enter width"
                    type="number"
                    value={formData.width}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <RadioGroup value={formData.unit} onValueChange={handleUnitChange}>
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
                  <Checkbox checked={formData.isExpedited} id="expedited" onCheckedChange={handleExpeditedChange} />
                  <Label htmlFor="expedited">Expedited Shipping (+$75)</Label>
                </div>
                <Button className="mt-4" type="submit">
                  Submit
                </Button>
              </div>
            </form>
          </TabsContent>
          <TabsContent value="preview">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox checked={showBlocks} id="showBlocks" onCheckedChange={setShowBlocks} />
                <Label htmlFor="showBlocks">Show Blocks</Label>
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
      <CardFooter className="flex flex-col items-start">
        <div className="w-full space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total Cost: ${costBreakdown.total.toFixed(2)}</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="outline">
                  <Info className="h-4 w-4" />
                  <span className="sr-only">Cost breakdown</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium">Cost Breakdown</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Base Price:</span>
                      <span>${costBreakdown.basePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping:</span>
                      <span>${costBreakdown.shipping.total.toFixed(2)}</span>
                    </div>
                    <div className="pl-4 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Base Shipping:</span>
                        <span>${costBreakdown.shipping.base.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Additional Height:</span>
                        <span>${costBreakdown.shipping.additionalHeight.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expedited:</span>
                        <span>${costBreakdown.shipping.expedited.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>${costBreakdown.tax.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 w-full mt-4">
          <Button className="w-full">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Order
          </Button>
          <Button className="w-full" variant="outline">
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button className="w-full" variant="secondary">
            <ExternalLink className="w-4 h-4 mr-2" />
            Etsy
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}