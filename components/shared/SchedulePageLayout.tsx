import { WeekSelector } from "@/components/weekly-schedule/WeekSelector";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/functions";
import { RefreshCw } from "lucide-react";

type SchedulePageLayoutProps = {
  title: string;
  isMobile: boolean;
  currentWeekStart: Date;
  changeWeek: (direction: 'prev' | 'next') => void;
  resetToCurrentWeek: () => void;
  renderFilters: () => React.ReactNode;
  renderWeekView: () => React.ReactNode;
  renderTabs: () => React.ReactNode;
  hasDataInPreviousWeek: boolean;
  hasDataInNextWeek: boolean;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  isCurrentWeek: boolean;
};

export function SchedulePageLayout({ 
  title, 
  isMobile, 
  currentWeekStart, 
  changeWeek, 
  resetToCurrentWeek,
  renderFilters, 
  renderWeekView, 
  renderTabs,
  hasDataInPreviousWeek,
  hasDataInNextWeek,
  weekStartsOn,
  isCurrentWeek
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
            {!isCurrentWeek && <Button
              variant="outline"
              size="icon"
              onClick={resetToCurrentWeek}
              aria-label="Reset to current week"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>}
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
          <Button
            variant="outline"
            size="icon"
            onClick={resetToCurrentWeek}
            aria-label="Reset to current week"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {renderWeekView()}

      {renderTabs()}
    </div>
  );
}