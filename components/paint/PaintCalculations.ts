import { format } from "date-fns";
import { ColumnTitles, Item, ItemDesigns, ItemSizes } from '@/typings/types';
import { DESIGN_COLORS, SIZE_MULTIPLIERS } from '@/utils/constants';

export type PaintRequirement = Record<string | number, number>;

export function calculatePaintRequirements(
  weeklySchedules: Record<string, Record<string, string[]>>,
  items: Item[],
  currentWeekStart: Date
): Record<string, PaintRequirement> {
  const requirements: Record<string, PaintRequirement> = {}
  const weekKey = format(currentWeekStart, 'yyyy-MM-dd');
  const currentWeekSchedule = weeklySchedules[weekKey] || {};

  Object.entries(currentWeekSchedule).forEach(([day, itemIds]) => {
    const dayItems = itemIds.map(id => items.find(item => item.id === id)).filter(Boolean) as Item[];

    dayItems.forEach(item => {
      const design = item.values.find(v => v.columnName === ColumnTitles.Design)?.text as ItemDesigns;
      const size = item.values.find(v => v.columnName === ColumnTitles.Size)?.text as ItemSizes;

      if (design && size && DESIGN_COLORS[design] && SIZE_MULTIPLIERS[size]) {
        if (!requirements[design]) {
          requirements[design] = {};
        }

        const totalArea = SIZE_MULTIPLIERS[size];
        const colorCount = DESIGN_COLORS[design].length;
        const piecesPerColor = Math.ceil(totalArea / colorCount);

        DESIGN_COLORS[design].forEach(color => {
          if (design === ItemDesigns.Coastal || design === ItemDesigns.Fade_To_Five || 
              (design === ItemDesigns.Lawyer && typeof color === 'number')) {
            requirements[ItemDesigns.Coastal][color] = (requirements[ItemDesigns.Coastal][color] || 0) + piecesPerColor;
          } else if (design === ItemDesigns.Lawyer && typeof color === 'string') {
            requirements[ItemDesigns.Lawyer][color] = (requirements[ItemDesigns.Lawyer][color] || 0) + piecesPerColor;
          } else {
            requirements[design][color] = (requirements[design][color] || 0) + piecesPerColor;
          }
        });
      }
    });
  });

  delete requirements[ItemDesigns.Fade_To_Five];

  if (Object.keys(requirements[ItemDesigns.Lawyer] || {}).length === 0) {
    delete requirements[ItemDesigns.Lawyer];
  }

  return requirements;
}