import { format } from "date-fns";
import { ColumnTitles, Item, ItemSizes } from '@/typings/types';
import { BoxRequirement } from '@/typings/interfaces';
import { BOX_COLORS } from '@/utils/constants';

export function calculateBoxRequirements(group: { items: Item[] }): Record<string, BoxRequirement> {
  const boxReq: Record<string, BoxRequirement> = {};

  group.items.forEach(item => {
    const size = item.values.find(v => v.columnName === ColumnTitles.Size)?.text as ItemSizes;
    if (size && BOX_COLORS[size]) {
      const { color, count } = BOX_COLORS[size];
      if (!boxReq[color]) {
        boxReq[color] = { count: 0, hardwareBag: BOX_COLORS[size].hardwareBag, mountingRail: BOX_COLORS[size].mountingRail };
      }
      boxReq[color].count += count;
    }
  });

  return boxReq;
}