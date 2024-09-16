'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Printer, Truck, Plus, Minus, X, Package, MapPin, DollarSign, Copy, AlertCircle } from 'lucide-react'
import { Item } from '../app/typings/types'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { createShippingLabel, getShippingRates } from './shipstation-api'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Receipt } from '@/app/typings/interfaces'

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

export function ShippingDashboard({ item, onClose }: ShippingDashboardProps) {
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
      const ratesResponse = await getShippingRates(boxes[0], fromAddress, toAddress)
      setRates(ratesResponse)
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
        weight: boxes[0],
        dimensions: boxes[0],
        fromAddress: fromAddress,
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
    if (field === 'country') {
      value = value.toUpperCase().slice(0, 2)
    }
    setToAddress(prev => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    if (item && item.receipt) {
      const receipt = item.receipt as Receipt;
      
      setCustomerName(receipt.name || '');
      
      setToAddress({
        line1: receipt.first_line || '',
        line2: receipt.second_line || '',
        city: receipt.city || '',
        state: receipt.state || '',
        postalCode: receipt.zip || '',
        country: receipt.country_iso || '',
      });

      if (receipt.transactions && receipt.transactions.length > 0) {
        const transaction = receipt.transactions[0];
        const newBoxes: Box[] = [{
          length: '',
          width: '',
          height: '',
          weight: transaction?.quantity ? transaction.quantity.toString() : '',
        }];
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
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:text-gray-300">
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
                Fields marked with * are required. For the Country field, please use the two-letter country code (e.g., US for United States, CA for Canada).
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromPostalCode" className="text-sm font-medium text-gray-700">From Postal Code *</Label>
                <Input
                  id="fromPostalCode"
                  value={fromAddress.postalCode}
                  onChange={(e) => updateFromAddress('postalCode', e.target.value)}
                  placeholder="Enter from postal code"
                  className="border-gray-300 focus:ring-black focus:border-black"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerName" className="text-sm font-medium text-gray-700">Customer Name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="border-gray-300 focus:ring-black focus:border-black"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressLine1" className="text-sm font-medium text-gray-700">Address Line 1</Label>
                <Input
                  id="addressLine1"
                  value={toAddress.line1}
                  onChange={(e) => updateToAddress('line1', e.target.value)}
                  placeholder="Enter address line 1"
                  className="border-gray-300 focus:ring-black focus:border-black"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressLine2" className="text-sm font-medium text-gray-700">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  value={toAddress.line2}
                  onChange={(e) => updateToAddress('line2', e.target.value)}
                  placeholder="Enter address line 2 (optional)"
                  className="border-gray-300 focus:ring-black focus:border-black"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium text-gray-700">City</Label>
                <Input
                  id="city"
                  value={toAddress.city}
                  onChange={(e) => updateToAddress('city', e.target.value)}
                  placeholder="Enter city"
                  className="border-gray-300 focus:ring-black focus:border-black"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium text-gray-700">State</Label>
                <Input
                  id="state"
                  value={toAddress.state}
                  onChange={(e) => updateToAddress('state', e.target.value)}
                  placeholder="Enter state"
                  className="border-gray-300 focus:ring-black focus:border-black"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode" className="text-sm font-medium text-gray-700">Postal Code *</Label>
                <Input
                  id="postalCode"
                  value={toAddress.postalCode}
                  onChange={(e) => updateToAddress('postalCode', e.target.value)}
                  placeholder="Enter postal code"
                  className="border-gray-300 focus:ring-black focus:border-black"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm font-medium text-gray-700">Country * (2-letter code)</Label>
                <Input
                  id="country"
                  value={toAddress.country}
                  onChange={(e) => updateToAddress('country', e.target.value)}
                  placeholder="Enter country code (e.g., US)"
                  className="border-gray-300 focus:ring-black focus:border-black"
                  maxLength={2}
                  required
                />
              </div>
            </div>
            <Separator className="my-6" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Package Details</h3>
                <Button onClick={addBox} variant="outline" size="sm" className="border-black text-black hover:bg-gray-100">
                  <Copy className="mr-2 h-4 w-4" /> Add Box
                </Button>
              </div>
              {boxes.map((box, index) => (
                <Card key={index} className="p-4 bg-gray-50 border border-gray-200">
                  <div className="grid grid-cols-5 gap-4">
                    <Input
                      placeholder="Length"
                      value={box.length}
                      onChange={(e) => updateBox(index, 'length', e.target.value)}
                      className="col-span-1 border-gray-300 focus:ring-black focus:border-black"
                    />
                    <Input
                      placeholder="Width"
                      value={box.width}
                      onChange={(e) => updateBox(index, 'width', e.target.value)}
                      className="col-span-1 border-gray-300 focus:ring-black focus:border-black"
                    />
                    <Input
                      placeholder="Height"
                      value={box.height}
                      onChange={(e) => updateBox(index, 'height', e.target.value)}
                      className="col-span-1 border-gray-300 focus:ring-black focus:border-black"
                    />
                    <Input
                      placeholder="Weight"
                      value={box.weight}
                      onChange={(e) => updateBox(index, 'weight', e.target.value)}
                      className="col-span-1 border-gray-300 focus:ring-black focus:border-black"
                    />
                    <Button variant="outline" size="icon" onClick={() => removeBox(index)} className="col-span-1 border-black text-black hover:bg-gray-200">
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
                <Button onClick={handleGetRates} className="w-full bg-black text-white hover:bg-gray-800" disabled={isLoading}>
                  <DollarSign className="mr-2 h-4 w-4" /> {isLoading ? 'Loading...' : 'Get Rates'}
                </Button>
              </div>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
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
                        <TableHead>Rate</TableHead>
                        <TableHead>Estimated Days</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rates.map((rate) => (
                        <TableRow key={`${rate.carrier_code}-${rate.service_code}`}>
                          <TableCell className="font-medium">{rate.carrier_code.toUpperCase()}</TableCell>
                          <TableCell>{rate.service_name}</TableCell>
                          <TableCell>${(rate.shipment_cost + (rate.other_cost || 0)).toFixed(2)}</TableCell>
                          <TableCell>{rate.delivery_days || 'N/A'}</TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handlePrintLabel(rate)} 
                              className="border-black text-black hover:bg-gray-100"
                              disabled={isLoading}
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