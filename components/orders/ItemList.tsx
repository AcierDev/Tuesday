"use client";
import { memo } from "react";
import { ItemStatus, type Group, type Item, DayName, ColumnTitles } from "@/typings/types";
import { ItemGroupSection } from "./ItemGroup";

interface ItemListProps {
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
}

export const ItemList = memo(function ItemList({
  groups,
  onStatusChange,
  onDelete,
  onGetLabel,
  onMarkCompleted,
  onShip,
  doneItems,
  clickToAddTarget,
  onItemClick,
  sortColumn,
  sortDirection,
  onSort,
}: ItemListProps) {
  const doneGroup: Group = {
    id: "done-group",
    title: ItemStatus.Done,
    items: doneItems,
  };

  return (
    <div className="flex-grow">
      {groups
        .filter((group) => group.title !== ItemStatus.Done)
        .map((group) => (
          <div key={group.id} className="min-h-[50px]">
            <ItemGroupSection
              key={group.id}
              group={group}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              onGetLabel={onGetLabel}
              onMarkCompleted={onMarkCompleted}
              onShip={onShip}
              isCollapsible={true}
              defaultCollapsed={
                group.title === ItemStatus.Hidden ||
                group.title === ItemStatus.New
              }
              clickToAddTarget={clickToAddTarget}
              onItemClick={onItemClick}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
            />
          </div>
        ))}
      <div key="done-section" className="min-h-[50px]">
        <ItemGroupSection
          group={doneGroup}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onGetLabel={onGetLabel}
          onMarkCompleted={onMarkCompleted}
          onShip={onShip}
          isCollapsible={true}
          defaultCollapsed={true}
          clickToAddTarget={clickToAddTarget}
          onItemClick={onItemClick}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </div>
    </div>
  );
});
