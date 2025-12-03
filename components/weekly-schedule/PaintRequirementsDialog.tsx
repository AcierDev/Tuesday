import { Item, ColumnTitles, ItemDesigns } from "@/typings/types";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { ItemUtil } from "@/utils/ItemUtil";

interface PaintRequirementsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  dayTitle: string;
  getItemValue: (item: Item, columnName: ColumnTitles) => string;
}

const renderColorBox = (
  design: ItemDesigns,
  color: string,
  pieces: number,
  isSmall: boolean
) => {
  return (
    <div
      key={`${design}-${color}`}
      className="flex flex-col items-center justify-center p-2 border rounded-md bg-white dark:bg-gray-700 shadow-sm"
    >
      <div
        className="w-8 h-8 rounded-full mb-2 border border-gray-200 dark:border-gray-600"
        style={{ backgroundColor: color.toLowerCase() }}
        title={color}
      />
      <span
        className="text-sm font-medium text-center truncate w-full"
        title={color}
      >
        {color}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {pieces} pcs
      </span>
    </div>
  );
};

export function PaintRequirementsDialog({
  isOpen,
  onClose,
  items,
  dayTitle,
  getItemValue,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Paint Requirements for {dayTitle}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full max-h-[60vh]">
          <div className="space-y-6 p-6">
            {filteredRequirements.map(([design, colorRequirements]) => (
              <Card key={design} className="bg-background dark:bg-gray-800">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 text-lg text-foreground dark:text-gray-200">
                    {design}
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {Object.entries(colorRequirements).map(([color, pieces]) =>
                      renderColorBox(
                        design as ItemDesigns,
                        color,
                        pieces,
                        false
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredRequirements.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No paint requirements for this day
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
