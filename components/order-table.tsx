'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Plus } from 'lucide-react'

interface Order {
  id: string
  customerName: string
  design: string
  size: string
  dueDate: string
  status: 'Due' | 'On Time'
}

const initialOrders: Order[] = [
  { id: '1', customerName: 'Hannah Hoffman', design: 'Forest', size: '16 x 6', dueDate: '9/6/2024', status: 'Due' },
  { id: '2', customerName: 'Marissa Valenzuela', design: 'Coastal Dream', size: '19 x 11', dueDate: '9/30/2024', status: 'On Time' },
  { id: '3', customerName: 'Robert Aaron Yohnke', design: 'Aloe', size: '36 x 15', dueDate: '9/30/2024', status: 'On Time' },
  { id: '4', customerName: 'Amy Roberts', design: 'Tidal', size: '19 x 10', dueDate: '9/30/2024', status: 'On Time' },
  { id: '5', customerName: 'Scott Babin', design: 'Oceanic Harmony', size: '27 x 11', dueDate: '9/30/2024', status: 'On Time' },
]

export function OrderTable() {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredOrders = orders.filter(order => 
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.design.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const addNewOrder = () => {
    const newOrder: Order = {
      id: (orders.length + 1).toString(),
      customerName: 'New Customer',
      design: 'New Design',
      size: 'TBD',
      dueDate: 'TBD',
      status: 'On Time'
    }
    setOrders([...orders, newOrder])
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Order Management</h1>
      <div className="flex justify-between items-center mb-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 w-[300px]"
          />
        </div>
        <Button onClick={addNewOrder}>
          <Plus className="mr-2 h-4 w-4" /> New Order
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer Name</TableHead>
            <TableHead>Design</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredOrders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">{order.customerName}</TableCell>
              <TableCell>{order.design}</TableCell>
              <TableCell>{order.size}</TableCell>
              <TableCell>{order.dueDate}</TableCell>
              <TableCell>
                <Badge variant={order.status === 'Due' ? 'destructive' : 'default'}>
                  {order.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}