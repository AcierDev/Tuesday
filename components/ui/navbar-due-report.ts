import { parseISO } from "date-fns";

import { useOrderStore } from "@/stores/useOrderStore";
import { ItemSizes, ItemStatus, type Item } from "@/typings/types";
import { laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import { printHtmlDocument } from "@/components/ui/navbar-print";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📅 SIZES-DUE REPORT                                                   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// Rolling-window options (in weeks from the moment the button is clicked) for
// the "how many of each size is due" printout.
export const DUE_REPORT_WEEK_OPTIONS = [1, 2, 3] as const;
// Statuses whose items are already made / packed and shouldn't be counted as
// still-due work.
const DUE_REPORT_EXCLUDED_STATUSES = new Set<ItemStatus>([
  ItemStatus.Done,
  ItemStatus.Packaging,
  ItemStatus.Hidden,
]);
// Only standard catalog sizes count — custom / "ship it" / off-menu sizes are
// ignored entirely.
const STANDARD_SIZES = new Set<string>(Object.values(ItemSizes));

// Area (w × h) of a "W x H" size string, used to order smallest → largest.
const sizeArea = (size: string): number => {
  const match = size.match(/(\d+)\s*x\s*(\d+)/i);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1]) * Number(match[2]);
};
const STANDARD_SIZES_SMALLEST_FIRST = [...STANDARD_SIZES].sort(
  (a, b) => sizeArea(a) - sizeArea(b)
);

// Boxes consumed per order, by size. Everything ships in one box except
// 24 x 12 and larger, which take two boxes per order.
const DOUBLE_BOX_MIN_SIZE: string = ItemSizes.TwentyFour_By_Twelve;
const DOUBLE_BOX_MIN_AREA = sizeArea(DOUBLE_BOX_MIN_SIZE);
const boxesPerOrder = (size: string): number =>
  sizeArea(size) >= DOUBLE_BOX_MIN_AREA ? 2 : 1;

// The report must always fit on a single printed page. Row text scales down as
// the number of size rows grows so the table never overflows onto a 2nd page.
// Vertical room (px) left for table rows after header/meta/thead/footer chrome.
const REPORT_ROW_AREA_PX = 600;
const REPORT_ROW_FONT_MAX = 40; // biggest size text (few rows)
const REPORT_ROW_FONT_MIN = 16; // smallest legible size text (all 12 rows)
const REPORT_ROW_HEIGHT_FACTOR = 1.8; // row height as a multiple of font size

// Largest size-text font (px) that still fits `rowCount` rows on one page.
const fitRowFont = (rowCount: number): number =>
  Math.max(
    REPORT_ROW_FONT_MIN,
    Math.min(
      REPORT_ROW_FONT_MAX,
      Math.floor(REPORT_ROW_AREA_PX / rowCount / REPORT_ROW_HEIGHT_FACTOR)
    )
  );

// Count active items, grouped by standard size, whose due date falls within the
// next `weeks` weeks (today → today + N weeks). Returns smallest → largest,
// nonzero rows only.
const DAYS_PER_WEEK = 7;
const DUE_DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Last calendar day (LA) covered by an N-week due report.
const dueReportEndKey = (weeks: number, todayKey: string = laDayKey()) =>
  shiftDayKey(todayKey, weeks * DAYS_PER_WEEK);

const computeDueBySize = (
  items: Item[],
  weeks: number
): { size: string; count: number }[] => {
  // Compare LA calendar-day keys: new Date("YYYY-MM-DD") is UTC midnight,
  // which lands on the previous day in LA.
  const startKey = laDayKey();
  const endKey = dueReportEndKey(weeks, startKey);
  const counts = new Map<string, number>();

  for (const item of items) {
    if (item.deleted || item.visible === false) continue;
    if (DUE_REPORT_EXCLUDED_STATUSES.has(item.status)) continue;
    if (!item.size || !STANDARD_SIZES.has(item.size)) continue;
    const dueKey = item.dueDate?.slice(0, "YYYY-MM-DD".length);
    if (!dueKey || !DUE_DAY_KEY_PATTERN.test(dueKey)) continue;
    if (dueKey < startKey || dueKey > endKey) continue;
    counts.set(item.size, (counts.get(item.size) ?? 0) + 1);
  }

  return STANDARD_SIZES_SMALLEST_FIRST.filter((size) => counts.has(size)).map(
    (size) => ({ size, count: counts.get(size) as number })
  );
};

