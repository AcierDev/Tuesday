"use client";

import { useState } from "react";
import { Toaster } from "sonner";
import { CountFrequency, InventoryCategory } from "@/typings/types";
import AddInventoryItemDialog from "@/components/inventory/AddInventoryItemDialog";
import SummaryCards from "@/components/inventory/SummaryCards";
import { SearchAndFilter } from "@/components/inventory/SearchAndFilter";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { useInventoryContext } from "@/contexts/InventoryContext";

export default function InventoryManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [countFilter, setCountFilter] = useState<"All" | CountFrequency>("All");
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const {
    inventory,
    isLoading,
    addItem,
    updateItem,
    deleteItem,
    getLowStockItems,
    getFilteredInventory,
  } = useInventoryContext();

  const filteredInventory = getFilteredInventory(searchTerm, countFilter);
  const lowStockItems = getLowStockItems();

  const handleCountFilterChange = (filter: "All" | CountFrequency) => {
    setCountFilter((prevFilter) => prevFilter === filter ? "All" : filter);
  };

  const categoriesWithItems = Object.values(InventoryCategory).filter(
    (category) => filteredInventory.some((item) => item.category === category),
  );

  const uncategorizedItems = filteredInventory.filter((item) =>
    !item.category || !Object.values(InventoryCategory).includes(item.category)
  );

  if (isLoading) {
    return (
      <div className="p-8 bg-background text-foreground dark:bg-gray-900">
        Loading inventory...
      </div>
    );
  }

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
        addItem={addItem}
      />

      {categoriesWithItems.map((category) => (
        <div key={category} className="mt-8">
          <h2 className="text-2xl font-semibold mb-4 sticky top-0 bg-background dark:bg-gray-900 z-10 pt-3 pb-2">
            {category}
          </h2>
          <InventoryTable
            filteredInventory={filteredInventory.filter((item) =>
              item.category === category
            )}
            updateItem={updateItem}
            deleteItem={deleteItem}
          />
        </div>
      ))}

      {uncategorizedItems.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Uncategorized</h2>
          <InventoryTable
            filteredInventory={uncategorizedItems}
            updateItem={updateItem}
            deleteItem={deleteItem}
          />
        </div>
      )}
    </div>
  );
}
