"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BuyLabelsDashboard } from "./BuyLabelsDashboard";
import { ViewLabel } from "./ViewLabel";
import { ShippingDashboardProps } from "@/typings/interfaces";

export function ShippingDashboard({ item, onClose }: ShippingDashboardProps) {
  const [activeTab, setActiveTab] = useState("buy");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800">
        <TabsTrigger
          value="buy"
          className="data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-gray-100"
        >
          Buy Labels
        </TabsTrigger>
        <TabsTrigger
          value="view"
          className="data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-gray-100"
        >
          View Label
        </TabsTrigger>
      </TabsList>
      <TabsContent value="view">
        <ViewLabel orderId={item.id} />
      </TabsContent>
      <TabsContent value="buy">
        <BuyLabelsDashboard item={item} onClose={onClose} />
      </TabsContent>
    </Tabs>
  );
}
