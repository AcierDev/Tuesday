import { ColumnTitles } from "@/typings/types";

export const ORDER_ATTENTION_LAYOUT = {
  cellWidthRem: 2.75,
  clusterWidthRem: 2.5,
  clusterHeightRem: 2.25,
  buttonSizeRem: 1.5,
} as const;

export const ORDER_ROW_LAYOUT = {
  cellSpacing: "px-0.5 py-[0.3125rem] sm:px-2 sm:py-[0.46875rem]",
  nameSpacing: "py-[0.3125rem] pr-2 leading-tight",
  namePreview: "w-full line-clamp-2",
} as const;

const ORDER_COLUMN_LAYOUT: Partial<
  Record<ColumnTitles, { widthPercent: number; attentionSpaceShare: number }>
> = {
  [ColumnTitles.Customer_Name]: { widthPercent: 37, attentionSpaceShare: 0.4 },
  [ColumnTitles.Design]: { widthPercent: 25, attentionSpaceShare: 0.3 },
  [ColumnTitles.Size]: { widthPercent: 28, attentionSpaceShare: 0.3 },
};

// Share of the table width handed to the attention icon column when shown.
const ATTENTION_COLUMN_WIDTH_PERCENT = 10;

// Reclaim the new icon column's width from the existing columns so a narrow
// table does not grow beyond its clipped board container. Plain percentages:
// browsers treat calc() widths that mix % and rem on table cells as auto.
export function orderColumnWidth(column: ColumnTitles, hasAttentionColumn: boolean) {
  const layout = ORDER_COLUMN_LAYOUT[column];
  if (!layout) return undefined;
  if (!hasAttentionColumn) return `${layout.widthPercent}%`;
  const reserved = ATTENTION_COLUMN_WIDTH_PERCENT * layout.attentionSpaceShare;
  return `${layout.widthPercent - reserved}%`;
}
