import { ColumnTitles } from "@/typings/types";

export const ORDER_ATTENTION_LAYOUT = {
  cellWidthRem: 2.75,
  clusterWidthRem: 2.5,
  clusterHeightRem: 2.25,
  buttonSizeRem: 1.5,
} as const;

const ORDER_COLUMN_LAYOUT: Partial<
  Record<ColumnTitles, { widthPercent: number; attentionSpaceShare: number }>
> = {
  [ColumnTitles.Customer_Name]: { widthPercent: 38, attentionSpaceShare: 0.4 },
  [ColumnTitles.Design]: { widthPercent: 32, attentionSpaceShare: 0.4 },
  [ColumnTitles.Size]: { widthPercent: 22, attentionSpaceShare: 0.2 },
};

// Reclaim the new icon column's width from the existing columns so a narrow
// table does not grow beyond its clipped board container.
export function orderColumnWidth(column: ColumnTitles, hasAttentionColumn: boolean) {
  const layout = ORDER_COLUMN_LAYOUT[column];
  if (!layout) return undefined;
  if (!hasAttentionColumn) return `${layout.widthPercent}%`;
  const reserved = ORDER_ATTENTION_LAYOUT.cellWidthRem * layout.attentionSpaceShare;
  return `calc(${layout.widthPercent}% - ${reserved}rem)`;
}
