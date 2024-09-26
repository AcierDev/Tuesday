"use client"

import { Suspense, useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DESIGN_COLORS, ItemDesignImages } from '@/utils/constants'
import { ItemDesigns, ItemSizes } from '@/typings/types'
import Image from 'next/image'

interface Design {
  id: string
  name: string
  imageUrl: string
  colors: string[]
}

const designs: Design[] = Object.values(ItemDesigns).map((design, index) => {
    return {
        id: index.toString(),
        name: design,
        imageUrl: ItemDesignImages[design],
        colors: Object.values(DESIGN_COLORS[design] ?? {})?.map(val => val.hex)
    }
})

 function UtilitiesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null)
  const [selectedSize, setSelectedSize] = useState<ItemSizes | "custom">(ItemSizes.Fourteen_By_Seven)
  const [width, setWidth] = useState<string>('14')
  const [height, setHeight] = useState<string>('7')
  const [showBackButton, setShowBackButton] = useState(false)

  useEffect(() => {
    const designId = searchParams.get('design')
    const size = searchParams.get('size')

    if (designId) {
      const design = designs.find(d => d.name === designId)
      if (design) setSelectedDesign(design)
    }

    if (size) {
      if (Object.values(ItemSizes).includes(size as ItemSizes)) {
        setSelectedSize(size as ItemSizes)
        const [w, h] = size.split('x').map(dim => dim.trim())
        setWidth(w)
        setHeight(h)
      }
    }

    setShowBackButton(!!document.referrer)
  }, [searchParams])

  const calculateColorCount = () => {
    if (!selectedDesign || !width || !height) return null

    const totalPieces = parseInt(width) * parseInt(height)
    const colorCount = selectedDesign.colors.length
    const averagePiecesPerColor = totalPieces / colorCount

    // Method 1: Round down and add
    const basePiecesPerColor1 = Math.floor(averagePiecesPerColor)
    const extrasToAdd = totalPieces - (basePiecesPerColor1 * colorCount)

    // Method 2: Round up and subtract
    const basePiecesPerColor2 = Math.ceil(averagePiecesPerColor)
    const extrasToSubtract = (basePiecesPerColor2 * colorCount) - totalPieces

    // Choose the method that requires fewer adjustments
    const useMethod1 = extrasToAdd <= extrasToSubtract

    const basePiecesPerColor = useMethod1 ? basePiecesPerColor1 : basePiecesPerColor2
    const adjustmentCount = useMethod1 ? extrasToAdd : extrasToSubtract
    const adjustmentType = useMethod1 ? 'add' : 'subtract'

    // Distribute adjustments evenly
    const distribution = selectedDesign.colors.map((color) => ({
      color,
      count: basePiecesPerColor
    }))

    // Spread out extra pieces
    for (let i = 0; i < adjustmentCount; i++) {
      const index = Math.floor(i * (colorCount / adjustmentCount))
      distribution[index].count += useMethod1 ? 1 : -1
    }

    return {
      totalPieces,
      colorCount,
      distribution,
      adjustmentCount,
      adjustmentType
    }
  }

  useEffect(() => {
    if (selectedSize !== "custom") {
      const [w, h] = selectedSize.split('x').map(dim => dim.trim())
      setWidth(w)
      setHeight(h)
    }
  }, [selectedSize])

  const handleSizeChange = (value: string) => {
    setSelectedSize(value as ItemSizes | "custom")
  }

  const handleDimensionChange = (dimension: 'width' | 'height', value: string) => {
    if (dimension === 'width') {
      setWidth(value)
    } else {
      setHeight(value)
    }

    const newSize = `${width} x ${height}`
    if (Object.values(ItemSizes).includes(newSize as ItemSizes)) {
      setSelectedSize(newSize as ItemSizes)
    } else {
      setSelectedSize("custom")
    }
  }

  const colorDistribution = calculateColorCount()

  const getImageDimensions = (url: string) => {
    const params = new URLSearchParams(url.split('?')[1])
    return {
      width: parseInt(params.get('width') || '0'),
      height: parseInt(params.get('height') || '0')
    }
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="container mx-auto p-4 space-y-6">
      {showBackButton && (
        <div className="bg-white p-2 rounded-md shadow-sm inline-block">
          <Button variant="ghost" onClick={() => router.back()} className="p-0">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      )}

      <h1 className="text-3xl font-bold">Setup Utility</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Select a Design</CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedDesign?.id || ''} 
            onValueChange={(value) => setSelectedDesign(designs.find(d => d.id === value) || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a design" />
            </SelectTrigger>
            <SelectContent>
              {designs.map((design) => (
                <SelectItem key={design.id} value={design.id}>{design.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedDesign && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{selectedDesign.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Image
                  src={selectedDesign.imageUrl}
                  alt={selectedDesign.name}
                  width={getImageDimensions(selectedDesign.imageUrl).width}
                  height={getImageDimensions(selectedDesign.imageUrl).height}
                  className="w-full h-auto"
                />
              </div>
              <p>Number of colors: {selectedDesign.colors.length}</p>
              <div className="h-8 w-full flex">
                {selectedDesign.colors.map((color, index) => (
                  <div key={index} style={{backgroundColor: color, width: `${100 / selectedDesign.colors.length}%`}} className="h-full" />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calculator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="size-select">Choose a size:</Label>
                <Select value={selectedSize} onValueChange={handleSizeChange}>
                  <SelectTrigger id="size-select">
                    <SelectValue placeholder="Choose a size" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ItemSizes).map((size) => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-width">Dimensions:</Label>
                <div className="flex space-x-2">
                  <Input
                    id="custom-width"
                    type="number"
                    placeholder="Width"
                    value={width}
                    onChange={(e) => handleDimensionChange('width', e.target.value)}
                  />
                  <Input
                    id="custom-height"
                    type="number"
                    placeholder="Height"
                    value={height}
                    onChange={(e) => handleDimensionChange('height', e.target.value)}
                  />
                </div>
              </div>

              {colorDistribution && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Total Pieces</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{colorDistribution.totalPieces}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Adjustment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>
                        {colorDistribution.adjustmentCount} pieces {colorDistribution.adjustmentType === 'add' ? 'added to' : 'subtracted from'} colors, spread evenly across the design
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Distribution Diagram</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full flex flex-wrap">
                        {colorDistribution.distribution.map(({ color, count }, index) => (
                          <div 
                            key={index} 
                            style={{ 
                              backgroundColor: color, 
                              width: `${(count / colorDistribution.totalPieces) * 100}%` 
                            }} 
                            className="h-10 relative group h-20 flex items-center justify-center"
                          >
                            <span className="text-xs font-bold text-white text-shadow">
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </Suspense>
  )
}

export default function UtilitiesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchParamsWrapper>
        {(searchParams) => <UtilitiesContent searchParams={searchParams} />}
      </SearchParamsWrapper>
    </Suspense>
  )
}

function SearchParamsWrapper({ children }) {
  const searchParams = useSearchParams()
  return children(searchParams)
}