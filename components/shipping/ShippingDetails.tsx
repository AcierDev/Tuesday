import { format, parseISO } from 'date-fns'
import { Package, X } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { type ShippingItem } from "@/typings/interfaces"


interface ShippingDetailsProps {
  item: ShippingItem
  onClose: () => void
}

export const ShippingDetails = ({ item, onClose }: ShippingDetailsProps) => {
  const receipt = item.receipt

  return (
    <Card className="w-full max-w-4xl mx-auto bg-white shadow-lg">
      <CardHeader className="bg-black text-white">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold flex items-center">
            <Package className="mr-2 h-6 w-6" />
            Order Details
          </CardTitle>
          <Button className="text-white hover:text-gray-300" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Customer Information</h3>
            <p><strong>Name:</strong> {receipt?.name || 'N/A'}</p>
            <p><strong>Email:</strong> {receipt?.buyer_email || 'N/A'}</p>
            <p><strong>Address:</strong> {receipt?.formatted_address || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Order Information</h3>
            <p><strong>Order ID:</strong> {receipt?.receipt_id || 'N/A'}</p>
            <p><strong>Order Date:</strong> {receipt?.created_timestamp ? format(parseISO(receipt.created_timestamp.toString()), 'PP') : 'N/A'}</p>
            <p><strong>Order Total:</strong> {receipt?.total_price ? `$${receipt.total_price.amount / receipt.total_price.divisor}` : 'N/A'}</p>
          </div>
          {receipt?.transactions && receipt.transactions.length > 0 ? <div>
              <h3 className="text-lg font-semibold mb-2">Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipt.transactions.map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell>{transaction.title}</TableCell>
                      <TableCell>{transaction.quantity}</TableCell>
                      <TableCell>${transaction.price.amount / transaction.price.divisor}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div> : null}
          {receipt?.shipments && receipt.shipments.length > 0 ? <div>
              <h3 className="text-lg font-semibold mb-2">Shipping Information</h3>
              <p><strong>Carrier:</strong> {receipt.shipments[0]?.carrier_name || 'N/A'}</p>
              <p><strong>Tracking Number:</strong> {receipt.shipments[0]?.tracking_code || 'N/A'}</p>
              <p><strong>Status:</strong> {item.shipmentStatus || 'N/A'}</p>
            </div> : null}
          {!receipt && (
            <div className="text-center text-gray-500">
              <p>No receipt data available for this item.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}