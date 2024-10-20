import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { cn } from "@/utils/functions";
import { BoxRequirement } from "@/typings/interfaces";

type OverviewTabProps = {
  isMobile: boolean;
  totalBoxes: number;
  filteredRequirements: [string, BoxRequirement][];
  selectedDates: Date[];
};

export function OverviewTab(
  { isMobile, totalBoxes, filteredRequirements, selectedDates }:
    OverviewTabProps,
) {
  return (
    <ScrollArea className="h-full">
      <div className={cn("space-y-6", isMobile ? "p-4" : "p-6")}>
        <div
          className={cn(
            "grid gap-6",
            isMobile
              ? "grid-cols-2"
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
          )}
        >
          <Card className="bg-background dark:bg-gray-800">
            <CardContent
              className={cn(
                "flex flex-col justify-center",
                isMobile ? "p-4" : "p-6",
              )}
            >
              <h3
                className={cn(
                  "font-semibold mb-2 text-foreground dark:text-gray-200",
                  isMobile ? "text-sm" : "text-lg",
                )}
              >
                Total Boxes
              </h3>
              <p
                className={cn(
                  "font-bold text-foreground dark:text-white",
                  isMobile ? "text-2xl" : "text-4xl",
                )}
              >
                {totalBoxes}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-background dark:bg-gray-800">
            <CardContent
              className={cn(
                "flex flex-col justify-center",
                isMobile ? "p-4" : "p-6",
              )}
            >
              <h3
                className={cn(
                  "font-semibold mb-2 text-foreground dark:text-gray-200",
                  isMobile ? "text-sm" : "text-lg",
                )}
              >
                Box Colors
              </h3>
              <p
                className={cn(
                  "font-bold text-foreground dark:text-white",
                  isMobile ? "text-2xl" : "text-4xl",
                )}
              >
                {filteredRequirements.length}
              </p>
            </CardContent>
          </Card>
          {!isMobile && (
            <Card className="bg-background dark:bg-gray-800">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2 text-foreground dark:text-gray-200">
                  Selected Days
                </h3>
                <p className="text-xl font-semibold text-foreground dark:text-white">
                  {selectedDates.length}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
        <Card className="bg-background dark:bg-gray-800">
          <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
            <h3
              className={cn(
                "font-semibold mb-4 text-foreground dark:text-gray-200",
                isMobile ? "text-sm" : "text-lg",
              )}
            >
              Box Color Overview
            </h3>
            <div
              className={cn(
                "grid gap-4",
                isMobile
                  ? "grid-cols-2"
                  : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
              )}
            >
              {filteredRequirements.map(([color, requirement]) => (
                <div
                  key={color}
                  className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg"
                >
                  <div
                    className={cn(
                      "rounded-md flex items-center justify-center text-white font-semibold mb-2",
                      isMobile ? "w-8 h-8 text-sm" : "w-16 h-16 text-lg",
                    )}
                    style={{
                      backgroundColor: color === "Custom"
                        ? "black"
                        : color.toLowerCase().split(" ").at(0),
                    }}
                  >
                    <span>{requirement.count}</span>
                  </div>
                  <h4
                    className={cn(
                      "font-semibold mb-2 text-foreground dark:text-gray-200",
                      isMobile ? "text-xs" : "text-sm",
                    )}
                  >
                    {color}
                  </h4>
                  <p
                    className={cn(
                      "text-gray-600 dark:text-gray-400",
                      isMobile ? "text-xs" : "text-sm",
                    )}
                  >
                    {requirement.count}{" "}
                    {requirement.count === 1 ? "box" : "boxes"}
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
