'use client'

import { 
  AlertCircle, CheckCircle2, Clock, Loader2, Package, Search, Truck, 
  List, Info, PackageIcon 
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { ShippingDetails } from '@/components/shipping/ShippingDetails'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from '@/hooks/UseToast'
import { useRealmApp } from '@/hooks/useRealmApp'
import { Activity, ShippingItem } from '@/typings/interfaces'
import { ShippingStatus, type Board, type Item } from '@/typings/types'

interface UPSTrackingResponse {
  trackingNumber: string
  status: string
  estimatedDelivery: string
  currentStatusDescription?: string
  trackingHistory?: TrackingEvent[]
  weight?: string
  dimension?: string
  serviceDescription?: string
  referenceNumbers?: string[]
}

interface TrackingEvent {
  location: string
  status: string
  date: string
  time: string
  gmtDate: string
  gmtOffset: string
  gmtTime: string
}

async function fetchTrackingData(trackingNumber: string): Promise<UPSTrackingResponse> {
  try {
    const response = await fetch(`/api/ups-tracking?trackingNumber=${trackingNumber}`)
    if (!response.ok) {
      throw new Error('Failed to fetch tracking information')
    }
    const data = await response.json()
    
    // Extract additional details from the response if available
    const shipment = data.package?.[0]
    const currentStatusDescription = shipment?.currentStatus?.description || ''
    const weight = shipment?.weight?.weight
    const dimension = shipment?.dimension ? `${shipment.dimension.length}x${shipment.dimension.width}x${shipment.dimension.height} ${shipment.dimension.unitOfDimension}` : ''
    const serviceDescription = shipment?.service?.description || ''
    const referenceNumbers = shipment?.referenceNumber?.map((ref: any) => ref.number) || []
    const trackingHistory = shipment?.activity?.map((activity: any) => ({
      location: activity.location?.address?.city || 'N/A',
      status: activity.status?.description || 'N/A',
      date: activity.date,
      time: activity.time,
      gmtDate: activity.gmtDate,
      gmtOffset: activity.gmtOffset,
      gmtTime: activity.gmtTime,
    })) || []

    return {
      ...data,
      currentStatusDescription,
      trackingHistory,
      weight,
      dimension,
      serviceDescription,
      referenceNumbers,
    }
  } catch (error: any) {
    console.error('Error fetching UPS tracking data:', error)
    throw error
  }
}

export default function ShippingPage() {
  const [items, setItems] = useState<ShippingItem[]>([])
  const [filteredItems, setFilteredItems] = useState<ShippingItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItem, setSelectedItem] = useState<ShippingItem | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const { boardCollection: collection } = useRealmApp()
  const { toast } = useToast()

  useEffect(() => {
    if (collection) {
      loadItems()
    }
  }, [collection])

  useEffect(() => {
    const filtered = items.filter(item => 
      item.values.some(value => 
        String(value.text || '').toLowerCase().includes(searchTerm.toLowerCase())
      ) || 
      item.shippingDetails?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.shippingDetails?.city.toString().includes(searchTerm)
    )
    setFilteredItems(filtered)
  }, [items, searchTerm])

  const loadItems = async () => {
    try {
      const board: Board = await collection!.findOne({ /* query to find the board */ })
      if (board) {
        const itemsWithReceipts = board.items_page.items.map(item => ({
          ...item,
          shippingDetails: item.shippingDetails || undefined
        })).filter(item => !item.deleted && item.visible) as ShippingItem[]
        setItems(itemsWithReceipts)
        updateShipmentStatuses(itemsWithReceipts)
      }
    } catch (err) {
      console.error("Failed to load items", err)
      toast({
        title: "Error",
        description: "Failed to load items. Please try again.",
        variant: "destructive",
      })
    }
  }

  const updateShipmentStatuses = async (items: ShippingItem[]) => {
    const updatedItems = await Promise.all(items.map(async (item) => {
      if (item.receipt?.shipments && item.receipt.shipments.length > 0) {
        const shipment = item.receipt.shipments[0]!
        const trackingCode = shipment.tracking_code;
        if (trackingCode) {
          try {
            const trackingData = await fetchTrackingData(trackingCode)
            return { 
              ...item, 
              shipmentStatus: mapUPSStatusToShippingStatus(trackingData.status),
              trackingInfo: {
                carrier: 'UPS',
                status: trackingData.status,
                estimatedDelivery: trackingData.trackingInfo?.estimatedDelivery,
                currentStatusDescription: trackingData,
                weight: trackingData.trackingInfo?.weight,
                dimension: trackingData.trackingInfo?.dimensions,
                serviceDescription: trackingData.trackingInfo?.serviceDescription,
                referenceNumbers: trackingData.trackingInfo?.referenceNumbers,
                trackingHistory: trackingData.activity,
              }
            }
          } catch (error) {
            console.error(`Failed to fetch status for item ${item.id} tracking code ${trackingCode}`, error)
            return item
          }
        }
      }
      return { ...item, shipmentStatus: 'unshipped' }
    }))
    setItems(updatedItems)
  }

  // ShippingPage.tsx

const mapUPSStatusToShippingStatus = (upsStatus: string): ShippingStatus => {
  switch (upsStatus.toLowerCase()) {
    case 'delivered':
      return 'delivered';
    case 'in transit':
      return 'in_transit';
    case 'origin scan':
    case 'pickup':
      return 'pre_transit';
    case 'customs clearance in progress':
      return 'pre_transit'; // Example mapping
    default:
      return 'unshipped';
  }
};

async function fetchTrackingData(trackingNumber: string): Promise<ShippingItem> {
  try {
    const response = await fetch(`/api/ups-tracking?trackingNumber=${trackingNumber}`);
    if (!response.ok) {
      throw new Error('Failed to fetch tracking information');
    }
    const data = await response.json();

    // Parse additional details
    const shipment = data.package[0];
    const weight = shipment.weight ? `${shipment.weight.weight} ${shipment.weight.unitOfMeasurement}` : undefined;
    const dimensions = shipment.dimension
      ? `${shipment.dimension.length}x${shipment.dimension.width}x${shipment.dimension.height} ${shipment.dimension.unitOfDimension}`
      : undefined;
    const serviceDescription = shipment.service?.description;
    const referenceNumbers = shipment.referenceNumber?.map((ref: any) => ref.number) || [];
    const activity: Activity[] = shipment.activity.map((act: any) => ({
      date: act.date,
      time: act.time,
      description: act.status.description,
      location: act.location.address?.city || 'Unknown Location',
    }));

    return {
      trackingNumber: data.trackingNumber,
      status: data.status,
      estimatedDelivery: data.estimatedDelivery,
      weight,
      dimensions,
      serviceDescription,
      referenceNumbers,
      activity,
    };
  } catch (error: any) {
    console.error('Error fetching UPS tracking data:', error);
    throw error;
  }
}


  const getStatusIcon = (status: ShippingStatus) => {
    switch (status) {
      case 'unshipped':
        return <Package className="h-5 w-5 text-gray-500 dark:text-gray-400" />
      case 'pre_transit':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'in_transit':
        return <Truck className="h-5 w-5 text-blue-500" />
      case 'delivered':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'customs_clearance':
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-red-500" />
    }
  }

  const handleViewDetails = (item: ShippingItem) => {
    setSelectedItem(item)
    setIsDetailsOpen(true)
  }

  const renderStatusCard = (status: ShippingStatus) => {
    const statusItems = filteredItems.filter(item => item.shipmentStatus === status)
    const cardTitle = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')

    return (
      <Card key={status} className="w-full bg-white dark:bg-gray-800">
        <CardHeader className="bg-gray-100 dark:bg-gray-700">
          <CardTitle className="text-lg font-semibold flex items-center text-gray-900 dark:text-gray-100">
            {getStatusIcon(status)}
            <span className="ml-2">{cardTitle} ({statusItems.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {statusItems.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-700">
                    <TableHead className="text-gray-700 dark:text-gray-300">Order ID</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Customer</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Carrier</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Service</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Est. Delivery</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statusItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <TableCell className="text-gray-900 dark:text-gray-100">{item.receipt?.receipt_id || 'N/A'}</TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100">{item.receipt?.name || 'N/A'}</TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100">{item.trackingInfo?.carrier || 'N/A'}</TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100">{item.trackingInfo?.serviceDescription || 'N/A'}</TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100">{item.trackingInfo?.estimatedDelivery || 'N/A'}</TableCell>
                      <TableCell className="text-gray-900 dark:text-gray-100">
                        {item.trackingInfo?.status || item.trackingInfo?.status || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => handleViewDetails(item)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400">No orders in this status.</div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <Card className="w-full max-w-7xl mx-auto mb-8 bg-white dark:bg-gray-800">
        <CardHeader className="bg-black text-white dark:bg-gray-800">
          <CardTitle className="text-2xl font-bold flex items-center">
            <Truck className="mr-2 h-6 w-6" />
            Shipping Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <Input
                className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button className="flex items-center" variant="outline" onClick={loadItems}>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refresh
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderStatusCard('unshipped')}
            {renderStatusCard('pre_transit')}
            {renderStatusCard('in_transit')}
            {renderStatusCard('customs_clearance')}
            {renderStatusCard('delivered')}
          </div>
        </CardContent>
      </Card>
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-white dark:bg-gray-800">
          {selectedItem ? <ShippingDetails
              item={selectedItem}
              onClose={() => {
                setIsDetailsOpen(false)
                setSelectedItem(null)
                loadItems() // Reload items after closing the shipping details
              }}
            /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
