'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import InventoryHistoryChart from "@/components/inventory/InventoryHistoryChart"
import { Trash2, Lock } from "lucide-react"
import { CountFrequency, InventoryCategory, InventoryItem, LockedInventory } from "@/typings/types";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InventoryTableProps {
  filteredInventory: InventoryItem[]
  updateItem: (itemId: number, field: string, value: string | number) => void
  deleteItem: (itemId: number) => void
}

export function InventoryTable({ filteredInventory, updateItem, deleteItem }: InventoryTableProps) {
  const [localQuantities, setLocalQuantities] = useState<Record<string, number>>({});
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [pendingLockedEdit, setPendingLockedEdit] = useState<{ id: number, field: string, value: string | number } | null>(null);

  const isLockedItem = (item: InventoryItem) => {
    return Object.values(LockedInventory).includes(item.name as LockedInventory);
  };

  const handleUpdateItem = (itemId: number, field: string, value: string | number) => {
    const item = filteredInventory.find(i => i._id === itemId);
    if (item && isLockedItem(item)) {
      setPendingLockedEdit({ id: itemId, field, value });
    } else {
      updateItem(itemId, field, value);
    }
  };

  const handleDeleteClick = (item: InventoryItem) => {
    setItemToDelete(item);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteItem(itemToDelete._id);
      setItemToDelete(null);
    }
  };

  const handleConfirmLockedEdit = () => {
    if (pendingLockedEdit) {
      updateItem(pendingLockedEdit.id, pendingLockedEdit.field, pendingLockedEdit.value);
      setPendingLockedEdit(null);
    }
  };

  return (
    <Card className="rounded-lg" style={{"contain": "paint"}}>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="sticky top-12 z-10">
            <TableRow className="bg-muted dark:bg-gray-700">
              <TableHead className="z-[100]">Name</TableHead>
              <TableHead className="z-[100]">Quantity</TableHead>
              <TableHead>Restock Quantity</TableHead>
              <TableHead className="hidden sm:table-cell">Count Type</TableHead>
              <TableHead className="hidden sm:table-cell">Count Frequency</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead>History</TableHead>
              <TableHead>Delete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory?.map((item, index) => {
              const latestCount = item.countHistory[item.countHistory.length - 1]
              const quantity = latestCount ? latestCount.quantity : 0;
              const isLocked = isLockedItem(item);
              return (
                <TableRow
                  key={item._id}
                  className={index % 2 === 0 ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}
                >
                  <TableCell className="font-medium">
                    {item.name}
                    {isLocked && <Lock className="inline-block ml-2 h-4 w-4 text-gray-500" />}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={localQuantities[item._id] !== undefined ? localQuantities[item._id] : quantity}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value);
                          if (!isNaN(newValue)) {
                            setLocalQuantities(prev => ({ ...prev, [item._id]: newValue }));
                          }
                        }}
                        onBlur={(e) => {
                          const newValue = localQuantities[item._id];
                          if (newValue !== undefined) {
                            handleUpdateItem(item._id, 'quantity', newValue);
                            setLocalQuantities(prev => {
                              const updated = { ...prev };
                              delete updated[item._id];
                              return updated;
                            });
                          }
                        }}
                        className="w-20 bg-transparent border-none"
                      />
                      {quantity === 0 && (
                        <Badge variant="destructive" className="ml-2">
                          Out of Stock
                        </Badge>
                      )}
                      {quantity > 0 && quantity <= item.restockQuantity && (
                        <Badge variant="outline" className="ml-2 bg-orange-500 dark:bg-orange-500">
                          Low Stock
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.restockQuantity}
                      onChange={(e) => handleUpdateItem(item._id, 'restockQuantity', parseInt(e.target.value))}
                      className="w-20 bg-transparent border-none"
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Input
                      type="text"
                      value={item.countType}
                      onChange={(e) => handleUpdateItem(item._id, 'countType', e.target.value)}
                      className="w-24 bg-transparent border-none"
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Select
                      value={item.countFrequency}
                      onValueChange={(value: CountFrequency) => handleUpdateItem(item._id, 'countFrequency', value)}
                    >
                      <SelectTrigger className="bg-transparent border-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800">
                        {Object.values(CountFrequency).map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Select
                      value={item.category}
                      onValueChange={(value: InventoryCategory) => handleUpdateItem(item._id, 'category', value)}
                    >
                      <SelectTrigger className="bg-transparent border-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800">
                        {Object.values(InventoryCategory).map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <InventoryHistoryChart item={item} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(item)}
                      className="hover:bg-destructive hover:text-destructive-foreground"
                      disabled={isLocked}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete {item.name}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>

      <DeleteConfirmationDialog
        isOpen={Boolean(itemToDelete)}
        itemName={itemToDelete?.name || ""}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      <Dialog open={Boolean(pendingLockedEdit)} onOpenChange={(open) => !open && setPendingLockedEdit(null)}>
        <DialogContent className="sm:max-w-[425px] dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle>Edit Locked Item</DialogTitle>
            <DialogDescription>
              This item is locked. Are you sure you want to edit it?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingLockedEdit(null)} className="dark:bg-gray-700 dark:text-white">
              Cancel
            </Button>
            <Button onClick={handleConfirmLockedEdit} className="dark:bg-blue-600 dark:hover:bg-blue-700">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
