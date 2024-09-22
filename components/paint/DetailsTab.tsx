import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { cn } from "@/utils/functions";
import { ItemDesigns } from "@/typings/types";
import { PaintRequirement } from "./PaintCalculations";
import { renderColorBox } from "./RenderColorBox";

type DetailsTabProps = {
  isMobile: boolean;
  filteredRequirements: [string, PaintRequirement][];
};

export function DetailsTab({ isMobile, filteredRequirements }: DetailsTabProps) {
  return (
    <ScrollArea className="h-full">
      <div className={cn("space-y-6", isMobile ? "p-4" : "p-6")}>
        {filteredRequirements.map(([design, colorRequirements]) => (
          <Card key={design}>
            <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
              <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>{design}</h3>
              <div className={cn(
                "grid gap-4",
                isMobile ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10"
              )}>
                {Object.entries(colorRequirements).map(([color, pieces]) => 
                  renderColorBox(design as ItemDesigns, color, pieces, isMobile)
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}