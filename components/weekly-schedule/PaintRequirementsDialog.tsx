import { Item, ColumnTitles, ItemDesigns } from "@/typings/types";
import { calculatePaintRequirements } from "../paint/PaintCalculations";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { renderColorBox } from "../paint/RenderColorBox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

interface PaintRequirementsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  dayTitle: string;
  getItemValue: (item: Item, columnName: ColumnTitles) => string;
}

export function PaintRequirementsDialog({
  isOpen,
  onClose,
  items,
  dayTitle,
  getItemValue,
}: PaintRequirementsDialogProps) {
  const requirements = calculatePaintRequirements({
    id: dayTitle,
    title: dayTitle,
    items,
  });

  // Filter out empty requirements
  const filteredRequirements = Object.entries(requirements).filter(
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
