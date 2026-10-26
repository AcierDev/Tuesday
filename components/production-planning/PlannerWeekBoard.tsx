"use client";

import { addDays, format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";

import type { DayName } from "@/typings/types";
import { DroppableDayColumn } from "@/components/production-planning/DroppableDayColumn";
import {
  DAYS,
  DAY_OFFSET_FROM_WEEK_START,
  type AutoPlanDayMap,
} from "@/components/production-planning/planner-config";
import type { DayGroup } from "@/components/production-planning/planner-data";
import type { OrderMeta } from "@/components/production-planning/types";

const WEEK_SLIDE_OFFSET = 60;
const WEEK_SLIDE_VARIANTS = {
  enter: (dir: number) => ({ x: dir * WEEK_SLIDE_OFFSET, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -WEEK_SLIDE_OFFSET, opacity: 0 }),
};

interface PlannerWeekBoardProps {
  currentWeekKey: string;
  currentWeekStart: Date;
  today: Date;
  viewingNextWeek: boolean;
  todayColumnDay: DayName | null;
  activeDayName: DayName | null;
  scrollerRef: (node: HTMLDivElement | null) => void;
  dayGroups: Record<DayName, DayGroup>;
  allOrdersById: Map<string, OrderMeta>;
  dailyCapacitySquares: number;
  dailyGreenThresholdSquares: number;
  autoPlanDays: AutoPlanDayMap;
  onToggleAutoPlanDay: (day: DayName) => void;
  onTogglePin: (id: string, actualDay: DayName) => void;
  recentlyPlacedIds: Set<string>;
  onContextMenu: (e: React.MouseEvent, itemId: string) => void;
}

// Day columns slide horizontally on week toggle. Direction is passed via
// AnimatePresence's `custom` so the latest value drives both the exiting and
// entering child.
export function PlannerWeekBoard({
  currentWeekKey,
  currentWeekStart,
  today,
  viewingNextWeek,
  todayColumnDay,
  activeDayName,
  scrollerRef,
  dayGroups,
  allOrdersById,
  dailyCapacitySquares,
  dailyGreenThresholdSquares,
  autoPlanDays,
  onToggleAutoPlanDay,
  onTogglePin,
  recentlyPlacedIds,
  onContextMenu,
}: PlannerWeekBoardProps) {
  return (
    <div className="flex-1 p-3 md:p-6 overflow-hidden relative">
      <AnimatePresence
        initial={false}
        mode="wait"
        custom={viewingNextWeek ? 1 : -1}
      >
        <motion.div
          key={currentWeekKey}
          custom={viewingNextWeek ? 1 : -1}
          variants={WEEK_SLIDE_VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          className="flex gap-4 h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory md:snap-none md:min-w-[1000px] pb-20 md:pb-0"
          ref={scrollerRef}
        >
          {DAYS.map((day) => {
            const date = addDays(
              currentWeekStart,
              DAY_OFFSET_FROM_WEEK_START[day]
            );
            const isToday =
              !viewingNextWeek && day === todayColumnDay;
            const isPastDay = date.getTime() < today.getTime();

            return (
              <div
                key={day}
                data-today-column={isToday ? "true" : undefined}
                data-day-column={day}
                className="shrink-0 w-[70vw] h-full snap-center md:w-auto md:flex-1 md:snap-align-none min-w-[150px] md:min-w-[200px]"
              >
                <DroppableDayColumn
                  day={day}
                  dateLabel={format(date, "MMM d")}
                  orders={dayGroups[day].orders}
                  ordersById={allOrdersById}
                  totalSquares={dayGroups[day].totalSquares}
                  gluedSquares={dayGroups[day].gluedSquares}
                  capacity={dailyCapacitySquares}
                  greenThreshold={dailyGreenThresholdSquares}
                  onTogglePin={onTogglePin}
                  date={date}
                  autoPlanEnabled={autoPlanDays[day]}
                  onToggleAutoPlan={() => onToggleAutoPlanDay(day)}
                  recentlyPlacedIds={recentlyPlacedIds}
                  onContextMenu={onContextMenu}
                  isToday={isToday}
                  isPastDay={isPastDay}
                  isActiveColumn={activeDayName === day}
                />
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
