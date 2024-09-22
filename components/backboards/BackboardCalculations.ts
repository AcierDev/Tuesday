// BackboardCalculations.ts
import { format } from "date-fns";
import { BackboardRequirement, ColumnTitles, Item, ItemSizes } from '@/typings/types';
import { DaySchedule } from "../weekly-schedule/UseWeeklySchedule";
import { backboardData } from "@/utils/constants";

type BackboardCalculationsProps = {
  schedule: DaySchedule;
  items: Item[];
  selectedDates: Date[];
};

export function BackboardCalculations({ 
  schedule, 
  items, 
  selectedDates 
}: BackboardCalculationsProps): BackboardRequirement {
  const requirements: BackboardRequirement = {} as BackboardRequirement;

  selectedDates.forEach(date => {
    const selectedDay = format(date, 'EEEE');
    const dayItems = (schedule[selectedDay] || [])
      .map(id => items.find(item => item.id === id))
      .filter(Boolean) as Item[];

    dayItems.forEach(item => {
      const size = item.values.find(v => v.columnName === ColumnTitles.Size)?.text as ItemSizes;

      if (size && backboardData[size]) {
        requirements[size] = (requirements[size] || 0) + 1;
      }
    });
  });

  return requirements;
}
