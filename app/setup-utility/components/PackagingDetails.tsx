"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Box, Dribbble, BadgeMinus } from "lucide-react";
import { Item, ItemDesigns, ItemSizes } from "@/typings/types";
import { ItemUtil } from "@/utils/ItemUtil";

interface PackagingDetailsProps {
  selectedSize: ItemSizes | "custom";
  selectedDesign?: ItemDesigns;
  selectedOrder?: Item;
}

export function PackagingDetails({
  selectedSize,
  selectedDesign,
  selectedOrder,
}: PackagingDetailsProps) {
  if (selectedSize === "custom") {
    return (
      <Card className="bg-white dark:bg-gray-800 transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Packaging Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500 flex flex-col items-center gap-2">
            <Package className="h-8 w-8 text-gray-400" />
            <p>Packaging details are not available for custom sizes.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800 transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Package className="h-5 w-5 text-blue-800 dark:text-blue-300" />
          </div>
          Packaging Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <DetailSection
              icon={
                <Box className="h-6 w-6 text-blue-800 dark:text-blue-300" />
              }
              title="Box Configuration"
              details={[
                {
                  label: "Quantity",
                  value: ItemUtil.getBoxQuantity(selectedSize),
                },
                {
                  label: "Score",
                  value: ItemUtil.getScore(selectedSize),
                },
                {
                  label: "Fold",
                  value: ItemUtil.getFold(selectedSize),
                },
              ]}
            />
          </div>

          <div className="space-y-6 md:border-l md:pl-6">
            <DetailSection
              icon={
                <Dribbble className="h-6 w-6 text-blue-800 dark:text-blue-300" />
              }
              title="Protection"
              details={[
                {
                  value: ItemUtil.getBubbleFoam(selectedSize),
                },
              ]}
            />

            <DetailSection
              icon={
                <BadgeMinus className="h-6 w-6 text-blue-800 dark:text-blue-300" />
              }
              title="Hardware Kit"
              details={[
                {
                  value: ItemUtil.getHardwareBagContents(selectedSize),
                },
                {
                  label: "Rail",
                  value: ItemUtil.getHangingRail(selectedSize),
                },
              ]}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DetailSectionProps {
  icon: React.ReactNode;
  title: string;
  details: Array<{
    label?: string;
    value: string;
  }>;
}

function DetailSection({ icon, title, details }: DetailSectionProps) {
  return (
    <div className="flex items-start gap-4 p-3 rounded-lg transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <div className="p-2.5 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold mb-2 text-sm text-gray-900 dark:text-gray-100">
          {title}
        </h4>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          {details.map((detail, index) => (
            <p key={index} className="flex items-center gap-1">
              {detail.label && (
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {detail.label}:
                </span>
              )}{" "}
              {detail.value}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
