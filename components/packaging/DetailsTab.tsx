import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { cn } from "@/utils/functions";
import { BOX_COLORS } from "@/utils/constants";
import { ColumnTitles, Item, ItemSizes } from '@/typings/types';
import { BoxRequirement } from '@/typings/interfaces';

type DetailsTabProps = {
  isMobile: boolean;
  filteredRequirements: [string, BoxRequirement][];
};

export function DetailsTab({ isMobile, filteredRequirements }: DetailsTabProps) {
  return (
    <ScrollArea className="h-full">
      <div className={cn("space-y-6", isMobile ? "p-4" : "p-6")}>
        <Card>
          <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
            <h3 className={cn("font-semibold mb-4", isMobile ? "text-lg" : "text-xl")}>Box Color Details</h3>
            <div className={cn(
              "grid gap-4",
              isMobile ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            )}>
              {filteredRequirements.map(([color, requirement]) => (
                <div 
                  key={color}
                  className="bg-gray-100 p-4 rounded-lg"
                >
                  <div 
                    className={cn(
                      "rounded-md flex items-center justify-center text-white font-semibold mb-2",
                      isMobile ? "w-8 h-8 text-sm" : "w-16 h-16 text-lg"
                    )}
                    style={{ backgroundColor: color === "Custom" ? "black" : color.toLowerCase().split(" ").at(0) }}
                  >
                    <span>{requirement.count}</span>
                  </div>
                  <h4 className={cn("font-semibold mb-2", isMobile ? "text-xs" : "text-sm")}>{color}</h4>
                  <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Hardware: {requirement.hardwareBag}</p>
                  <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>Rail: {requirement.mountingRail}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
            <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>Box Sizes Guide</h3>
            <div className={cn(
              "grid gap-4",
              isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            )}>
              {Object.entries(BOX_COLORS).map(([size, { color, count, hardwareBag, mountingRail }]) => (
                <div key={size} className={cn(
                  "p-2 bg-gray-100 rounded",
                  isMobile ? "text-xs" : ""
                )}>
                  <span className="font-semibold block">{size}</span>
                  <span>{`${color} (${count}x)`}</span>
                  <span className="block text-gray-600">Hardware: {hardwareBag}</span>
                  <span className="block text-gray-600">Rail: {mountingRail}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}