export const printDueReport = (weeks: number) => {
  const rows = computeDueBySize(useOrderStore.getState().items, weeks);
  const generatedOn = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const weekLabel = `${weeks} Week${weeks > 1 ? "s" : ""}`;
  const dueByLabel = parseISO(dueReportEndKey(weeks)).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric" }
  );

  // 24 x 12 and larger art pieces need two boxes each, so their box count is
  // double the order count.
  const boxRows = rows.map((row) => ({
    size: row.size,
    boxes: row.count * boxesPerOrder(row.size),
  }));
  const totalBoxes = boxRows.reduce((sum, row) => sum + row.boxes, 0);

  // Scale row text to the number of rows so it always fits on one page.
  const rowFont = fitRowFont(Math.max(boxRows.length, 1));
  const qtyFont = Math.round(rowFont * 1.1);
  const rowPad = Math.round(rowFont * 0.4);

  const body = boxRows.length
    ? boxRows
        .map(
          (row) => `
            <tr>
              <td class="size">${row.size}</td>
              <td class="qty">${row.boxes}</td>
            </tr>`
        )
        .join("")
    : `<tr><td class="empty" colspan="2">Nothing due in this window</td></tr>`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Boxes Due — Next ${weekLabel}</title>
        <style>
          @page { size: letter; margin: 0.6in; }
          * { box-sizing: border-box; }
          html, body {
            margin: 0; padding: 0;
            font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #000;
            font-size: 18px; line-height: 1.3;
          }
          .header { border-bottom: 4px solid #000; padding-bottom: 14px; }
          .header-top {
            display: flex; justify-content: space-between; align-items: baseline;
            gap: 12px;
          }
          .brand { font-size: 18px; letter-spacing: 0.22em; text-transform: uppercase;
                   font-weight: 800; margin: 0; }
          .window { font-size: 20px; font-weight: 700; text-align: right; }
          .title { font-size: 46px; font-weight: 800; margin: 8px 0 0; }
          .meta { font-size: 18px; font-weight: 600; color: #000; margin: 12px 0 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          thead th {
            text-align: left; font-size: 20px; text-transform: uppercase;
            letter-spacing: 0.06em; font-weight: 800;
            padding: 10px 10px; border-bottom: 3px solid #000;
          }
          thead th.qty { text-align: right; }
          tbody td { padding: ${rowPad}px 10px; border-bottom: 2px solid #999;
                     vertical-align: baseline; }
          td.size { font-size: ${rowFont}px; font-weight: 800; white-space: nowrap; }
          td.qty { text-align: right; font-size: ${qtyFont}px; font-weight: 800;
                   font-variant-numeric: tabular-nums; white-space: nowrap; width: 1%; }
          td.empty { text-align: center; font-size: 28px; color: #000; padding: 40px 0; }
          tfoot td { border-top: 4px solid #000; padding: 18px 10px 0;
                     font-size: 26px; font-weight: 800; text-transform: uppercase;
                     letter-spacing: 0.03em; }
          tfoot td.qty { text-align: right; font-size: ${qtyFont}px; text-transform: none;
                         letter-spacing: 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-top">
            <p class="brand">Everwood</p>
            <div class="window">Next ${weekLabel} · through ${dueByLabel}</div>
          </div>
          <h1 class="title">Boxes Due</h1>
        </div>
        <p class="meta">Generated ${generatedOn}</p>
        <table>
          <thead>
            <tr><th>Size</th><th class="qty">Boxes</th></tr>
          </thead>
          <tbody>${body}</tbody>
          ${
            boxRows.length
              ? `<tfoot><tr><td>Total Boxes</td><td class="qty">${totalBoxes}</td></tr></tfoot>`
              : ""
          }
        </table>
      </body>
    </html>
  `;

  printHtmlDocument(html);
};
