// ShippingDashboard.tsx
'use client'

import { Copy, DollarSign, Truck, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

import { ShippingDashboardProps, type Receipt, Box, Address, ShippingRate, GroupedRates } from '@/typings/interfaces'
import { getBoxData } from '@/utils/functions'

import { createShippingLabel, getShippingRates } from '../../lib/shipstation-api'

import BoxInputs from './BoxInputs'
import AddressForm from './AddressForm'
import ShippingRatesTable from './ShippingRatesTable'
import { ItemSizes } from '@/typings/types'
import Alerts from './Alerts'

export function BuyLabelsDashboard ({ item, onClose }: ShippingDashboardProps) {
  const [boxes, setBoxes] = useState<Box[]>([{ length: '', width: '', height: '', weight: '' }])
  const [rates, setRates] = useState<ShippingRate[]>([])
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
          weight: "" + (parseFloat(box.weight) || 0),
          length: "" + (parseFloat(box.length) || 0),
          width: "" + (parseFloat(box.width) || 0),
          height: "" + (parseFloat(box.height) || 0)
        }, fromAddress, toAddress)
      )
      const ratesResults = await Promise.all(ratesPromises)
      const flattenedRates = ratesResults.flat()

      console.log('flattened', flattenedRates)
      
      // Group rates by carrier and service
      const groupedRates: GroupedRates = flattenedRates.reduce<GroupedRates>((acc, rate) => {
        console.log(rate)
    const key = `${rate.serviceName.split(" ")[0]}-${rate.serviceName}`;
    if (!acc[key]) {
      acc[key] = {
        ...rate,
        boxes: 1,
        totalCost: rate.shipmentCost + (rate.otherCost || 0),
        carrierCode: rate.carrierCode, // Add this if available in the raw data
        serviceCode: rate.serviceCode, // Add this if available in the raw data
        rateId: rate.rateId // Add this if available in the raw data
      };
    } else {
      acc[key]!.boxes += 1;
      acc[key]!.totalCost += rate.shipmentCost + (rate.otherCost || 0);
    }
    return acc;
  }, {});

      console.log(groupedRates)
      console.log(Object.values(groupedRates))
      setRates(Object.values(groupedRates))
    } catch (err) {
      setError('Failed to fetch shipping rates. Please try again.')
      console.error(err)
    }
    setIsLoading(false)
  }

const handleBuyLabel = async (rate: ShippingRate) => {
  setIsLoading(true);
  setError(null);
  try {
    const labelResponse = await createShippingLabel({
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
    });
    console.log('response', labelResponse)
    window.open(labelResponse.labelDownload, '_blank');
  } catch (err) {
    setError('Failed to create shipping label. Please try again.');
    console.error(err);
  }
  setIsLoading(false);
};


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

      setFromAddress(prev => ({ ...prev, postalCode: '89074', line1: '1111 mary crest rd', city: 'henderson', country: "US", state: "NV" }))
      
      setToAddress({
        line1: receipt.first_line || '',
        line2: receipt.second_line || '',
        city: receipt.city || '',
        state: receipt.state?.slice(0, 2)?.toUpperCase() || '',
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
    <Card className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg">
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
            <Alerts />

            <AddressForm 
              fromAddress={fromAddress}
              toAddress={toAddress}
              customerName={customerName}
              setCustomerName={setCustomerName}
              updateFromAddress={updateFromAddress}
              updateToAddress={updateToAddress}
            />

            <Separator className="my-6 bg-gray-200 dark:bg-gray-600" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Package Details</h3>
                <Button className="border-black text-black dark:border-white dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700" size="sm" variant="outline" onClick={addBox}>
                  <Copy className="mr-2 h-4 w-4" /> Add Box
                </Button>
              </div>
              <BoxInputs boxes={boxes} onAdd={addBox} onRemove={removeBox} onUpdate={updateBox} />
            </div>

            <Separator className="my-6 bg-gray-200 dark:bg-gray-600" />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Get Shipping Rates</h3>
              <div className="flex items-end">
                <Button className="w-full bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200" disabled={isLoading} onClick={() => {
                  handleGetRates()
                }}>
                  <DollarSign className="mr-2 h-4 w-4" /> {isLoading ? 'Loading...' : 'Get Rates'}
                </Button>
              </div>
            </div>

            {error && <Alerts variant="error" message={error} />}

            {rates.length > 0 && (
              <ShippingRatesTable rates={rates} isLoading={isLoading} onPrintLabel={handleBuyLabel} />
            )}

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Rates are provided by ShipStation and may vary based on actual package dimensions and destination.
            </p>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}