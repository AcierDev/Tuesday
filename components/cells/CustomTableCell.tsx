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
import {
  Board,
  ColumnTitles,
  ColumnTypes,
  ColumnValue,
  Item,
} from "@/typings/types";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";
import React, { useEffect } from "react";

export const CustomTableCell = ({
  item,
  columnValue,
  board,
  onUpdate,
  isNameColumn = false,
}: {
  item: Item;
  columnValue: ColumnValue;
  board: Board;
  onUpdate: (updatedItem: Item, changedField: ColumnTitles) => Promise<void>;
  isNameColumn?: boolean;
}) => {
  const { settings } = useOrderSettings();
  const [showNotification, setShowNotification] = React.useState<
    boolean | null
  >(null);

  useEffect(() => {
    const checkModification = () => {
      const isModified = isRecentlyModified(
        columnValue.lastModifiedTimestamp,
        settings.recentEditHours!
      );
      setShowNotification(isModified);
    };

    checkModification();
  }, [columnValue.lastModifiedTimestamp, settings.recentEditHours]);

  const isRecentlyModified = (
    lastModifiedTimestamp: number,
    recentEditsHours: number
  ) => {
    const now = Date.now();
    return (
      Math.abs(now - lastModifiedTimestamp) <= recentEditsHours * 60 * 60 * 1000
    );
  };

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
          <DateCell item={item} columnValue={columnValue} onUpdate={onUpdate} />
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
          return <LabelCell item={item} columnValue={columnValue} />;
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
              onAddTag={() => {}}
              onRemoveTag={() => {}}
              initialTags={[]}
            />
          );
        }
        return (
          <TextCell item={item} columnValue={columnValue} onUpdate={onUpdate} />
        );
      default:
        return (
          <TextCell item={item} columnValue={columnValue} onUpdate={onUpdate} />
        );
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {cellContent()}
      {showNotification && <NotificationCircle />}
    </div>
  );
};
