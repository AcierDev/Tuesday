import { Item, ColumnTitles, ItemDesigns } from "@/typings/types";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { ItemUtil } from "@/utils/ItemUtil";
import { DesignBlends, DESIGN_COLORS, DESIGN_COLOR_NAMES } from "@/typings/constants";
import { Sparkles } from "lucide-react";

interface PaintRequirementsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  dayTitle: string;
  getItemValue: (item: Item, columnName: ColumnTitles) => string;
}

const createBackground = (design: string) => {
  const colors = DesignBlends[design as ItemDesigns];
  if (colors && colors.length > 0) {
    return `linear-gradient(to right, ${colors.join(", ")})`;
  }
  return "#000000"; // Fallback color
};

export function PaintRequirementsDialog({
  isOpen,
  onClose,
  items,
  dayTitle,
}: PaintRequirementsDialogProps) {
  const [excludedItemIds, setExcludedItemIds] = useState<Set<string>>(
    new Set()
  );
  const [activeTab, setActiveTab] = useState<"requirements" | "orders">(
    "requirements"
  );

  const toggleItemExclusion = (itemId: string) => {
    const newExcluded = new Set(excludedItemIds);
    if (newExcluded.has(itemId)) {
      newExcluded.delete(itemId);
    } else {
      newExcluded.add(itemId);
    }
    setExcludedItemIds(newExcluded);
  };

  const includedItems = items.filter((item) => !excludedItemIds.has(item.id));
  const miniItems = includedItems.filter((item) => item.size === "14 x 7");
  const standardItems = includedItems.filter((item) => item.size !== "14 x 7");

  // For the orders list, we want to show ALL items, but grouped
  const allMiniItems = items.filter((item) => item.size === "14 x 7");
  const allStandardItems = items.filter((item) => item.size !== "14 x 7");

  const getRequirements = (itemsToProcess: Item[]) => {
    const requirements = ItemUtil.getTotalPaintRequirements({
      id: dayTitle,
      title: dayTitle,
      items: itemsToProcess,
    });

    // Transform flat requirements to nested structure
    const nestedRequirements: Record<string, Record<string, number>> = {};

    Object.entries(requirements).forEach(([key, count]) => {
      const parts = key.split("-");
      const design = parts[0];
      const color = parts.slice(1).join("-");

      if (!design) return;

      if (!nestedRequirements[design]) {
        nestedRequirements[design] = {};
      }
      nestedRequirements[design]![color] = count;
    });

    // Filter out empty requirements
    return Object.entries(nestedRequirements).filter(
      ([_, colors]) => Object.keys(colors).length > 0
    );
  };

  const standardRequirements = getRequirements(standardItems);
  const miniRequirements = getRequirements(miniItems);

  const customDesignItems = items.filter((item) => {
    const design = item.design as ItemDesigns;
    return !design || !DESIGN_COLOR_NAMES[design];
  });

  const renderRequirements = (
    requirements: [string, Record<string, number>][]
  ) => {
    return requirements.map(([design, colorRequirements]) => {
      const totalPieces = Object.values(colorRequirements).reduce(
        (a, b) => a + b,
        0
      );

      return (
        <Card
          key={design}
          className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="font-medium text-base">{design}</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {Number(totalPieces).toFixed(2).replace(/\.00$/, "")} pcs
                  total
                </span>
                <span
                  className="px-2 py-1 rounded-md text-xs font-medium text-white shadow-sm"
                  style={{ background: createBackground(design) }}
                >
                  Preview
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {Object.entries(colorRequirements).map(([colorName, pieces]) => {
                let hexColor = "#ccc";
                const designColors = DESIGN_COLORS[design as ItemDesigns];
                if (designColors) {
                  const foundColor = Object.values(designColors).find(
                    (c) => c.name === colorName
                  );
                  if (foundColor) {
                    hexColor = foundColor.hex;
                  }
                }

                const percentage = ((pieces / totalPieces) * 100).toFixed(1);

                return (
                  <div
                    key={`${design}-${colorName}`}
                    className="relative flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 overflow-hidden group hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 opacity-10 transition-all group-hover:opacity-20"
                      style={{
                        width: "100%",
                        backgroundColor: hexColor,
                      }}
                    />
                    <div className="flex items-center gap-3 z-10">
                      <div
                        className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm"
                        style={{ backgroundColor: hexColor }}
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {colorName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 z-10">
                      <span className="text-sm tabular-nums font-semibold text-gray-900 dark:text-gray-100">
                        {Number(pieces).toFixed(2).replace(/\.00$/, "")}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({percentage}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      );
    });
  };

  const renderOrderList = (title: string, items: Item[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 sticky top-[-1px] bg-white dark:bg-gray-800 py-2 z-20">
          {title}
        </h3>
        <div className="space-y-2">
          {items.map((item) => {
            const isIncluded = !excludedItemIds.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleItemExclusion(item.id)}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {item.customerName || "Unknown Customer"}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {item.design} • {item.size}
                  </span>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    isIncluded
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 group-hover:bg-green-200 dark:group-hover:bg-green-900/50"
                      : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 group-hover:bg-gray-300 dark:group-hover:bg-gray-600"
                  }`}
                >
                  {isIncluded ? "Included" : "Excluded"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] dark:bg-gray-800 p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-0 shrink-0 border-b border-gray-100 dark:border-gray-800">
          <div className="p-6 pb-4">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Paint Requirements
            </DialogTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              For {dayTitle}
            </p>
          </div>
          <div className="flex w-full">
            <button
              onClick={() => setActiveTab("requirements")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "requirements"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              Requirements
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "orders"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              Orders ({includedItems.length})
            </button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6">
          {activeTab === "requirements" ? (
            <div className="space-y-6">
              {customDesignItems.length > 0 && (
                <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
                      ⚠️ Custom Designs Detected
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                      The following orders have custom designs and are not
                      included in the paint requirements:
                    </p>
                    <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300">
                      {customDesignItems.map((item) => (
                        <li key={item.id}>
                          <span className="font-medium">
                            {item.customerName}
                          </span>{" "}
                          - {item.design}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {standardRequirements.length > 0 && (
                <div className="space-y-4">
                  {miniRequirements.length > 0 && (
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 sticky top-[-30px] bg-white dark:bg-gray-800 py-2 z-20">
                      Standard Orders
                    </h3>
                  )}
                  {renderRequirements(standardRequirements)}
                </div>
              )}

              {miniRequirements.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 sticky top-[-30px] bg-white dark:bg-gray-800 py-2 z-20">
                    Minis (14 x 7)
                  </h3>
                  {renderRequirements(miniRequirements)}
                </div>
              )}

              {standardRequirements.length === 0 &&
                miniRequirements.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p>No paint requirements for this day</p>
                    {excludedItemIds.size > 0 && (
                      <p className="text-sm mt-2">
                        (Some items are hidden in the Orders tab)
                      </p>
                    )}
                  </div>
                )}
            </div>
          ) : (
            <div className="space-y-6">
              {renderOrderList("Standard Orders", allStandardItems)}
              {renderOrderList("Minis (14 x 7)", allMiniItems)}
              {allStandardItems.length === 0 && allMiniItems.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p>No orders for this day</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
