import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { cn } from "@/utils/functions";
import { BoxRequirement, HardwareBagRequirement, MountingRailRequirement } from '@/typings/interfaces';

type OverviewTabProps = {
  isMobile: boolean;
  totalBoxes: number;
  uniqueBoxColors: number;
  selectedDates: Date[];
  lockedBoxes: Record<string, number>;
  boxRequirements: BoxRequirement;
  lockedHardwareBags: Record<string, number>;
  hardwareBagRequirements: HardwareBagRequirement;
  lockedMountingRails: Record<string, number>;
  mountingRailRequirements: MountingRailRequirement;
  renderItemBox: (itemType: 'box' | 'hardwareBag' | 'mountingRail', itemName: string, count: number, isLocked: boolean) => JSX.Element;
};

export function OverviewTab({
  isMobile,
  totalBoxes,
  uniqueBoxColors,
  selectedDates,
  lockedBoxes,
  boxRequirements,
  lockedHardwareBags,
  hardwareBagRequirements,
  lockedMountingRails,
  mountingRailRequirements,
  renderItemBox
}: OverviewTabProps) {
  return (
    <ScrollArea className="h-full">
      <div className={cn("space-y-6", isMobile ? "p-4" : "p-6")}>
        <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
          <Card>
            <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
              <h3 className={cn("font-semibold mb-4", isMobile ? "text-lg" : "text-xl")}>Boxes Already Made</h3>
              <div className={cn(
                "grid gap-4",
                isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              )}>
                {Object.entries(lockedBoxes).map(([color, count]) => renderItemBox('box', color, count, true))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
              <h3 className={cn("font-semibold mb-4", isMobile ? "text-lg" : "text-xl")}>Boxes To Be Made</h3>
              <div className={cn(
                "grid gap-4",
                isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              )}>
                {Object.entries(boxRequirements).map(([color, count]) => {
                  if (count > 0) {
                    return renderItemBox('box', color, count, false)
                  }
                  return null
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className={cn("grid gap-6", isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
          <Card>
            <CardContent className={cn("flex flex-col justify-center", isMobile ? "p-4" : "p-6")}>
              <h3 className={cn("font-semibold mb-2", isMobile ? "text-sm" : "text-lg")}>Total Boxes</h3>
              <p className={cn("font-bold", isMobile ? "text-2xl" : "text-4xl")}>{totalBoxes}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className={cn("flex flex-col justify-center", isMobile ? "p-4" : "p-6")}>
              <h3 className={cn("font-semibold mb-2", isMobile ? "text-sm" : "text-lg")}>Box Colors</h3>
              <p className={cn("font-bold", isMobile ? "text-2xl" : "text-4xl")}>{uniqueBoxColors}</p>
            </CardContent>
          </Card>
          {!isMobile && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Selected Days</h3>
                <p className="text-xl font-semibold">{selectedDates?.length}</p>
              </CardContent>
            </Card>
          )}
        </div>
        <Card>
          <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
            <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>Hardware Bag Overview</h3>
            <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2")}>
              <div>
                <h4 className={cn("font-semibold mb-2", isMobile ? "text-xs" : "text-sm")}>Already Prepared</h4>
                <div className={cn(
                  "grid gap-4",
                  isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                )}>
                  {Object.entries(lockedHardwareBags).map(([bagType, count]) => renderItemBox('hardwareBag', bagType, count, true))}
                </div>
              </div>
              <div>
                <h4 className={cn("font-semibold mb-2", isMobile ? "text-xs" : "text-sm")}>To Be Prepared</h4>
                <div className={cn(
                  "grid gap-4",
                  isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                )}>
                  {Object.entries(hardwareBagRequirements).map(([bagType, count]) => {
                    if (count > 0) {
                      return renderItemBox('hardwareBag', bagType, count, false)
                    }
                    return null
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-2")}>
          <Card>
            <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
              <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>Mounting Rails Already Prepared</h3>
              <div className={cn(
                "grid gap-4",
                isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              )}>
                {Object.entries(lockedMountingRails).map(([railType, count]) => renderItemBox('mountingRail', railType, count, true))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
              <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>Mounting Rails To Be Prepared</h3>
              <div className={cn(
                "grid gap-4",
                isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              )}>
                {Object.entries(mountingRailRequirements).map(([railType, count]) => {
                  if (count > 0) {
                    return renderItemBox('mountingRail', railType, count, false)
                  }
                  return null
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}