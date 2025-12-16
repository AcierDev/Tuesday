// contexts/DatabaseContext.tsx
"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { Board, InventoryItem } from "../typings/types";
import { CuttingData } from "@/typings/interfaces";

interface DatabaseContextType {
  boards: Board[];
  cuttingHistory: CuttingData[];
  inventory: InventoryItem[];
  isLoading: boolean;
  refreshBoards: () => Promise<void>;
  refreshCuttingHistory: () => Promise<void>;
  refreshInventory: () => Promise<void>;
  addBoard: (board: Omit<Board, "_id">) => Promise<void>;
  addCuttingHistory: (data: Omit<CuttingData, "_id">) => Promise<void>;
  addInventoryItem: (item: Omit<InventoryItem, "_id">) => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export function useDatabaseContext() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error(
      "useDatabaseContext must be used within a DatabaseProvider"
    );
  }
  return context;
}

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [cuttingHistory, setCuttingHistory] = useState<CuttingData[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshBoards = async () => {
    try {
      console.log("DEBUG - refreshBoard() called");
      const response = await fetch("/api/board");
      if (!response.ok) throw new Error("Failed to fetch boards");
      const { data } = await response.json();
      setBoards(data);
    } catch (error) {
      console.error("Error fetching boards:", error);
    }
  };

  const refreshCuttingHistory = async () => {
    try {
      const response = await fetch("/api/cutting-history");
      if (!response.ok) throw new Error("Failed to fetch cutting history");
      const data = await response.json();
      setCuttingHistory(data);
    } catch (error) {
      console.error("Error fetching cutting history:", error);
    }
  };

  const refreshInventory = async () => {
    try {
      const response = await fetch("/api/inventory");
      if (!response.ok) throw new Error("Failed to fetch inventory");
      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  const addBoard = async (board: Omit<Board, "_id">) => {
    try {
      const response = await fetch("/api/board", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(board),
      });
      if (!response.ok) throw new Error("Failed to add board");
      await refreshBoards();
    } catch (error) {
      console.error("Error adding board:", error);
      throw error;
    }
  };

  const addCuttingHistory = async (data: Omit<CuttingData, "_id">) => {
    try {
      const response = await fetch("/api/cutting-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to add cutting history");
      await refreshCuttingHistory();
    } catch (error) {
      console.error("Error adding cutting history:", error);
      throw error;
    }
  };

  const addInventoryItem = async (item: Omit<InventoryItem, "_id">) => {
    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
      });
      if (!response.ok) throw new Error("Failed to add inventory item");
      await refreshInventory();
    } catch (error) {
      console.error("Error adding inventory item:", error);
      throw error;
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([
          refreshBoards(),
          refreshCuttingHistory(),
          refreshInventory(),
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  const value = {
    boards,
    cuttingHistory,
    inventory,
    isLoading,
    refreshBoards,
    refreshCuttingHistory,
    refreshInventory,
    addBoard,
    addCuttingHistory,
    addInventoryItem,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}
