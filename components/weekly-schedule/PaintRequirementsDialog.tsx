import { Item, ColumnTitles, ItemDesigns } from "@/typings/types";
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
  const requirements = ItemUtil.getTotalPaintRequirements({
    id: dayTitle,
    title: dayTitle,
    items,
  });

  // Transform flat requirements to nested structure
  const nestedRequirements: Record<string, Record<string, number>> = {};

  Object.entries(requirements).forEach(([key, count]) => {
    const [design, ...colorParts] = key.split("-");
    const color = colorParts.join("-");

    if (!nestedRequirements[design]) {
      nestedRequirements[design] = {};
    }
    nestedRequirements[design]![color] = count;
  });

  // Filter out empty requirements
  const filteredRequirements = Object.entries(nestedRequirements).filter(
    ([_, colors]) => Object.keys(colors).length > 0
  );

  const customDesignItems = items.filter((item) => {
    const design = item.design as ItemDesigns;
    return !design || !DESIGN_COLOR_NAMES[design];
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] dark:bg-gray-800 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Paint Requirements for {dayTitle}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full max-h-[65vh] overflow-y-auto custom-scrollbar px-6 pb-6">
          <div className="space-y-4">
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
                        <span className="font-medium">{item.customerName}</span>{" "}
                        - {item.design}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {filteredRequirements.map(([design, colorRequirements]) => {
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
                          {Number(totalPieces)
                            .toFixed(2)
                            .replace(/\.00$/, "")}{" "}
                          pcs total
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
                      {Object.entries(colorRequirements).map(
                        ([colorName, pieces]) => {
                          // Try to find the hex code for the color if possible
                          // This might require a lookup if colorName matches one of the DESIGN_COLORS keys
                          // For now, we'll try to find it in the DESIGN_COLORS map if the structure allows,
                          // or just use a generic placeholder if we can't easily map back from name to hex here.
                          // Looking at ItemPreviewTooltip, it uses DESIGN_COLORS[design][index].hex
                          // But here we have the color NAME.
                          // We can try to find the color object in DESIGN_COLORS[design] that matches the name?
                          // Actually DESIGN_COLORS is Record<ItemDesigns, Record<number, { name: string, hex: string }>>
                          // So we can iterate to find the hex.

                          let hexColor = "#ccc";
                          const designColors =
                            DESIGN_COLORS[design as ItemDesigns];
                          if (designColors) {
                            const foundColor = Object.values(designColors).find(
                              (c) => c.name === colorName
                            );
                            if (foundColor) {
                              hexColor = foundColor.hex;
                            }
                          }

                          const percentage = (
                            (pieces / totalPieces) *
                            100
                          ).toFixed(1);

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
                        }
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
            {filteredRequirements.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p>No paint requirements for this day</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
