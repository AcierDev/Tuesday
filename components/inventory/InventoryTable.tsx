import { useState } from "react";
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CountFrequency, InventoryItem } from "@/typings/types"
import InventoryHistoryChart from "@/components/inventory/InventoryHistoryChart"
import { Trash2 } from "lucide-react"
import { useUser } from "@/contexts/UserContext";
import { toast, Toaster } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface InventoryTableProps {
  filteredInventory: InventoryItem[]
  updateItem: (itemId: string, field: string, value: string | number) => void
  deleteItem: (itemId: string) => void
}

export default function InventoryTable({ filteredInventory, updateItem, deleteItem }: InventoryTableProps) {
  const [localQuantities, setLocalQuantities] = useState<Record<string, number>>({});
  const { isAdmin } = useUser();

  const handleDeleteClick = (itemId: string, itemName: string) => {
    if (!isAdmin) {
      toast.error("You don't have permission to delete items.", {
        description: "Please contact an administrator for assistance.",
      });
    } else {
      // The confirmation dialog will be shown by the AlertDialog component
    }
  };

  return (
    <>
    <Toaster position="top-center" />
    <Card className="rounded-lg overflow-hidden">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted dark:bg-gray-700">
              <TableHead>Name</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Restock Quantity</TableHead>
              <TableHead className="hidden sm:table-cell">Count Type</TableHead>
              <TableHead className="hidden sm:table-cell">Count Frequency</TableHead>
              <TableHead>History</TableHead>
              <TableHead>Delete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory?.map((item, index) => {
              const latestCount = item.countHistory[item.countHistory.length - 1]
              return (
                <TableRow 
                  key={item._id} 
                  className={`
                    ${index % 2 === 0 ? 'bg-gray-200 dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-700'}
                    ${latestCount && latestCount.quantity <= item.restockQuantity ? "bg-red-900 dark:bg-red-900" : ""}
                  `}
                >
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={localQuantities[item._id] !== undefined ? localQuantities[item._id] : (latestCount ? latestCount.quantity : 0)}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value);
                        if (!isNaN(newValue)) {
                          setLocalQuantities(prev => ({ ...prev, [item._id]: newValue }));
                        }
                      }}
                      onBlur={(e) => {
                        const newValue = localQuantities[item._id];
                        if (newValue !== undefined) {
                          updateItem(item._id, 'quantity', newValue);
                          setLocalQuantities(prev => {
                            const updated = { ...prev };
                            delete updated[item._id];
                            return updated;
                          });
                        }
                      }}
                      className="w-20 bg-transparent border-none"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.restockQuantity}
                      onChange={(e) => updateItem(item._id, 'restockQuantity', parseInt(e.target.value))}
                      className="w-20 bg-transparent border-none"
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Input
                      type="text"
                      value={item.countType}
                      onChange={(e) => updateItem(item._id, 'countType', e.target.value)}
                      className="w-24 bg-transparent border-none"
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Select 
                      value={item.countFrequency} 
                      onValueChange={(value: CountFrequency) => updateItem(item._id, 'countFrequency', value)}
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
                  <TableCell>
                    <InventoryHistoryChart item={item} />
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(item._id, item.name)}
                          className="hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete {item.name}</span>
                        </Button>
                      </AlertDialogTrigger>
                      {isAdmin && (
                        <AlertDialogContent className="dark:bg-gray-800">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to delete this item?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the inventory item "{item.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteItem(item._id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      )}
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </>
  )
}