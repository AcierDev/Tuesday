import React from "react";
import { ItemList } from "./ItemList";
import { Group, Item, ItemStatus, DayName, ColumnTitles } from "@/typings/types";

interface ResponsiveOrdersViewProps {
  groups: Group[];
  onStatusChange: (itemId: string, newStatus: ItemStatus) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onGetLabel: (item: Item) => void;
  onMarkCompleted: (itemId: string) => Promise<void>;
  onShip: (itemId: string) => Promise<void>;
  doneItems: Item[];
  loadDoneItems: (reset?: boolean) => Promise<void>;
  hasMoreDoneItems: boolean;
  isDoneLoading: boolean;
  clickToAddTarget?: { day: DayName; weekKey: string } | null;
  onItemClick?: (item: Item) => Promise<void>;
  sortColumn: ColumnTitles | null;
  sortDirection: "asc" | "desc" | null;
  onSort: (column: ColumnTitles) => void;
  currentType?: string;
}

export const ResponsiveOrdersView: React.FC<ResponsiveOrdersViewProps> = ({
  groups,
  onStatusChange,
  onDelete,
  onGetLabel,
  onMarkCompleted,
  onShip,
  doneItems,
  loadDoneItems,
  hasMoreDoneItems,
  isDoneLoading,
  clickToAddTarget,
  onItemClick,
  sortColumn,
  sortDirection,
  onSort,
  currentType,
}) => {
  return (
    <div className="h-full">
      <ItemList
        groups={groups}
        doneItems={doneItems}
        loadDoneItems={loadDoneItems}
        hasMoreDoneItems={hasMoreDoneItems}
        isDoneLoading={isDoneLoading}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        onGetLabel={onGetLabel}
        onMarkCompleted={onMarkCompleted}
        onShip={onShip}
        clickToAddTarget={clickToAddTarget}
        onItemClick={onItemClick}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={onSort}
        currentType={currentType}
      />
    </div>
  );
};

export default ResponsiveOrdersView;
