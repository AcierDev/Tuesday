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
import { ColumnTitles, ColumnTypes, ColumnValue, Item } from "@/typings/types";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";
import React, { useEffect } from "react";
import { ShippingCell } from "./ShippingCell";
import { useOrderStore } from "@/stores/useOrderStore";

export const CustomTableCell = ({
  item,
  columnValue,
  isNameColumn = false,
  disableCredit = false,
}: {
  item: Item;
  columnValue: ColumnValue;
  isNameColumn?: boolean;
  disableCredit?: boolean;
}) => {
  const { settings } = useOrderSettings();
  const [showNotification, setShowNotification] = React.useState<
    boolean | null
  >(null);

  const { checkDuplicate } = useOrderStore();

  useEffect(() => {
    const checkModification = () => {
      const isModified = isRecentlyModified(
        columnValue.lastModifiedTimestamp ?? 0,
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
      case ColumnTypes.Shipping:
        return <ShippingCell item={item} />;
      case ColumnTypes.Dropdown:
        if (columnValue.columnName === ColumnTitles.Design) {
          return (
            <DesignDropdownCell
              item={item}
              columnValue={columnValue}
            />
          );
        }
        return (
          <DropdownCell
            item={item}
            columnValue={columnValue}
            disableCredit={disableCredit}
          />
        );
      case ColumnTypes.Date:
        return (
          <DateCell
            item={item}
            columnValue={columnValue}
          />
        );
      case ColumnTypes.Number:
        return (
          <NumberCell
            item={item}
            columnValue={columnValue}
          />
        );
      case ColumnTypes.Text:
        if (columnValue.columnName === ColumnTitles.Labels) {
          return <LabelCell item={item} />;
        }
        if (columnValue.columnName === "Notes") {
          return (
            <NotesCell
              item={item}
              columnValue={columnValue}
            />
          );
        }
        if (isNameColumn) {
          const isDuplicate = checkDuplicate(item);

          return (
            <NameCell
              item={item}
              columnValue={columnValue as any} // Casting as NameCell expects specific shape but Compatible
              tags={{
                isDuplicate: isDuplicate,
                isDifficultCustomer: item.tags?.isDifficultCustomer || false,
                isVertical: item.tags?.isVertical || false,
                hasCustomerMessage: item.tags?.hasCustomerMessage || false,
              }}
            />
          );
        }
        return (
          <TextCell
            item={item}
            columnValue={columnValue}
          />
        );
      default:
        return (
          <TextCell
            item={item}
            columnValue={columnValue}
          />
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
