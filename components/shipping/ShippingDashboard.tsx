'use client'

import { AlertCircle, Copy, DollarSign, MapPin, Minus, Package, Plus, Printer, Truck, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { type Receipt } from '@/typings/interfaces'
import { getBoxData } from '@/utils/functions'

import { createShippingLabel, getShippingRates } from '../../lib/shipstation-api'
import { type Item, type ItemSizes } from '../../typings/types'

interface Box {
  length: string;
  width: string;
  height: string;
  weight: string;
}

interface Address {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface ShippingDashboardProps {
  item: Item;
  onClose: () => void;
}

export const ShippingDashboard = ({ item, onClose }: ShippingDashboardProps) => {
  const [boxes, setBoxes] = useState<Box[]>([{ length: '', width: '', height: '', weight: '' }])
  const [rates, setRates] = useState<any[]>([])
  const [customerName, setCustomerName] = useState('')
  const [fromAddress, setFromAddress] = useState<Address>({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  })
  const [toAddress, setToAddress] = useState<Address>({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGetRates = async () => {
    if (!fromAddress.postalCode || !toAddress.postalCode || !toAddress.country) {
      setError('Please fill in all required fields (From Postal Code, To Postal Code, and Country).')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const ratesPromises = boxes.map(box => 
        getShippingRates({
          weight: parseFloat(box.weight) || 0,
          length: parseFloat(box.length) || 0,
          width: parseFloat(box.width) || 0,
          height: parseFloat(box.height) || 0
        }, fromAddress, toAddress)
      )
      const ratesResults = await Promise.all(ratesPromises)
      const flattenedRates = ratesResults.flat()
      
      // Group rates by carrier and service
      const groupedRates = flattenedRates.reduce((acc, rate) => {
        const key = `${rate.serviceName.split(" ")[0]}-${rate.serviceName}`
        if (!acc[key]) {
          acc[key] = { ...rate, boxes: 1, totalCost: rate.shipmentCost + (rate.otherCost || 0) }
        } else {
          acc[key].boxes += 1
          acc[key].totalCost += rate.shipmentCost + (rate.otherCost || 0)
        }
        return acc
      }, {})

      setRates(Object.values(groupedRates))
    } catch (err) {
      setError('Failed to fetch shipping rates. Please try again.')
      console.error(err)
    }
    setIsLoading(false)
  }

  const handlePrintLabel = async (rate: any) => {
    setIsLoading(true)
    setError(null)
    try {
      const labelResponse = await createShippingLabel(rate.rateId, {
        carrierCode: rate.carrierCode,
        serviceCode: rate.serviceCode,
        weight: boxes.map(box => ({
          value: parseFloat(box.weight) || 0,
          units: 'pounds'
        })),
        dimensions: boxes.map(box => ({
          length: parseFloat(box.length) || 0,
          width: parseFloat(box.width) || 0,
          height: parseFloat(box.height) || 0,
          units: 'inches'
        })),
        fromAddress,
        toAddress: {
          name: customerName,
          ...toAddress
        },
      })
      window.open(labelResponse.labelDownload, '_blank')
    } catch (err) {
      setError('Failed to create shipping label. Please try again.')
      console.error(err)
    }
    setIsLoading(false)
  }

  const addBox = () => {
    const lastBox = boxes[boxes.length - 1]
    const newBox = lastBox?.length || lastBox?.width || lastBox?.height || lastBox?.weight
      ? { ...lastBox }
      : { length: '', width: '', height: '', weight: '' }
    setBoxes([...boxes, newBox])
  }

  const removeBox = (index: number) => {
    const newBoxes = boxes.filter((_, i) => i !== index)
    setBoxes(newBoxes)
  }

  const updateBox = (index: number, field: keyof Box, value: string) => {
    const newBoxes = boxes.map((box, i) => {
      if (i === index) {
        return { ...box, [field]: value }
      }
      return box
    })
    setBoxes(newBoxes)
  }

  const updateFromAddress = (field: keyof Address, value: string) => {
    setFromAddress(prev => ({ ...prev, [field]: value }))
  }

  const updateToAddress = (field: keyof Address, value: string) => {
    if (field === 'country' || field === 'state') {
      value = value.toUpperCase().slice(0, 2)
    }
    setToAddress(prev => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    if (item.receipt) {
      const receipt = item.receipt;
      
      setCustomerName(receipt.name || '');

      setFromAddress({...fromAddress, postalCode: '89012'})
      
      setToAddress({
        line1: receipt.first_line || '',
        line2: receipt.second_line || '',
        city: receipt.city || '',
        state: receipt.state.slice(0, 2).toUpperCase() || '',
        postalCode: receipt.zip || '',
        country: receipt.country_iso || 'US',
      });

      const sizeValue = item.values.find(v => v.columnName === 'Size')?.text as ItemSizes;
      if (sizeValue) {
        const boxDataArray = getBoxData(sizeValue);
        const newBoxes: Box[] = boxDataArray.map(boxData => ({
          length: boxData.length.toString(),
          width: boxData.width.toString(),
          height: boxData.height.toString(),
          weight: boxData.weight, // Convert ounces to pounds
        }));
        setBoxes(newBoxes);
      }
    }
  }, [item]);

  return (
    <Card className="w-full max-w-4xl mx-auto bg-white shadow-lg">
      <CardHeader className="bg-black text-white">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold flex items-center">
            <Truck className="mr-2 h-6 w-6" />
            Shipping Dashboard
          </CardTitle>
          <Button className="text-white hover:text-gray-300" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>
        <CardDescription className="text-gray-300">
          Get real-time shipping rates and print labels
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
          <div className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Required Fields</AlertTitle>
              <AlertDescription>
                Fields marked with * are required. For the Country and State fields, please use the two-letter codes (e.g., US for United States, CA for California).
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700" htmlFor="fromPostalCode">From Postal Code *</Label>
                <Input
                  required
                  className="border-gray-300 focus:ring-black focus:border-black"
                  id="fromPostalCode"
                  placeholder="Enter from postal code"
                  value={fromAddress.postalCode}
                  onChange={(e) => updateFromAddress('postalCode', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700" htmlFor="customerName">Customer Name</Label>
                <Input
                  className="border-gray-300 focus:ring-black focus:border-black"
                  id="customerName"
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700" htmlFor="addressLine1">Address Line 1</Label>
                <Input
                  className="border-gray-300 focus:ring-black focus:border-black"
                  id="addressLine1"
                  placeholder="Enter address line 1"
                  value={toAddress.line1}
                  onChange={(e) => updateToAddress('line1', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700" htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  className="border-gray-300 focus:ring-black focus:border-black"
                  id="addressLine2"
                  placeholder="Enter address line 2 (optional)"
                  value={toAddress.line2}
                  onChange={(e) => updateToAddress('line2', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700" htmlFor="city">City</Label>
                <Input
                  className="border-gray-300 focus:ring-black focus:border-black"
                  id="city"
                  placeholder="Enter city"
                  value={toAddress.city}
                  onChange={(e) => updateToAddress('city', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700" htmlFor="state">State * (2-letter code)</Label>
                <Input
                  required
                  className="border-gray-300 focus:ring-black focus:border-black"
                  id="state"
                  maxLength={2}
                  placeholder="Enter state code (e.g., CA)"
                  value={toAddress.state}
                  onChange={(e) => updateToAddress('state', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700" htmlFor="postalCode">Postal Code *</Label>
                <Input
                  required
                  className="border-gray-300 focus:ring-black focus:border-black"
                  id="postalCode"
                  placeholder="Enter postal code"
                  value={toAddress.postalCode}
                  onChange={(e) => updateToAddress('postalCode', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700" htmlFor="country">Country * (2-letter code)</Label>
                <Input
                  required
                  className="border-gray-300 focus:ring-black focus:border-black"
                  id="country"
                  maxLength={2}
                  placeholder="Enter country code (e.g., US)"
                  value={toAddress.country}
                  onChange={(e) => updateToAddress('country', e.target.value)}
                />
              </div>
            </div>
            <Separator className="my-6" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Package Details</h3>
                <Button className="border-black text-black hover:bg-gray-100" size="sm" variant="outline" onClick={addBox}>
                  <Copy className="mr-2 h-4 w-4" /> Add Box
                </Button>
              </div>
              {boxes.map((box, index) => (
                <Card key={index} className="p-4 bg-gray-50 border border-gray-200">
                  <div className="grid grid-cols-5 gap-4">
                    <div className="col-span-1 relative">
                      <Input
                        className="pr-12 border-gray-300 focus:ring-black focus:border-black"
                        placeholder="Length"
                        value={box.length}
                        onChange={(e) => updateBox(index, 'length', e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">inches</span>
                    </div>
                    <div className="col-span-1 relative">
                      <Input
                        className="pr-12 border-gray-300 focus:ring-black focus:border-black"
                        placeholder="Width"
                        value={box.width}
                        onChange={(e) => updateBox(index, 'width', e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">inches</span>
                    </div>
                    <div className="col-span-1 relative">
                      <Input
                        className="pr-12 border-gray-300 focus:ring-black focus:border-black"
                        placeholder="Height"
                        value={box.height}
                        onChange={(e) => updateBox(index, 'height', e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">inches</span>
                    </div>
                    <div className="col-span-1 relative">
                      <Input
                        className="pr-10 border-gray-300 focus:ring-black focus:border-black"
                        placeholder="Weight"
                        value={box.weight}
                        onChange={(e) => updateBox(index, 'weight', e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">lbs</span>
                    </div>
                    <Button className="col-span-1 border-black text-black hover:bg-gray-200" size="icon" variant="outline" onClick={() => removeBox(index)}>
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            <Separator className="my-6" />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Get Shipping Rates</h3>
              <div className="flex items-end">
                <Button className="w-full bg-black text-white hover:bg-gray-800" disabled={isLoading} onClick={handleGetRates}>
                  <DollarSign className="mr-2 h-4 w-4" /> {isLoading ? 'Loading...' : 'Get Rates'}
                </Button>
              </div>
            </div>
            {error ? <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert> : null}
            {rates.length > 0 && (
              <Card className="mt-6 border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Shipping Rates Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Carrier</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Cost per Box</TableHead>
                        <TableHead>Total Cost</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rates.map((rate) => (
                        <TableRow key={`${rate.serviceName.split(" ")[0]}-${rate.serviceName}`}>
                          <TableCell className="font-medium">{rate.serviceName.split(" ")[0]}</TableCell>
                          <TableCell>{rate.serviceName}</TableCell>
                          <TableCell>${(rate.totalCost / rate.boxes).toFixed(2)}</TableCell>
                          <TableCell>${rate.totalCost.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button 
                              className="border-black text-black hover:bg-gray-100" 
                              disabled={isLoading} 
                              size="sm" 
                              variant="outline"
                              onClick={() => handlePrintLabel(rate)}
                            >
                              <Printer className="mr-2 h-4 w-4" /> {isLoading ? 'Processing...' : 'Print Label'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            <p className="text-sm text-gray-500 mt-4">
              Rates are provided by ShipStation and may vary based on actual package dimensions and destination.
            </p>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}