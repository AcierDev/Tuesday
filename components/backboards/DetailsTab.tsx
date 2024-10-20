import React from "react";
import { cn } from "@/utils/functions";
import { Card, CardContent } from "@/components/ui/card";
import { Scissors } from "lucide-react";
import { Item, ItemSizes } from "@/typings/types";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { backboardData } from "@/utils/constants";

type DetailsTabProps = {
  isMobile: boolean;
  filteredRequirements: [ItemSizes, number][];
  selectedItems: Item[];
};

export const DetailsTab: React.FC<DetailsTabProps> = ({
  isMobile,
  filteredRequirements,
  selectedItems,
}) => {
  return (
    <ScrollArea className="h-full">
      <div className={cn("space-y-6", isMobile ? "p-4" : "p-6")}>
        {filteredRequirements.map(([size, count]) => {
          const sizeData = backboardData[size as ItemSizes];
          const totalArea = sizeData.width * sizeData.height * count;
          return (
            <Card key={size} className="bg-background dark:bg-gray-800">
              <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                  <h3
                    className={cn(
                      "font-semibold text-foreground dark:text-gray-200",
                      isMobile ? "text-lg" : "text-xl",
                    )}
                  >
                    {size}
                  </h3>
                  <div className="flex items-center mt-2 md:mt-0">
                    <Scissors className="w-4 h-4 mr-2 text-foreground dark:text-gray-300" />
                    <span className="text-sm font-medium text-foreground dark:text-gray-300">
                      Panels: {sizeData.panels}
                    </span>
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2 text-foreground dark:text-gray-200">
                      Cutting Instructions:
                    </h4>
                    <p className="text-sm whitespace-pre-line bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-foreground dark:text-gray-300">
                      {sizeData.instructions}
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground dark:text-gray-300">
                          Total Art Squares:
                        </p>
                        <p className="text-lg font-bold text-foreground dark:text-white">
                          {count}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground dark:text-gray-300">
                          Total Panels:
                        </p>
                        <p className="text-lg font-bold text-foreground dark:text-white">
                          {sizeData.panels * count}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground dark:text-gray-300">
                          Blank Size:
                        </p>
                        <p className="text-lg font-bold text-foreground dark:text-white">
                          {sizeData.blankSize}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
};
