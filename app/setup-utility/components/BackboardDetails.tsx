"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler, Scissors } from "lucide-react";
import { ItemSizes } from "@/typings/types";
import { ItemUtil } from "@/utils/ItemUtil";

interface BackboardDetailsProps {
  selectedSize: ItemSizes | "custom";
}

export function BackboardDetails({ selectedSize }: BackboardDetailsProps) {
  if (selectedSize === "custom") {
    return (
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Backboard Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500 flex flex-col items-center gap-2">
            <Ruler className="h-8 w-8 text-gray-400" />
            <p>Backboard details are not available for custom sizes.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const panels = ItemUtil.getPanels(selectedSize);
  const panelCounts = panels.reduce((acc, panel) => {
    acc[panel] = (acc[panel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Ruler className="h-5 w-5" />
          Backboard Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DetailSection
          icon={
            <Scissors className="h-5 w-5 text-blue-800 dark:text-blue-300" />
          }
          title="Cutting & Assembly"
          details={[
            {
              label: "Panels",
              value: Object.entries(panelCounts)
                .map(([panel, count]) =>
                  count > 1 ? `${panel} (×${count})` : panel
                )
                .join(", "),
            },
          ]}
        />

        <DetailSection
          icon={<Ruler className="h-5 w-5 text-blue-800 dark:text-blue-300" />}
          title="Backboard Cutting"
          details={ItemUtil.getBackboardSizes(selectedSize).map((size) => ({
            value: size,
          }))}
        />
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
            <p key={index} dangerouslySetInnerHTML={{ __html: detail.value }} />
          ))}
        </div>
      </div>
    </div>
  );
}
