import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CountFrequency,
  InventoryCategory,
  InventoryItem,
} from "@/typings/types";
import { useState } from "react";
import { toast } from "sonner";

interface AddItemDialogProps {
  showAddItemDialog: boolean;
  setShowAddItemDialog: (show: boolean) => void;
  addItem: (item: InventoryItem) => void;
}

export default function AddItemDialog({
  showAddItemDialog,
  setShowAddItemDialog,
  addItem,
}: AddItemDialogProps) {
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: "",
    quantity: 0,
    restockQuantity: 0,
    countType: "",
    countFrequency: CountFrequency.Daily,
    category: InventoryCategory.Misc,
    countHistory: [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      newItem.name &&
      newItem.quantity !== undefined &&
      newItem.restockQuantity !== undefined &&
      newItem.countType &&
      newItem.countFrequency &&
      newItem.category
    ) {
      const itemToAdd: InventoryItem = {
        ...(newItem as InventoryItem),
        countHistory: [
          {
            quantity: newItem.quantity as number,
            timestamp: new Date(),
          },
        ],
      };
      addItem(itemToAdd);
      setNewItem({
        name: "",
        quantity: 0,
        restockQuantity: 0,
        countType: "",
        countFrequency: CountFrequency.Daily,
        category: InventoryCategory.Misc,
        countHistory: [],
      });
    } else {
      toast.error("Please fill in all fields", {
        style: { background: "#EF4444", color: "white" },
      });
    }
  };

  return (
    <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
      <DialogContent className="bg-background text-foreground dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Item Name</Label>
              <Input
                id="item-name"
                placeholder="Item name"
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                className="bg-input dark:bg-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-quantity">Quantity</Label>
              <Input
                id="item-quantity"
                type="number"
                placeholder="Quantity"
                value={newItem.quantity || ""}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    quantity: parseInt(e.target.value) || 0,
                  })
                }
                className="bg-input dark:bg-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-restock">Restock Quantity</Label>
              <Input
                id="item-restock"
                type="number"
                placeholder="Restock Quantity"
                value={newItem.restockQuantity || ""}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    restockQuantity: parseInt(e.target.value) || 0,
                  })
                }
                className="bg-input dark:bg-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-count-type">Count Type</Label>
              <Input
                id="item-count-type"
                placeholder="Count Type (Units, Boxes, etc)"
                value={newItem.countType}
                onChange={(e) =>
                  setNewItem({ ...newItem, countType: e.target.value })
                }
                className="bg-input dark:bg-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-count-frequency">Count Frequency</Label>
              <Select
                value={newItem.countFrequency}
                onValueChange={(value: CountFrequency) =>
                  setNewItem({ ...newItem, countFrequency: value })
                }
              >
                <SelectTrigger
                  id="item-count-frequency"
                  className="bg-input dark:bg-gray-700"
                >
                  <SelectValue placeholder="Count Frequency" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700">
                  {Object.values(CountFrequency).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-category">Category</Label>
              <Select
                value={newItem.category}
                onValueChange={(value: InventoryCategory) =>
                  setNewItem({ ...newItem, category: value })
                }
              >
                <SelectTrigger
                  id="item-category"
                  className="bg-input dark:bg-gray-700"
                >
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700">
                  {Object.values(InventoryCategory).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Add Item
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
