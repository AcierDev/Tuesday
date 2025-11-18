"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler, Scissors } from "lucide-react";
import { ItemSizes, Item } from "@/typings/types";
import { ItemUtil } from "@/utils/ItemUtil";
import { PrintLabel, printStyles } from "./PrintLabel";

interface BackboardDetailsProps {
  selectedSize: ItemSizes | "custom";
  selectedOrder?: Item;
}

export function BackboardDetails({
  selectedSize,
  selectedOrder,
}: BackboardDetailsProps) {
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

  // Get backboard sizes and count duplicates
  const backboardSizes = ItemUtil.getBackboardSizes(selectedSize);
  const sizeCounts = backboardSizes.reduce((acc, size) => {
    const cleanSize = size
      .replace(/<sup>(\d+)<\/sup>⁄<sub>(\d+)<\/sub>/g, " $1/$2")
      .replace(/<[^>]+>/g, "")
      .replace(/&times;/g, "×")
      .replace(/→/g, "→")
      .trim();
    acc[cleanSize] = (acc[cleanSize] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Backboard Details
          </CardTitle>
          <PrintLabel
            labelContent={
              <div style={printStyles.container}>
                {selectedOrder && (
                  <div style={printStyles.customerName}>
                    Customer:{" "}
                    {
                      selectedOrder.customerName
                    }
                  </div>
                )}
                <h2 style={printStyles.header}>Backboard Details</h2>

                <div style={printStyles.section}>
                  <h3 style={printStyles.sectionTitle}>Cutting & Assembly</h3>
                  <div style={printStyles.content}>
                    <span style={printStyles.label}>Panels:</span>
                    <div style={{ marginTop: "4px" }}>
                      {Object.entries(panelCounts)
                        .map(([panel, count]) =>
                          count > 1 ? `${panel} (×${count})` : panel
                        )
                        .join(", ")}
                    </div>
                  </div>
                </div>

                <div style={printStyles.divider} />

                <div style={printStyles.section}>
                  <h3 style={printStyles.sectionTitle}>Backboard Cutting</h3>
                  <div style={printStyles.content}>
                    {Object.entries(sizeCounts).map(([size, count], index) => {
                      const formattedSize = size
                        .replace(/(\d+)(\s+\d+\/\d+)/g, "$1$2")
                        .replace(/(\d+)\s*-\s*(\d+\/\d+)/g, "$1-$2")
                        .replace(/(\d+)\/(\d+)/g, "$1/$2")
                        .replace(/\s+/g, " ")
                        .trim();

                      return (
                        <div
                          key={index}
                          style={{
                            marginBottom: "4px",
                            fontFamily: "system-ui, -apple-system, sans-serif",
                          }}
                        >
                          {count > 1
                            ? `${formattedSize} (×${count})`
                            : formattedSize}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={printStyles.signatureSection}>
                  <div style={printStyles.signatureLine} />
                  <div style={printStyles.signatureLabel}>Verified By</div>
                </div>
              </div>
            }
          />
        </div>
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
          details={Object.entries(sizeCounts).map(([size, count]) => ({
            value: count > 1 ? `${size} (×${count})` : size,
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
