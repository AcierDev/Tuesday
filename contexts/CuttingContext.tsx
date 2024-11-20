import React, { createContext, useContext, useState, useEffect } from "react";
import { CuttingData } from "@/typings/interfaces";
import { startOfDay } from "date-fns";

interface CuttingContextType {
  data: CuttingData[];
  isLoading: boolean;
  updateCuttingData: (date: Date, count: number) => Promise<void>;
  refreshData: () => Promise<void>;
}

const CuttingContext = createContext<CuttingContextType | undefined>(undefined);

export function CuttingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<CuttingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/cutting-history");
      if (!response.ok) {
        throw new Error("Failed to fetch cutting history");
      }
      const result = await response.json();

      setData(
        result.map((item: any) => ({
          date: startOfDay(new Date(item.date)),
          count: item.count,
        }))
      );
    } catch (error) {
      console.error("Error fetching cutting data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateCuttingData = async (date: Date, count: number) => {
    try {
      const response = await fetch("/api/cutting-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: startOfDay(date).toISOString(),
          count,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update cutting data");
      }

      // Optimistically update the local state
      setData((prevData) => {
        const newData = [...prevData];
        const existingIndex = newData.findIndex(
          (item) => item.date.getTime() === startOfDay(date).getTime()
        );

        if (existingIndex >= 0) {
          newData[existingIndex] = { date: startOfDay(date), count };
        } else {
          newData.push({ date: startOfDay(date), count });
        }

        return newData;
      });
    } catch (error) {
      console.error("Error updating cutting data:", error);
      // Refresh data in case of error to ensure consistency
      await fetchData();
      throw error;
    }
  };

  const refreshData = fetchData;

  return (
    <CuttingContext.Provider
      value={{ data, isLoading, updateCuttingData, refreshData }}
    >
      {children}
    </CuttingContext.Provider>
  );
}

export function useCuttingData() {
  const context = useContext(CuttingContext);
  if (context === undefined) {
    throw new Error("useCuttingData must be used within a CuttingProvider");
  }
  return context;
}
