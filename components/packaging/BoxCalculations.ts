// BoxCalculations.ts
import { format } from "date-fns";
import { ColumnTitles, Item, ItemSizes } from '@/typings/types';
import { BoxRequirement, DaySchedule, HardwareBagRequirement, MountingRailRequirement } from '@/typings/interfaces';
import { BOX_COLORS } from '@/utils/constants';

type BoxCalculationsProps = {
  schedule: DaySchedule;
  items: Item[];
  selectedDates: Date[];
  lockedBoxes: Record<string, number>;
  lockedHardwareBags: Record<string, number>;
  lockedMountingRails: Record<string, number>;
};

export function BoxCalculations({ 
  schedule, 
  items, 
  selectedDates, 
  lockedBoxes, 
  lockedHardwareBags, 
  lockedMountingRails 
}: BoxCalculationsProps) {
  const boxReq: BoxRequirement = {
    'Orange': 0,
    'Pink': 0,
    'Green': 0,
    'Green Plus': 0,
    'Blue': 0,
    'Purple': 0,
    'Custom': 0,
  };
  const hardwareReq: HardwareBagRequirement = {};
  const railReq: MountingRailRequirement = {};

  selectedDates.forEach(date => {
    const selectedDay = format(date, 'EEEE');
    const dayItems = (schedule[selectedDay] || [])
      .map(id => items.find(item => item.id === id))
      .filter(Boolean) as Item[];

    dayItems.forEach(item => {
      const size = item.values.find(v => v.columnName === ColumnTitles.Size)?.text as ItemSizes;
      if (size && BOX_COLORS[size]) {
        const { color, count, hardwareBag, mountingRail } = BOX_COLORS[size];
        if (color === 'Blue and Green') {
          boxReq.Blue += 1;
          boxReq.Green += 1;
        } else if (color === 'Purple and Custom') {
          boxReq.Purple += 2;
          boxReq.Custom += 1;
        } else {
          boxReq[color] += count;
        }
        hardwareReq[hardwareBag] = (hardwareReq[hardwareBag] || 0) + 1;
        
        if (size === ItemSizes.ThirtySix_By_Fifteen) {
          railReq['48"'] = (railReq['48"'] || 0) + 2;
        } else {
          railReq[mountingRail] = (railReq[mountingRail] || 0) + 1;
        }
      }
    });
  });

  // Subtract locked items from the requirements
  Object.entries(lockedBoxes).forEach(([color, count]) => {
    if (boxReq[color]) {
      boxReq[color] = Math.max(0, boxReq[color] - count);
    }
  });

  Object.entries(lockedHardwareBags).forEach(([bagType, count]) => {
    if (hardwareReq[bagType]) {
      hardwareReq[bagType] = Math.max(0, hardwareReq[bagType] - count);
    }
  });

  Object.entries(lockedMountingRails).forEach(([railType, count]) => {
    if (railReq[railType]) {
      railReq[railType] = Math.max(0, railReq[railType] - count);
    }
  });

  return { boxRequirements: boxReq, hardwareBagRequirements: hardwareReq, mountingRailRequirements: railReq };
}
