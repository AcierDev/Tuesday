"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ShoppingCart, Mail, ExternalLink, Info } from "lucide-react"

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

export default function CustomArtRequest() {
  const [height, setHeight] = useState("")
  const [width, setWidth] = useState("")
  const [isExpedited, setIsExpedited] = useState(false)
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown>({
    basePrice: 0,
    shipping: {
      base: 0,
      additionalHeight: 0,
      expedited: 0,
      total: 0
    },
    tax: 0,
    total: 0
  })
  const [showDimensions, setShowDimensions] = useState(false)

  const calculateCost = (h: number, w: number, expedited: boolean): CostBreakdown => {
    const pricePerSquareInch = 0.5 // $0.50 per square inch
    const basePrice = h * w * pricePerSquareInch

    // Calculate shipping
    let baseShipping = 20 // Base shipping cost
    let additionalHeightCharge = 0
    if (h > 65) {
      const extraHeight = h - 65
      additionalHeightCharge = Math.ceil(extraHeight / 16) * 100
    }
    let expeditedCharge = expedited ? 75 : 0 // Updated to $75
    let totalShipping = baseShipping + additionalHeightCharge + expeditedCharge

    // Calculate tax (assuming 10% tax rate)
    const taxRate = 0.1
    const tax = (basePrice + totalShipping) * taxRate

    const total = basePrice + totalShipping + tax

    return {
      basePrice,
      shipping: {
        base: baseShipping,
        additionalHeight: additionalHeightCharge,
        expedited: expeditedCharge,
        total: totalShipping
      },
      tax,
      total
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === "height") setHeight(value)
    if (name === "width") setWidth(value)

    const h = Math.max(parseFloat(name === "height" ? value : height) || 0, 18)
    const w = parseFloat(name === "width" ? value : width) || 0

    if (!isNaN(h) && !isNaN(w) && w > 0) {
      setCostBreakdown(calculateCost(h, w, isExpedited))
    } else {
      setCostBreakdown({
        basePrice: 0,
        shipping: { base: 0, additionalHeight: 0, expedited: 0, total: 0 },
        tax: 0,
        total: 0
      })
    }
  }

  const handleExpeditedChange = (checked: boolean) => {
    setIsExpedited(checked)
    const h = parseFloat(height)
    const w = parseFloat(width)
    if (!isNaN(h) && !isNaN(w) && w > 0) {
      setCostBreakdown(calculateCost(h, w, checked))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert(`Request submitted for a ${height}" x ${width}" art piece. Total cost: $${costBreakdown.total.toFixed(2)}`)
  }

  // Convert inches to pixels for diagram scaling (optional)
  const scale = 2 // 1 inch = 2 pixels
  const diagramWidth = parseFloat(width) > 0 ? Math.min(parseFloat(width) * scale, 300) : 0
  const diagramHeight = parseFloat(height) > 0 ? Math.min(parseFloat(height) * scale, 300) : 0

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Custom Art Request</CardTitle>
        <CardDescription>Enter the dimensions for your custom art piece</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="height">Height (inches)</Label>
              <Input
                id="height"
                name="height"
                placeholder="Enter height"
                value={height}
                onChange={handleInputChange}
                type="number"
                min="18"
                required
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="width">Width (inches)</Label>
              <Input
                id="width"
                name="width"
                placeholder="Enter width"
                value={width}
                onChange={handleInputChange}
                type="number"
                min="1"
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="expedited" checked={isExpedited} onCheckedChange={handleExpeditedChange} />
              <Label htmlFor="expedited">Expedited Shipping (+$75)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="showDimensions" checked={showDimensions} onCheckedChange={setShowDimensions} />
              <Label htmlFor="showDimensions">Show Dimensions Diagram</Label>
            </div>
          </div>
          {/* Move buttons inside the form if they are related to form submission */}
        </form>
      </CardContent>
      {showDimensions && parseFloat(width) > 0 && parseFloat(height) > 0 && (
        <div className="px-6 pb-6">
          <div
            className="border-2 border-dashed border-gray-300 relative"
            style={{
              width: `${diagramWidth}px`,
              height: `${diagramHeight}px`,
              maxWidth: '100%',
              maxHeight: '300px'
            }}
          >
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-sm">
              {width}" width
            </span>
            <span
              className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 bg-white px-2 text-sm"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              {height}" height
            </span>
          </div>
        </div>
      )}
      <CardFooter className="flex flex-col items-start">
        <div className="w-full space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total Cost: ${costBreakdown.total.toFixed(2)}</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <Info className="h-4 w-4" />
                  <span className="sr-only">Shipping cost breakdown</span>
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
          <Button type="submit" form="custom-art-form" className="w-full">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Order
          </Button>
          <Button variant="outline" className="w-full">
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button variant="secondary" className="w-full">
            <ExternalLink className="w-4 h-4 mr-2" />
            Etsy
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
