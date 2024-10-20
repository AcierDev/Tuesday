// CustomTableCell.jsx

import { NotificationCircle } from "./NotificationCircle";
import { DesignDropdownCell } from "./DesignDropdownCell";
import { DropdownCell } from "./DropdownCell";
import { DateCell } from "./DateCell";
import { NumberCell } from "./NumberCell";
import { LabelCell } from "./LabelCell";
import { NotesCell } from "./NotesCell";
import { NameCell } from "./NameCell";
import { TextCell } from "./TextCell";
import { ColumnTitles, ColumnTypes } from "@/typings/types";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";
import { differenceInHours } from "date-fns";

// ...other imports

export const CustomTableCell = (
  { item, columnValue, board, onUpdate, isNameColumn = false },
) => {
  const { settings } = useOrderSettings();

  const cellContent = () => {
    switch (columnValue.type) {
      case ColumnTypes.Dropdown:
        if (columnValue.columnName === ColumnTitles.Design) {
          return (
            <DesignDropdownCell
              item={item}
              columnValue={columnValue}
              onUpdate={onUpdate}
              board={board}
            />
          );
        }
        return (
          <DropdownCell
            item={item}
            columnValue={columnValue}
            onUpdate={onUpdate}
            board={board}
          />
        );
      case ColumnTypes.Date:
        return (
          <DateCell
            item={item}
            columnValue={columnValue}
            onUpdate={onUpdate}
          />
        );
      case ColumnTypes.Number:
        return (
          <NumberCell
            item={item}
            columnValue={columnValue}
            onUpdate={onUpdate}
          />
        );
      case ColumnTypes.Text:
        if (columnValue.columnName === ColumnTitles.Labels) {
          return (
            <LabelCell
              item={item}
              columnValue={columnValue}
            />
          );
        }
        if (columnValue.columnName === "Notes") {
          return (
            <NotesCell
              item={item}
              columnValue={columnValue}
              onUpdate={onUpdate}
            />
          );
        }
        if (isNameColumn) {
          return (
            <NameCell
              item={item}
              columnValue={columnValue}
              onUpdate={onUpdate}
            />
          );
        }
        return (
          <TextCell
            item={item}
            columnValue={columnValue}
            onUpdate={onUpdate}
          />
        );
      default:
        return (
          <TextCell
            item={item}
            columnValue={columnValue}
            onUpdate={onUpdate}
          />
        );
    }
  };

  const isRecentlyModified = (
    lastModifiedTimestamp: number,
    recentEditsHours: number,
  ) => {
    const now = new Date();
    const lastModified = new Date(lastModifiedTimestamp);
    return differenceInHours(now, lastModified) <= recentEditsHours;
  };

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {cellContent()}
      {isRecentlyModified(
        columnValue.lastModifiedTimestamp,
        settings.recentEditHours!,
      ) && <NotificationCircle />}
    </div>
  );
};
