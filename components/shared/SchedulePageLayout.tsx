import { WeekSelector } from "@/components/weekly-schedule/WeekSelector";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/functions";
import { RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Group, Board, Item } from "@/typings/types";
import { ItemGroupPreview } from "../orders/ItemGroupPreview";

type SchedulePageLayoutProps = {
  title: string;
  isMobile: boolean;
  currentWeekStart: Date;
  changeWeek: (direction: 'prev' | 'next') => void;
  resetToCurrentWeek: () => void;
  renderFilters: () => React.ReactNode;
  renderWeekView: () => React.ReactNode;
  tabs: {
    value: string;
    label: string;
    content: React.ReactNode;
  }[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hasDataInPreviousWeek: boolean;
  hasDataInNextWeek: boolean;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  isCurrentWeek: boolean;
  group: Group;
  board: Board;
  updateItem: (updatedItem: Item) => Promise<void>;
};

export function SchedulePageLayout({ 
  title, 
  isMobile, 
  currentWeekStart,
  changeWeek, 
  resetToCurrentWeek,
  renderFilters, 
  renderWeekView, 
  tabs,
  activeTab,
  setActiveTab,
  hasDataInPreviousWeek,
  hasDataInNextWeek,
  weekStartsOn,
  isCurrentWeek,
  group,
  board,
  updateItem
}: SchedulePageLayoutProps) {
  return (
    <div className={cn(
      "container mx-auto py-4 min-h-screen flex flex-col",
      isMobile ? "px-2" : "px-4"
    )}>
      <div className={cn(
        "flex items-center mb-4",
        isMobile ? "justify-between" : "justify-start"
      )}>
        <h1 className={cn(
          "font-bold",
          isMobile ? "text-2xl" : "text-3xl"
        )}>{title}</h1>
        {isMobile && renderFilters()}
      </div>

      {!isMobile && (
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-grow">{renderFilters()}</div>
          <div className="flex items-center space-x-2">
            <WeekSelector 
              currentWeekStart={currentWeekStart} 
              onChangeWeek={changeWeek}
              hasDataInPreviousWeek={hasDataInPreviousWeek}
              hasDataInNextWeek={hasDataInNextWeek}
              weekStartsOn={weekStartsOn}
            />
            {!isCurrentWeek && (
              <Button
                variant="outline"
                size="icon"
                onClick={resetToCurrentWeek}
                aria-label="Reset to current week"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {isMobile && (
        <div className="mb-4 flex items-center space-x-2">
          <WeekSelector 
            currentWeekStart={currentWeekStart} 
            onChangeWeek={changeWeek}
            hasDataInPreviousWeek={hasDataInPreviousWeek}
            hasDataInNextWeek={hasDataInNextWeek}
            weekStartsOn={weekStartsOn}
          />
          {!isCurrentWeek && (
            <Button
              variant="outline"
              size="icon"
              onClick={resetToCurrentWeek}
              aria-label="Reset to current week"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {renderWeekView()}

      <div className="mt-6">
        <ItemGroupPreview group={group} board={board} updateItem={updateItem}/>
      </div>

      <Card className="flex-grow mt-4 overflow-hidden">
        <Tabs className="h-full flex flex-col" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 p-0 bg-muted">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.value}
                value={tab.value} 
                className={cn(
                  "flex-1 py-2 px-4 rounded-none",
                  "data-[state=active]:bg-background data-[state=active]:shadow-[inset_0_-2px_0_0_var(--tw-shadow-color)]",
                  "shadow-primary",
                  "transition-all duration-200 ease-in-out",
                  isMobile ? "text-sm" : "text-base"
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.value} className="flex-grow overflow-auto mt-0 p-4" value={tab.value}>
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </div>
  );
}