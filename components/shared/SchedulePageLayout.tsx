import { WeekSelector } from "@/components/weekly-schedule/WeekSelector";
import { cn } from "@/utils/functions";

type SchedulePageLayoutProps = {
  title: string;
  isMobile: boolean;
  currentWeekStart: Date;
  changeWeek: (direction: 'prev' | 'next') => void;
  renderFilters: () => React.ReactNode;
  renderWeekView: () => React.ReactNode;
  renderTabs: () => React.ReactNode;
};

export function SchedulePageLayout({ 
  title, 
  isMobile, 
  currentWeekStart, 
  changeWeek, 
  renderFilters, 
  renderWeekView, 
  renderTabs 
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
          <WeekSelector currentWeekStart={currentWeekStart} onChangeWeek={changeWeek} />
        </div>
      )}

      {isMobile && (
        <div className="mb-4">
          <WeekSelector currentWeekStart={currentWeekStart} onChangeWeek={changeWeek} />
        </div>
      )}

      {renderWeekView()}

      {renderTabs()}
    </div>
  );
}