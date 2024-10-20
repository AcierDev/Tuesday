"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealmApp } from "@/hooks/useRealmApp";
import { toast } from "sonner";
import { CountFrequency, InventoryItem } from "@/typings/types";

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { inventoryCollection } = useRealmApp();

  const loadInventory = useCallback(async () => {
    if (!inventoryCollection) return;

    try {
      setIsLoading(true);
      const inventoryData = await inventoryCollection.find({});
      setInventory(inventoryData);
    } catch (err) {
      console.error("Failed to fetch inventory", err);
      toast.error("Failed to fetch inventory. Please refresh the page.", {
        style: { background: "#EF4444", color: "white" },
      });
    } finally {
      setIsLoading(false);
    }
  }, [inventoryCollection]);

  useEffect(() => {
    if (inventoryCollection) {
      loadInventory();
    }
  }, [inventoryCollection, loadInventory]);

  const addItem = async (newItem: InventoryItem) => {
    try {
      const result = await inventoryCollection!.insertOne(newItem);
      if (result.insertedId) {
        setInventory([...inventory, { ...newItem, _id: result.insertedId }]);
        toast.success("Item added successfully");
        return true;
      }
    } catch (err) {
      console.error("Failed to add item", err);
      toast.error("Failed to add item. Please try again.", {
        style: { background: "#EF4444", color: "white" },
      });
    }
    return false;
  };

  const updateItem = async (
    itemId: number,
    field: string,
    value: string | number,
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

      const result = await inventoryCollection!.updateOne(
        { _id: itemId },
        { $set: updateData },
      );

      if (result.modifiedCount > 0) {
        setInventory(
          inventory.map((item) =>
            item._id === itemId ? { ...item, ...updateData } : item
          ),
        );
        toast.success(`${field} updated successfully`);
        return true;
      }
    } catch (err) {
      console.error(`Failed to update ${field}`, err);
      toast.error(`Failed to update ${field}. Please try again.`, {
        style: { background: "#EF4444", color: "white" },
      });
    }
    return false;
  };

  const deleteItem = async (itemId: number) => {
    try {
      const result = await inventoryCollection!.deleteOne({ _id: itemId });
      if (result.deletedCount > 0) {
        setInventory(inventory.filter((item) => item._id !== itemId));
        toast.success("Item deleted successfully");
        return true;
      }
    } catch (err) {
      console.error("Failed to delete item", err);
      toast.error("Failed to delete item. Please try again.", {
        style: { background: "#EF4444", color: "white" },
      });
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
    countFilter: "All" | CountFrequency,
  ) => {
    return inventory.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (countFilter === "All" || item.countFrequency === countFilter)
    );
  };

  const getItemByName = (name: string): InventoryItem | undefined => {
    return inventory.find((item) =>
      item.name.toLowerCase() === name.toLowerCase()
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
