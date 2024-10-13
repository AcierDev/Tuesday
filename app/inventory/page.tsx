"use client"

import { useState } from "react"
import { Plus, Search, RefreshCw, AlertTriangle, Package, Clipboard, BarChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type InventoryItem = {
  id: number
  name: string
  quantity: number
  restockQuantity: number
  countType: "Quantity" | "Boxes" | "Rolls" | "Gallons" | "Bags"
  countFrequency: "Daily" | "Weekly"
}

const initialInventory: InventoryItem[] = [
  { id: 1, name: "Art hangers", quantity: 27, restockQuantity: 10, countType: "Quantity", countFrequency: "Daily" },
  { id: 2, name: "Screws (⅝\")", quantity: 3, restockQuantity: 3, countType: "Boxes", countFrequency: "Daily" },
  { id: 3, name: "Drill bits", quantity: 9, restockQuantity: 10, countType: "Quantity", countFrequency: "Daily" },
  { id: 4, name: "Thank you notes", quantity: 13, restockQuantity: 10, countType: "Quantity", countFrequency: "Daily" },
  { id: 5, name: "Hardware bag screws (2\")", quantity: 0, restockQuantity: 1, countType: "Boxes", countFrequency: "Daily" },
  { id: 6, name: "Glue", quantity: 265, restockQuantity: 1, countType: "Gallons", countFrequency: "Weekly" },
  { id: 7, name: "Dispensing needles", quantity: 8, restockQuantity: 2, countType: "Bags", countFrequency: "Weekly" },
  { id: 8, name: "Syringes", quantity: 60, restockQuantity: 20, countType: "Quantity", countFrequency: "Weekly" },
]

export default function InventoryManagement() {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory)
  const [searchTerm, setSearchTerm] = useState("")
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({ name: "", quantity: 0, restockQuantity: 0, countType: "Quantity", countFrequency: "Daily" })
  const [reconcileItem, setReconcileItem] = useState<InventoryItem | null>(null)
  const [newQuantity, setNewQuantity] = useState<number | "">("")
  const [countFilter, setCountFilter] = useState<"All" | "Daily" | "Weekly">("All")

  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (countFilter === "All" || item.countFrequency === countFilter)
  )

  const lowStockItems = inventory.filter(item => item.quantity <= item.restockQuantity)

  const addItem = () => {
    if (newItem.name && newItem.quantity !== undefined && newItem.restockQuantity !== undefined && newItem.countType && newItem.countFrequency) {
      setInventory([...inventory, { id: inventory.length + 1, ...newItem as InventoryItem }])
      setNewItem({ name: "", quantity: 0, restockQuantity: 0, countType: "Quantity", countFrequency: "Daily" })
    }
  }

  const reconcileCount = () => {
    if (reconcileItem && newQuantity !== "") {
      setInventory(inventory.map(item => 
        item.id === reconcileItem.id ? { ...item, quantity: Number(newQuantity) } : item
      ))
      setReconcileItem(null)
      setNewQuantity("")
    }
  }

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Inventory Management</h1>

      {/* Summary Cards */}
      <div className="grid gap-6 mb-8 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Clipboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Count Items</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.filter(item => item.countFrequency === "Daily").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Count Items</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.filter(item => item.countFrequency === "Weekly").length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="add-item">Add Item</TabsTrigger>
        </TabsList>
        <TabsContent value="inventory" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={countFilter} onValueChange={(value: "All" | "Daily" | "Weekly") => setCountFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by count frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Daily">Daily Count</SelectItem>
                <SelectItem value="Weekly">Weekly Count</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Restock Quantity</TableHead>
                    <TableHead className="hidden sm:table-cell">Count Type</TableHead>
                    <TableHead className="hidden sm:table-cell">Count Frequency</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item) => (
                    <TableRow key={item.id} className={item.quantity <= item.restockQuantity ? "bg-red-100 dark:bg-red-900" : ""}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.restockQuantity}</TableCell>
                      <TableCell className="hidden sm:table-cell">{item.countType}</TableCell>
                      <TableCell className="hidden sm:table-cell">{item.countFrequency}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReconcileItem(item)}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Reconcile
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reconcile Count for {item.name}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="current-quantity" className="text-right">
                                  Current Quantity
                                </Label>
                                <Input
                                  id="current-quantity"
                                  value={item.quantity}
                                  className="col-span-3"
                                  readOnly
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="new-quantity" className="text-right">
                                  New Quantity
                                </Label>
                                <Input
                                  id="new-quantity"
                                  type="number"
                                  value={newQuantity}
                                  onChange={(e) => setNewQuantity(Number(e.target.value))}
                                  className="col-span-3"
                                />
                              </div>
                            </div>
                            <Button onClick={reconcileCount}>Update Count</Button>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="add-item">
          <Card>
            <CardHeader>
              <CardTitle>Add New Item</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); addItem(); }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="item-name">Item Name</Label>
                    <Input
                      id="item-name"
                      placeholder="Item name"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-quantity">Quantity</Label>
                    <Input
                      id="item-quantity"
                      type="number"
                      placeholder="Quantity"
                      value={newItem.quantity || ""}
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-restock">Restock Quantity</Label>
                    <Input
                      id="item-restock"
                      type="number"
                      placeholder="Restock Quantity"
                      value={newItem.restockQuantity || ""}
                      onChange={(e) => setNewItem({ ...newItem, restockQuantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-count-type">Count Type</Label>
                    <Select value={newItem.countType} onValueChange={(value: InventoryItem["countType"]) => setNewItem({ ...newItem, countType: value })}>
                      <SelectTrigger id="item-count-type">
                        <SelectValue placeholder="Count Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Quantity">Quantity</SelectItem>
                        <SelectItem value="Boxes">Boxes</SelectItem>
                        <SelectItem value="Rolls">Rolls</SelectItem>
                        <SelectItem value="Gallons">Gallons</SelectItem>
                        <SelectItem value="Bags">Bags</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-count-frequency">Count Frequency</Label>
                    <Select value={newItem.countFrequency} onValueChange={(value: InventoryItem["countFrequency"]) => setNewItem({ ...newItem, countFrequency: value })}>
                      <SelectTrigger id="item-count-frequency">
                        <SelectValue placeholder="Count Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}