// OverviewTab.tsx
import React from 'react';
import { cn } from '@/utils/functions';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { Card, CardContent } from '../ui/card';
import { backboardData } from '@/utils/constants';
import { ItemSizes } from '@/typings/types';

type OverviewTabProps = {
  isMobile: boolean;
  totalPanels: number;
  filteredRequirements: [string, number][];
  selectedDates: Date[];
};

export const OverviewTab: React.FC<OverviewTabProps> = ({
  isMobile,
  totalPanels,
  filteredRequirements,
  selectedDates
}) => {
  return (
    <ScrollArea className="h-full">
      <div className={cn("space-y-6", isMobile ? "p-4" : "p-6")}>
        <div className={cn("grid gap-6", isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
          <Card>
            <CardContent className={cn("flex flex-col justify-center", isMobile ? "p-4" : "p-6")}>
              <h3 className={cn("font-semibold mb-2", isMobile ? "text-sm" : "text-lg")}>Total Panels</h3>
              <p className={cn("font-bold", isMobile ? "text-2xl" : "text-4xl")}>{totalPanels}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className={cn("flex flex-col justify-center", isMobile ? "p-4" : "p-6")}>
              <h3 className={cn("font-semibold mb-2", isMobile ? "text-sm" : "text-lg")}>Sizes</h3>
              <p className={cn("font-bold", isMobile ? "text-2xl" : "text-4xl")}>{filteredRequirements.length}</p>
            </CardContent>
          </Card>
          {!isMobile && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Selected Days</h3>
                <p className="text-xl font-semibold">{selectedDates.length}</p>
              </CardContent>
            </Card>
          )}
        </div>
        <Card>
          <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
            <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>Size Overview</h3>
            <div className={cn(
              "grid gap-4",
              isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            )}>
              {filteredRequirements.map(([size, count]) => {
                const { panels, width, height } = backboardData[size as ItemSizes];
                const totalArea = width * height * count;
                return (
                  <div key={size} className="bg-gray-100 p-4 rounded-lg">
                    <h4 className={cn("font-semibold mb-2", isMobile ? "text-xs" : "text-sm")}>{size}</h4>
                    <p className={cn("font-bold", isMobile ? "text-lg" : "text-2xl")}>
                      {count}
                    </p>
                    <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                      backboards ({totalArea.toFixed(2)} sq in)
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};
