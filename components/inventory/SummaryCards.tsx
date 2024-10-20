import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, BarChart, Clipboard } from "lucide-react";
import { CountFrequency, InventoryItem } from "@/typings/types";

interface SummaryCardsProps {
  inventory: InventoryItem[];
  lowStockItems: InventoryItem[];
  countFilter: "All" | CountFrequency;
  handleCountFilterChange: (filter: CountFrequency) => void;
}

export default function SummaryCards(
  { inventory, lowStockItems, countFilter, handleCountFilterChange }:
    SummaryCardsProps,
) {
  return (
    <div className="grid gap-6 mb-8 md:grid-cols-2 xl:grid-cols-5">
      <Card className="dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          <Clipboard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{inventory?.length}</div>
        </CardContent>
      </Card>
      <Card className="dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{lowStockItems?.length}</div>
        </CardContent>
      </Card>
      {Object.values(CountFrequency).map((frequency) => (
        <Button
          key={frequency}
          onClick={() => handleCountFilterChange(frequency)}
          className={`h-full transition-all duration-300 ease-in-out transform ${
            countFilter === frequency
              ? "bg-primary scale-105 shadow-lg border-2 border-blue-500"
              : "bg-card hover:bg-primary/90"
          } dark:bg-gray-800`}
        >
          <Card className="w-full h-full border-none shadow-none bg-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {frequency} Count Items
              </CardTitle>
              <BarChart className={`h-4 w-4`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {inventory?.filter((item) => item.countFrequency === frequency)
                  .length}
              </div>
            </CardContent>
          </Card>
        </Button>
      ))}
    </div>
  );
}
