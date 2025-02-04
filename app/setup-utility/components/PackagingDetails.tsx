"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Scissors, Box, Dribbble, BadgeMinus } from "lucide-react";
import { ItemSizes } from "@/typings/types";
import { ItemUtil } from "@/utils/ItemUtil";

interface PackagingDetailsProps {
  selectedSize: ItemSizes | "custom";
}

export function PackagingDetails({ selectedSize }: PackagingDetailsProps) {
  if (selectedSize === "custom") {
    return (
      <Card className="bg-white dark:bg-gray-800">
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
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Package className="h-5 w-5" />
          Packaging Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <DetailSection
              icon={
                <Scissors className="h-5 w-5 text-blue-800 dark:text-blue-300" />
              }
              title="Cutting & Assembly"
              details={[
                {
                  label: "Panels",
                  value: ItemUtil.getPanels(selectedSize),
                },
              ]}
            />

            <DetailSection
              icon={
                <Box className="h-5 w-5 text-blue-800 dark:text-blue-300" />
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

          <div className="space-y-4">
            <DetailSection
              icon={
                <Dribbble className="h-5 w-5 text-blue-800 dark:text-blue-300" />
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
                <BadgeMinus className="h-5 w-5 text-blue-800 dark:text-blue-300" />
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
    <div className="flex items-start gap-3">
      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold mb-1 text-sm">{title}</h4>
        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
          {details.map((detail, index) => (
            <p key={index}>
              {detail.label && (
                <span className="font-medium">{detail.label}:</span>
              )}{" "}
              {detail.value}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
