"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Box, Hammer, HardHat } from "lucide-react";
import { Item, ItemDesigns, ItemSizes } from "@/typings/types";
import { ItemUtil } from "@/utils/ItemUtil";
import { PrintLabel, printStyles } from "./PrintLabel";

interface PackagingDetailsProps {
  selectedSize: ItemSizes | "custom";
  selectedDesign?: ItemDesigns;
  selectedOrder?: Item;
}

export function PackagingDetails({
  selectedSize,
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Package className="h-5 w-5 text-blue-800 dark:text-blue-300" />
            </div>
            Packaging Details
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
                <h2 style={printStyles.header}>Packaging Details</h2>

                <div style={printStyles.section}>
                  <h3 style={printStyles.sectionTitle}>Box Configuration</h3>
                  <div style={printStyles.grid}>
                    <div>
                      <span style={printStyles.label}>Quantity:</span>
                      <div style={printStyles.value}>
                        {ItemUtil.getBoxQuantity(selectedSize)}
                      </div>
                    </div>
                    <div>
                      <span style={printStyles.label}>Score:</span>
                      <div style={printStyles.value}>
                        {ItemUtil.getScore(selectedSize)}
                      </div>
                    </div>
                    <div>
                      <span style={printStyles.label}>Fold:</span>
                      <div style={printStyles.value}>
                        {ItemUtil.getFold(selectedSize)}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={printStyles.divider} />

                <div style={printStyles.section}>
                  <h3 style={printStyles.sectionTitle}>Protection</h3>
                  <div style={printStyles.content}>
                    {ItemUtil.getBubbleFoam(selectedSize)}
                  </div>
                </div>

                <div style={printStyles.divider} />

                <div style={printStyles.section}>
                  <h3 style={printStyles.sectionTitle}>Hardware Kit</h3>
                  <div style={printStyles.content}>
                    <div style={{ marginBottom: "8px" }}>
                      {ItemUtil.getHardwareBagContents(selectedSize)}
                    </div>
                    <div>
                      <span style={printStyles.label}>Rail:</span>{" "}
                      <span>{ItemUtil.getHangingRail(selectedSize)}</span>
                    </div>
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
                <HardHat className="h-6 w-6 text-blue-800 dark:text-blue-300" />
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
                <Hammer className="h-6 w-6 text-blue-800 dark:text-blue-300" />
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
