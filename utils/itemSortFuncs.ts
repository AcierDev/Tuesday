import { ColumnTitles, ItemSortFuncs } from "@/typings/types";
import { compareAsc, compareDesc, isValid, parseISO } from "date-fns";

export const itemSortFuncs: ItemSortFuncs = {
  [ColumnTitles.Customer_Name]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aName =
        a.values.find((v) => v.columnName === ColumnTitles.Customer_Name)
          ?.text || "";
      const bName =
        b.values.find((v) => v.columnName === ColumnTitles.Customer_Name)
          ?.text || "";
      return ascending
        ? aName.localeCompare(bName)
        : bName.localeCompare(aName);
    }),
  [ColumnTitles.Design]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aDesign =
        a.values.find((v) => v.columnName === ColumnTitles.Design)?.text || "";
      const bDesign =
        b.values.find((v) => v.columnName === ColumnTitles.Design)?.text || "";
      return ascending
        ? aDesign.localeCompare(bDesign)
        : bDesign.localeCompare(aDesign);
    }),
  [ColumnTitles.Size]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aSize =
        a.values.find((v) => v.columnName === ColumnTitles.Size)?.text || "";
      const bSize =
        b.values.find((v) => v.columnName === ColumnTitles.Size)?.text || "";
      return ascending
        ? aSize.localeCompare(bSize)
        : bSize.localeCompare(aSize);
    }),
  [ColumnTitles.Painted]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aStatus =
        a.values.find((v) => v.columnName === ColumnTitles.Painted)?.text || "";
      const bStatus =
        b.values.find((v) => v.columnName === ColumnTitles.Painted)?.text || "";
      return ascending
        ? aStatus.localeCompare(bStatus)
        : bStatus.localeCompare(aStatus);
    }),
  [ColumnTitles.Backboard]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aStatus =
        a.values.find((v) => v.columnName === ColumnTitles.Backboard)?.text ||
        "";
      const bStatus =
        b.values.find((v) => v.columnName === ColumnTitles.Backboard)?.text ||
        "";
      return ascending
        ? aStatus.localeCompare(bStatus)
        : bStatus.localeCompare(aStatus);
    }),
  [ColumnTitles.Glued]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aStatus =
        a.values.find((v) => v.columnName === ColumnTitles.Glued)?.text || "";
      const bStatus =
        b.values.find((v) => v.columnName === ColumnTitles.Glued)?.text || "";
      return ascending
        ? aStatus.localeCompare(bStatus)
        : bStatus.localeCompare(aStatus);
    }),
  [ColumnTitles.Packaging]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aStatus =
        a.values.find((v) => v.columnName === ColumnTitles.Packaging)?.text ||
        "";
      const bStatus =
        b.values.find((v) => v.columnName === ColumnTitles.Packaging)?.text ||
        "";
      return ascending
        ? aStatus.localeCompare(bStatus)
        : bStatus.localeCompare(aStatus);
    }),
  [ColumnTitles.Boxes]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aStatus =
        a.values.find((v) => v.columnName === ColumnTitles.Boxes)?.text || "";
      const bStatus =
        b.values.find((v) => v.columnName === ColumnTitles.Boxes)?.text || "";
      return ascending
        ? aStatus.localeCompare(bStatus)
        : bStatus.localeCompare(aStatus);
    }),
  [ColumnTitles.Notes]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aNotes =
        a.values.find((v) => v.columnName === ColumnTitles.Notes)?.text || "";
      const bNotes =
        b.values.find((v) => v.columnName === ColumnTitles.Notes)?.text || "";
      return ascending
        ? aNotes.localeCompare(bNotes)
        : bNotes.localeCompare(aNotes);
    }),
  [ColumnTitles.Rating]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aRating = Number(
        a.values.find((v) => v.columnName === ColumnTitles.Rating)?.text || "0"
      );
      const bRating = Number(
        b.values.find((v) => v.columnName === ColumnTitles.Rating)?.text || "0"
      );
      return ascending ? aRating - bRating : bRating - aRating;
    }),
  [ColumnTitles.Due]: (items, ascending) =>
    [...items].sort((a, b) => {
      const aDateString =
        a.values.find((v) => v.columnName === ColumnTitles.Due)?.text || "";
      const bDateString =
        b.values.find((v) => v.columnName === ColumnTitles.Due)?.text || "";

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
