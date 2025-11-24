"use client";

import { compareAsc, compareDesc, parseISO } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { itemSortFuncs } from "@/utils/itemSortFuncs";

import { useOrderSettings } from "../../contexts/OrderSettingsContext";
import {
  type Board,
  ColumnTitles,
  ColumnTypes,
  type Group,
  type Item,
} from "../../typings/types";
import { cn, isPastDue } from "../../utils/functions";
import { CustomTableCell } from "../cells/CustomTableCell";
import { useOrderStore } from "@/stores/useOrderStore";
import { useUser } from "@/contexts/UserContext";

interface ItemGroupPreviewProps {
  group: Group;
  board: Board;
}

export const ItemGroupPreview = ({ group, board }: ItemGroupPreviewProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sortColumn, setSortColumn] = useState<ColumnTitles | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [orderedItems, setOrderedItems] = useState<Item[]>(group.items);
  const orderSettingsContext = useOrderSettings();
  const settings = orderSettingsContext.settings || {};
  const { updateItem } = useOrderStore();
  const { user } = useUser();

  useEffect(() => {
    setOrderedItems(group.items);
  }, [group.items]);

  const handleSort = useCallback(
    (column: ColumnTitles) => {
      if (sortColumn === column) {
        if (sortDirection === "asc") {
          setSortDirection("desc");
        } else if (sortDirection === "desc") {
          setSortDirection(null);
          setSortColumn(null);
        } else {
          setSortDirection("asc");
        }
      } else {
        setSortColumn(column);
        setSortDirection("asc");
      }
    },
    [sortColumn, sortDirection]
  );

  const visibleColumns = Object.entries(
    settings.columnVisibility[group.title] || {}
  )
    .filter(([_, isVisible]) => isVisible)
    .map(([columnName]) => columnName as ColumnTitles);

  const sortedItems = useMemo(() => {
    if (sortColumn && sortDirection && itemSortFuncs[sortColumn]) {
      return itemSortFuncs[sortColumn](orderedItems, sortDirection === "asc");
    }
    return orderedItems;
  }, [orderedItems, sortColumn, sortDirection]);

  const handleItemUpdate = useCallback(
    async (updatedItem: Item, changedField: ColumnTitles) => {
      await updateItem(updatedItem, changedField, user || undefined);
      setOrderedItems((prevItems) =>
        prevItems.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        )
      );
    },
    [updateItem, user]
  );

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderContent = () => (
    <>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-100 dark:bg-gray-800">
            {visibleColumns.map((columnName) => (
              <TableHead
                key={columnName}
                className={cn(
                  "border border-gray-200 dark:border-gray-700 p-2 text-center",
                  columnName === ColumnTitles.Customer_Name ? "w-1/3" : ""
                )}
              >
                <Button
                  className="h-8 flex items-center justify-between w-full"
                  variant="ghost"
                  onClick={() => handleSort(columnName)}
                >
                  {columnName}
                  {settings.showSortingIcons ? (
                    sortColumn === columnName ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                      ) : sortDirection === "desc" ? (
                        <ArrowDown className="ml-2 h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    )
                  ) : null}
                </Button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedItems.map((item, index) => (
            <TableRow
              key={item.id}
              className={cn(
                index % 2 === 0
                  ? "bg-white dark:bg-gray-900"
                  : "bg-gray-50 dark:bg-gray-800",
                isPastDue(item) && "relative"
              )}
            >
              {/* NOTE: item.values is deprecated. This component needs refactoring to use flat item structure. */}
              {(item as any).values
                ?.filter((value: any) =>
                  visibleColumns.includes(value.columnName as ColumnTitles)
                )
                .map((columnValue: any, cellIndex: number) => (
                  <TableCell
                    key={`${item.id}-${columnValue.columnName}`}
                    className={cn(
                      "border border-gray-200 dark:border-gray-700 p-2",
                      cellIndex === 0 ? "w-1/3" : "",
                      getStatusColor(columnValue)
                    )}
                  >
                    <CustomTableCell
                      columnValue={columnValue}
                      isNameColumn={
                        columnValue.columnName === ColumnTitles.Customer_Name
                      }
                      item={item}
                    />
                  </TableCell>
                ))}
              {isPastDue(item) && (
                <>
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  <div className="absolute inset-x-0 bottom-0 h-[2px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );

  return (
    <Collapsible
      className={cn(
        "mb-6 bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden",
        isFullscreen && "fixed inset-0 z-50"
      )}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <CollapsibleTrigger asChild>
        <Button
          className="w-full justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
          variant="ghost"
        >
          <span className="font-semibold text-lg">{group.title}</span>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="mr-2"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(isFullscreen && "h-full overflow-auto p-4")}
      >
        {renderContent()}
      </CollapsibleContent>
    </Collapsible>
  );
};

function getStatusColor(columnValue: {
  columnName: string;
  type: ColumnTypes;
  text?: string;
}): string {
  if (columnValue.type === ColumnTypes.Dropdown) {
    switch (columnValue.text?.toLowerCase()) {
      case "done":
        return "bg-green-200 dark:bg-green-800";
      case "working on it":
        return "bg-yellow-100 dark:bg-yellow-800";
      case "stuck":
        return "bg-red-200 dark:bg-red-800";
      default:
        return "";
    }
  }
  return "";
}
