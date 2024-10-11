"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { type Item } from '../../typings/types'

interface EditItemDialogProps {
  editingItem: Item | null
  setEditingItem: (item: Item | null) => void
  handleSaveEdit: (updatedItem: Item) => Promise<void>
}

export const EditItemDialog = ({ editingItem, setEditingItem, handleSaveEdit }: EditItemDialogProps) => {
  const [activeTab, setActiveTab] = useState("item")
  const [localReceipt, setLocalReceipt] = useState<Partial<Address> | null>(null)
  const [isVertical, setIsVertical] = useState(false)

  useEffect(() => {
    if (editingItem) {
      setLocalReceipt(editingItem.shippingDetails || {})
      setIsVertical(editingItem.vertical || false)
    } else {
      setLocalReceipt(null)
      setIsVertical(false)
    }
  }, [editingItem])

  const updateItemValue = (columnName: string, value: string) => {
    if (!editingItem) return
    const newValues = editingItem.values.map(v =>
      v.columnName === columnName ? { ...v, text: value } : v
    )
    setEditingItem({ ...editingItem, values: newValues })
  }

  const updateReceiptValue = (key: keyof Address, value: any) => {
    if (!localReceipt) return
    setLocalReceipt(prevReceipt => ({
      ...prevReceipt,
      [key]: value
    }))
  }

  const updateTrackingNumber = (value: string) => {
    if (!localReceipt) return
    const updatedShipments: Shipment[] = localReceipt.shipments
      ? localReceipt.shipments.map((shipment, index) => 
          index === 0 ? { ...shipment, tracking_code: value } : shipment
        )
      : [{ tracking_code: value } as Shipment]
    
    setLocalReceipt(prevReceipt => ({
      ...prevReceipt,
      shipments: updatedShipments
    }))
  }

  const handleSave = async () => {
    if (editingItem) {
      const updatedItem = {
        ...editingItem,
        receipt: localReceipt || undefined,
        vertical: isVertical
      };
      setEditingItem(updatedItem);
      await handleSaveEdit(updatedItem);
    }
  }

  return (
    <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        <Tabs className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="item">Item Details</TabsTrigger>
            <TabsTrigger value="shipping">Shipping Details</TabsTrigger>
          </TabsList>
          <TabsContent value="item">
            <Card>
              <CardContent className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="vertical-toggle">Vertical</Label>
                  <Switch
                    checked={isVertical}
                    id="vertical-toggle"
                    onCheckedChange={setIsVertical}
                  />
                </div>
                {editingItem?.values.map((value) => (
                  <div key={value.columnName} className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right" htmlFor={value.columnName}>
                      {value.columnName}
                    </Label>
                    <Input
                      className="col-span-3"
                      id={value.columnName}
                      value={value.text || ''}
                      onChange={(e) => updateItemValue(value.columnName, e.target.value)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="shipping">
            <Card>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="receipt_id">Receipt ID</Label>
                  <Input
                    className="col-span-3"
                    id="receipt_id"
                    value={localReceipt?.id || ''}
                    onChange={(e) => updateReceiptValue('receipt_id', parseInt(e.target.value) || '')}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="buyer_email">Buyer Email</Label>
                  <Input
                    className="col-span-3"
                    id="buyer_email"
                    value={localReceipt?.buyer_email || ''}
                    onChange={(e) => updateReceiptValue('buyer_email', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="name">Name</Label>
                  <Input
                    className="col-span-3"
                    id="name"
                    value={localReceipt?.name || ''}
                    onChange={(e) => updateReceiptValue('name', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="first_line">Address</Label>
                  <Input
                    className="col-span-3"
                    id="first_line"
                    value={localReceipt?.street1 || ''}
                    onChange={(e) => updateReceiptValue('street1', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="city">City</Label>
                  <Input
                    className="col-span-3"
                    id="city"
                    value={localReceipt?.city || ''}
                    onChange={(e) => updateReceiptValue('city', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="state">State</Label>
                  <Input
                    className="col-span-3"
                    id="state"
                    value={localReceipt?.state || ''}
                    onChange={(e) => updateReceiptValue('state', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="zip">ZIP</Label>
                  <Input
                    className="col-span-3"
                    id="zip"
                    value={localReceipt?.postalCode || ''}
                    onChange={(e) => updateReceiptValue('postalCode', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right" htmlFor="tracking">Tracking Number</Label>
                  <Input
                    className="col-span-3"
                    id="tracking"
                    value={localReceipt?.shipments?.[0]?.tracking_code || ''}
                    onChange={(e) => updateTrackingNumber(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave}>Save changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}