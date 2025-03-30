"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { InventoryItem, CountFrequency } from "@/typings/types";

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadInventory = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/inventory");
      if (!response.ok) throw new Error("Failed to fetch inventory");
      const data = await response.json();
      setInventory(data);
    } catch (err) {
      console.error("Failed to fetch inventory", err);
      toast.error("Failed to fetch inventory. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const addItem = async (newItem: InventoryItem) => {
    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });

      if (!response.ok) throw new Error("Failed to add item");
      const result = await response.json();

      if (result.insertedId) {
        setInventory([...inventory, { ...newItem, _id: result.insertedId }]);
        toast.success("Item added successfully");
        return true;
      }
    } catch (err) {
      console.error("Failed to add item", err);
      toast.error("Failed to add item. Please try again.");
    }
    return false;
  };

  const updateItem = async (
    itemId: number,
    field: string,
    value: string | number
  ) => {
    try {
      const updatedItem = inventory.find((item) => item._id === itemId);
      if (!updatedItem) return false;

      let updateData: any = { [field]: value };

      if (field === "quantity") {
        const newQuantity = Number(value);
        const lastCount =
          updatedItem.countHistory[updatedItem.countHistory.length - 1];
        if (lastCount && newQuantity !== lastCount.quantity) {
          const newCountHistory = [
            ...updatedItem.countHistory,
            { quantity: newQuantity, timestamp: new Date() },
          ];
          updateData = { countHistory: newCountHistory };
        } else {
          return false;
        }
      }

      const result = await fetch(`/api/inventory/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (result.ok) {
        setInventory(
          inventory.map((item) =>
            item._id === itemId ? { ...item, ...updateData } : item
          )
        );
        toast.success(`${field} updated successfully`);
        return true;
      }
    } catch (err) {
      console.error(`Failed to update ${field}`, err);
      toast.error(`Failed to update ${field}. Please try again.`);
    }
    return false;
  };

  const deleteItem = async (itemId: number) => {
    try {
      const result = await fetch(`/api/inventory/${itemId}`, {
        method: "DELETE",
      });

      if (result.ok) {
        setInventory(inventory.filter((item) => item._id !== itemId));
        toast.success("Item deleted successfully");
        return true;
      }
    } catch (err) {
      console.error("Failed to delete item", err);
      toast.error("Failed to delete item. Please try again.");
    }
    return false;
  };

  const getLowStockItems = () => {
    return inventory.filter((item) => {
      const latestCount = item.countHistory[item.countHistory.length - 1];
      return latestCount && latestCount.quantity <= item.restockQuantity;
    });
  };

  const getFilteredInventory = (
    searchTerm: string,
    countFilter: "All" | CountFrequency
  ) => {
    return inventory.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (countFilter === "All" || item.countFrequency === countFilter)
    );
  };

  const getItemByName = (name: string): InventoryItem | undefined => {
    return inventory.find(
      (item) => item.name.toLowerCase() === name.toLowerCase()
    );
  };

  return {
    inventory,
    isLoading,
    addItem,
    updateItem,
    deleteItem,
    getLowStockItems,
    getFilteredInventory,
    getItemByName,
  };
}
