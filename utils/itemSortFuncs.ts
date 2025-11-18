import { ColumnTitles, ItemSortFuncs } from "@/typings/types";
import { compareAsc, compareDesc, isValid, parseISO } from "date-fns";

export const itemSortFuncs: ItemSortFuncs = {
  [ColumnTitles.Customer_Name]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aName = a.customerName || "";
      const bName = b.customerName || "";
      return ascending
        ? aName.localeCompare(bName)
        : bName.localeCompare(aName);
    }),
  [ColumnTitles.Design]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aDesign = a.design || "";
      const bDesign = b.design || "";
      return ascending
        ? aDesign.localeCompare(bDesign)
        : bDesign.localeCompare(aDesign);
    }),
  [ColumnTitles.Size]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aSize = a.size || "";
      const bSize = b.size || "";
      return ascending
        ? aSize.localeCompare(bSize)
        : bSize.localeCompare(aSize);
    }),
  [ColumnTitles.Painted]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aStatus = a.painted || "";
      const bStatus = b.painted || "";
      return ascending
        ? aStatus.localeCompare(bStatus)
        : bStatus.localeCompare(aStatus);
    }),
  [ColumnTitles.Backboard]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aStatus = a.backboard || "";
      const bStatus = b.backboard || "";
      return ascending
        ? aStatus.localeCompare(bStatus)
        : bStatus.localeCompare(aStatus);
    }),
  [ColumnTitles.Glued]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aStatus = a.glued || "";
      const bStatus = b.glued || "";
      return ascending
        ? aStatus.localeCompare(bStatus)
        : bStatus.localeCompare(aStatus);
    }),
  [ColumnTitles.Packaging]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aStatus = a.packaging || "";
      const bStatus = b.packaging || "";
      return ascending
        ? aStatus.localeCompare(bStatus)
        : bStatus.localeCompare(aStatus);
    }),
  [ColumnTitles.Boxes]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aStatus = a.boxes || "";
      const bStatus = b.boxes || "";
      return ascending
        ? aStatus.localeCompare(bStatus)
        : bStatus.localeCompare(aStatus);
    }),
  [ColumnTitles.Notes]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aNotes = a.notes || "";
      const bNotes = b.notes || "";
      return ascending
        ? aNotes.localeCompare(bNotes)
        : bNotes.localeCompare(aNotes);
    }),
  [ColumnTitles.Rating]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aRating = Number(a.rating || "0");
      const bRating = Number(b.rating || "0");
      return ascending ? aRating - bRating : bRating - aRating;
    }),
  [ColumnTitles.Due]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aDateString = a.dueDate || "";
      const bDateString = b.dueDate || "";

      // Try parsing as ISO string first, fallback to ms
      const aDate = (() => {
        if (!aDateString) return new Date(0);
        const isoDate = parseISO(aDateString);
        return isValid(isoDate) ? isoDate : new Date(Number(aDateString));
      })();

      const bDate = (() => {
        if (!bDateString) return new Date(0);
        const isoDate = parseISO(bDateString);
        return isValid(isoDate) ? isoDate : new Date(Number(bDateString));
      })();

      return ascending ? compareAsc(aDate, bDate) : compareDesc(aDate, bDate);
    }),
};
