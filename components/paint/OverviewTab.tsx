import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { cn } from "@/utils/functions";
import { ItemUtil } from "@/utils/ItemUtil";

type OverviewTabProps = {
  isMobile: boolean;
  totalPieces: number;
  filteredRequirements: [string][];
  selectedDates: Date[];
};

export function OverviewTab({
  isMobile,
  filteredRequirements,
}: OverviewTabProps) {
  const totalPieces = Object.values(
    ItemUtil.getTotalPaintRequirements(group)
  ).reduce((sum, pieces) => sum + pieces, 0);

  return (
    <ScrollArea className="h-full">
      <div className={cn("space-y-6", isMobile ? "p-4" : "p-6")}>
        <div
          className={cn(
            "grid gap-6",
            isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2"
          )}
        >
          <Card className="bg-background dark:bg-gray-800">
            <CardContent
              className={cn(
                "flex flex-col justify-center",
                isMobile ? "p-4" : "p-6"
              )}
            >
              <h3
                className={cn(
                  "font-semibold mb-2 text-foreground dark:text-gray-200",
                  isMobile ? "text-sm" : "text-lg"
                )}
              >
                Total Squares
              </h3>
              <p
                className={cn(
                  "font-bold text-foreground dark:text-white",
                  isMobile ? "text-2xl" : "text-4xl"
                )}
              >
                {totalPieces}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-background dark:bg-gray-800">
            <CardContent
              className={cn(
                "flex flex-col justify-center",
                isMobile ? "p-4" : "p-6"
              )}
            >
              <h3
                className={cn(
                  "font-semibold mb-2 text-foreground dark:text-gray-200",
                  isMobile ? "text-sm" : "text-lg"
                )}
              >
                Designs
              </h3>
              <p
                className={cn(
                  "font-bold text-foreground dark:text-white",
                  isMobile ? "text-2xl" : "text-4xl"
                )}
              >
                {filteredRequirements.length}
              </p>
            </CardContent>
          </Card>
        </div>
        <Card className="bg-background dark:bg-gray-800">
          <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
            <h3
              className={cn(
                "font-semibold mb-4 text-foreground dark:text-gray-200",
                isMobile ? "text-sm" : "text-lg"
              )}
            >
              Design Overview
            </h3>
            <div
              className={cn(
                "grid gap-4",
                isMobile
                  ? "grid-cols-2"
                  : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              )}
            >
              {filteredRequirements.map(([design, colorRequirements]) => (
                <div
                  key={design}
                  className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg"
                >
                  <h4
                    className={cn(
                      "font-semibold mb-2 text-foreground dark:text-gray-200",
                      isMobile ? "text-xs" : "text-sm"
                    )}
                  >
                    {design}
                  </h4>
                  <p
                    className={cn(
                      "font-bold text-foreground dark:text-white",
                      isMobile ? "text-lg" : "text-2xl"
                    )}
                  >
                    {Object.values(colorRequirements).reduce(
                      (sum, pieces) => sum + pieces,
                      0
                    )}
                  </p>
                  <p
                    className={cn(
                      "text-gray-600 dark:text-gray-400",
                      isMobile ? "text-xs" : "text-sm"
                    )}
                  >
                    Squares
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
