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

    const basePiecesPerColor1 = Math.floor(averagePiecesPerColor)
    const extrasToAdd = totalPieces - (basePiecesPerColor1 * colorCount)

    const basePiecesPerColor2 = Math.ceil(averagePiecesPerColor)
    const extrasToSubtract = (basePiecesPerColor2 * colorCount) - totalPieces

    const useMethod1 = extrasToAdd <= extrasToSubtract

    const basePiecesPerColor = useMethod1 ? basePiecesPerColor1 : basePiecesPerColor2
    const adjustmentCount = useMethod1 ? extrasToAdd : extrasToSubtract
    const adjustmentType = useMethod1 ? 'add' : 'subtract'

    const distribution = selectedDesign.colors.map((color) => ({
      color,
      count: basePiecesPerColor
    }))

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
      <div className="container mx-auto p-4 space-y-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {showBackButton && (
        <div className="bg-white dark:bg-gray-800 p-2 rounded-md shadow-sm inline-block">
          <Button variant="ghost" onClick={() => router.back()} className="p-0 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      )}

      <h1 className="text-3xl font-bold">Setup Utility</h1>
      
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100">Select a Design</CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedDesign?.id || ''} 
            onValueChange={(value) => setSelectedDesign(designs.find(d => d.id === value) || null)}
          >
            <SelectTrigger className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <SelectValue placeholder="Choose a design" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-700">
              {designs.map((design) => (
                <SelectItem key={design.id} value={design.id} className="text-gray-900 dark:text-gray-100">{design.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedDesign && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">{selectedDesign.name}</CardTitle>
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
              <p className="text-gray-900 dark:text-gray-100">Number of colors: {selectedDesign.colors.length}</p>
              <div className="h-8 w-full flex">
                {selectedDesign.colors.map((color, index) => (
                  <div key={index} style={{backgroundColor: color, width: `${100 / selectedDesign.colors.length}%`}} className="h-full" />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">Calculator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="size-select" className="text-gray-900 dark:text-gray-100">Choose a size:</Label>
                <Select value={selectedSize} onValueChange={handleSizeChange}>
                  <SelectTrigger id="size-select" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <SelectValue placeholder="Choose a size" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-700">
                    {Object.values(ItemSizes).map((size) => (
                      <SelectItem key={size} value={size} className="text-gray-900 dark:text-gray-100">{size}</SelectItem>
                    ))}
                    <SelectItem value="custom" className="text-gray-900 dark:text-gray-100">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-width" className="text-gray-900 dark:text-gray-100">Dimensions:</Label>
                <div className="flex space-x-2">
                  <Input
                    id="custom-width"
                    type="number"
                    placeholder="Width"
                    value={width}
                    onChange={(e) => handleDimensionChange('width', e.target.value)}
                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <Input
                    id="custom-height"
                    type="number"
                    placeholder="Height"
                    value={height}
                    onChange={(e) => handleDimensionChange('height', e.target.value)}
                    className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              {colorDistribution && (
                <>
                  <Card className="bg-white dark:bg-gray-700">
                    <CardHeader>
                      <CardTitle className="text-gray-900 dark:text-gray-100">Total Pieces</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-900 dark:text-gray-100">{colorDistribution.totalPieces}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-gray-700">
                    <CardHeader>
                      <CardTitle className="text-gray-900 dark:text-gray-100">Adjustment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-900 dark:text-gray-100">
                        {colorDistribution.adjustmentCount} pieces {colorDistribution.adjustmentType === 'add' ? 'added to' : 'subtracted from'} colors, spread evenly across the design
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-gray-700">
                    <CardHeader>
                      <CardTitle className="text-gray-900 dark:text-gray-100">Distribution Diagram</CardTitle>
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