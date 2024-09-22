'use client'

import { AlertCircle, CheckCircle2, Clock, Loader2, Package, Search, Truck } from 'lucide-react'
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
import { fetchShipmentStatus } from '@/lib/shipstation-api'
import { type Receipt } from '@/typings/interfaces'
import { type Board, type Item } from '@/typings/types'

type ShippingStatus = 'unshipped' | 'pre_transit' | 'in_transit' | 'delivered'

interface ShippingItem extends Item {
  receipt?: Receipt
  shipmentStatus?: ShippingStatus
}

export default function ShippingPage() {
  const [items, setItems] = useState<ShippingItem[]>([])
  const [filteredItems, setFilteredItems] = useState<ShippingItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItem, setSelectedItem] = useState<ShippingItem | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const { collection } = useRealmApp()
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
      item.receipt?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.receipt?.receipt_id.toString().includes(searchTerm)
    )
    setFilteredItems(filtered)
  }, [items, searchTerm])

  const loadItems = async () => {
    try {
      const board: Board = await collection!.findOne({ /* query to find the board */ })
      if (board) {
        const itemsWithReceipts = board.items_page.items.map(item => ({
          ...item,
          receipt: item.receipt || undefined
        })) as ShippingItem[]
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
          const status = await fetchShipmentStatus(shipment.tracking_code)
          return { ...item, shipmentStatus: status as ShippingStatus }
        } catch (error) {
          console.error(`Failed to fetch status for item ${item.id}`, error)
          return item
        }
        }
      }
      return { ...item, shipmentStatus: 'unshipped' }
    }))
    setItems(updatedItems)
  }

  const getStatusIcon = (status: ShippingStatus) => {
    switch (status) {
      case 'unshipped':
        return <Package className="h-5 w-5 text-gray-500" />
      case 'pre_transit':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'in_transit':
        return <Truck className="h-5 w-5 text-blue-500" />
      case 'delivered':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
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
      <Card className="w-full">
        <CardHeader className="bg-gray-100">
          <CardTitle className="text-lg font-semibold flex items-center">
            {getStatusIcon(status)}
            <span className="ml-2">{cardTitle} ({statusItems.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statusItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.receipt?.receipt_id || 'N/A'}</TableCell>
                    <TableCell>{item.receipt?.name || 'N/A'}</TableCell>
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
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <Card className="w-full max-w-7xl mx-auto mb-8">
        <CardHeader className="bg-black text-white">
          <CardTitle className="text-2xl font-bold flex items-center">
            <Truck className="mr-2 h-6 w-6" />
            Shipping Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6 flex justify-between items-center">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button className="flex items-center" variant="outline" onClick={loadItems}>
              <Loader2 className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderStatusCard('unshipped')}
            {renderStatusCard('pre_transit')}
            {renderStatusCard('in_transit')}
            {renderStatusCard('delivered')}
          </div>
        </CardContent>
      </Card>
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
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