"use client";

import { useState } from "react";
import { Toaster } from "sonner";
import { toast } from "sonner";
import {
  CountFrequency,
  InventoryItem,
  InventoryCategory,
} from "@/typings/types";
import AddInventoryItemDialog from "@/components/inventory/AddInventoryItemDialog";
import SummaryCards from "@/components/inventory/SummaryCards";
import { SearchAndFilter } from "@/components/inventory/SearchAndFilter";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import {
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "./actions";

export function InventoryClient({
  initialInventory,
}: {
  initialInventory: InventoryItem[];
}) {
  const [inventory, setInventory] = useState(initialInventory);
  const [searchTerm, setSearchTerm] = useState("");
  const [countFilter, setCountFilter] = useState<"All" | CountFrequency>("All");
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);

  const filteredInventory = inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (countFilter === "All" || item.countFrequency === countFilter)
  );

  const lowStockItems = inventory.filter((item) => {
    const latestCount = item.countHistory[item.countHistory.length - 1];
    return latestCount && latestCount.quantity <= item.restockQuantity;
  });

  const handleCountFilterChange = (filter: "All" | CountFrequency) => {
    setCountFilter((prevFilter) => (prevFilter === filter ? "All" : filter));
  };

  const categoriesWithItems = Object.values(InventoryCategory).filter(
    (category) => filteredInventory.some((item) => item.category === category)
  );

  const uncategorizedItems = filteredInventory.filter(
    (item) =>
      !item.category ||
      !Object.values(InventoryCategory).includes(item.category)
  );

  const handleAddItem = async (newItem: Omit<InventoryItem, "_id">) => {
    try {
      const result = await addInventoryItem(newItem);
      if (result.insertedId) {
        setInventory([...inventory, { ...newItem, _id: result.insertedId }]);
        toast.success("Item added successfully");
      }
    } catch (error) {
      toast.error("Failed to add item");
    }
  };

  const handleUpdateItem = async (
    id: string,
    field: string,
    value: string | number
  ) => {
    try {
      await updateInventoryItem(id, { [field]: value });
      setInventory(
        inventory.map((item) =>
          item._id.toString() === id ? { ...item, [field]: value } : item
        )
      );
      toast.success(`${field} updated successfully`);
    } catch (error) {
      toast.error(`Failed to update ${field}`);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteInventoryItem(id);
      setInventory(inventory.filter((item) => item._id.toString() !== id));
      toast.success("Item deleted successfully");
    } catch (error) {
      toast.error("Failed to delete item");
    }
  };

  return (
    <div className="p-8 bg-background text-foreground dark:bg-gray-900">
      <Toaster position="top-center" />
      <h1 className="text-3xl font-bold mb-6">Inventory Management</h1>

      <SummaryCards
        inventory={inventory}
        lowStockItems={lowStockItems}
        countFilter={countFilter}
        handleCountFilterChange={handleCountFilterChange}
      />

      <SearchAndFilter
        countFilter={countFilter}
        handleCountFilterChange={handleCountFilterChange}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setShowAddItemDialog={setShowAddItemDialog}
      />

      <AddInventoryItemDialog
        showAddItemDialog={showAddItemDialog}
        setShowAddItemDialog={setShowAddItemDialog}
        addItem={handleAddItem}
      />

      {categoriesWithItems.map((category) => (
        <div key={category} className="mt-8">
          <h2 className="text-2xl font-semibold mb-4 sticky top-0 bg-background dark:bg-gray-900 z-10 pt-3 pb-2">
            {category}
          </h2>
          <InventoryTable
            filteredInventory={filteredInventory.filter(
              (item) => item.category === category
            )}
            updateItem={handleUpdateItem}
            deleteItem={handleDeleteItem}
          />
        </div>
      ))}

      {uncategorizedItems.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Uncategorized</h2>
          <InventoryTable
            filteredInventory={uncategorizedItems}
            updateItem={handleUpdateItem}
            deleteItem={handleDeleteItem}
          />
        </div>
      )}
    </div>
  );
}
