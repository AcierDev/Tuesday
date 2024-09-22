import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { cn } from "@/utils/functions";
import { BOX_COLORS } from "@/utils/constants";
import { ColumnTitles, Item, ItemSizes } from '@/typings/types';

type DetailsTabProps = {
  isMobile: boolean;
  filteredRequirements: [string, number][];
  selectedItems: Item[];
};

export function DetailsTab({ isMobile, filteredRequirements, selectedItems }: DetailsTabProps) {
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
              {filteredRequirements.map(([color, count]) => {
                const { hardwareBag, mountingRail } = Object.values(BOX_COLORS).find(box => box.color === color) || {}
                return (
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
                      <span>{count}</span>
                    </div>
                    <h4 className={cn("font-semibold mb-2", isMobile ? "text-xs" : "text-sm")}>{color}</h4>
                    {hardwareBag && <p className={cn("text-gray-600 mb-1", isMobile ? "text-xs" : "text-sm")}>Hardware: {hardwareBag}</p>}
                    {mountingRail && <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>Rail: {mountingRail}</p>}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
            <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>Items Requiring Boxes</h3>
            <div className="space-y-4">
              {selectedItems.map((item) => {
                const name = item.values.find(v => v.columnName === ColumnTitles.Customer_Name)?.text || 'Unnamed Item'
                const size = item.values.find(v => v.columnName === ColumnTitles.Size)?.text
                const boxColor = size && (size in BOX_COLORS) ? BOX_COLORS[size as ItemSizes].color : 'Unknown Color'
                const mountingRail = size && (size in BOX_COLORS) ? BOX_COLORS[size as ItemSizes].mountingRail : 'Unknown Rail'
                return (
                  <div key={item.id} className={cn(
                    "flex justify-between items-center p-2 bg-gray-100 rounded",
                    isMobile ? "flex-col items-start" : ""
                  )}>
                    <span className={cn("font-medium", isMobile ? "text-xs mb-1" : "")}>{name}</span>
                    <div className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                      <span className="mr-2">{size || 'Unknown Size'}</span>
                      <span className="font-semibold mr-2">{boxColor}</span>
                      <span className={isMobile ? "block mt-1" : ""}>Rail: {mountingRail}</span>
                    </div>
                  </div>
                )
              })}
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