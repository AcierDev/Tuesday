"use client";
import { memo } from "react";
import { ItemStatus, type Group, type Item, DayName, ColumnTitles } from "@/typings/types";
import { ItemGroupSection } from "./ItemGroup";

interface ItemListProps {
  groups: Group[];
  onStatusChange: (itemId: string, newStatus: ItemStatus) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onGetLabel: (item: Item) => void;
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

// Type filters that imply the user is hunting for specific incoming work,
// so the New lane should auto-open when these are picked and auto-close
// otherwise.
const NEW_AUTO_EXPAND_TYPES: ReadonlySet<string> = new Set([
  "striped",
  "mini",
  "shepit",
  "custom",
]);

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 STATUS LANE LAYOUT                                                ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// New + Done are full-width. OnDeck lives in the left lane and
// Wip/Packaging/At_The_Door live in the right lane (Wip above Packaging).
const LEFT_LANE_STATUSES: ReadonlySet<string> = new Set<string>([
  ItemStatus.OnDeck,
]);
const RIGHT_LANE_ORDER: ItemStatus[] = [
  ItemStatus.Wip,
  ItemStatus.Packaging,
  ItemStatus.At_The_Door,
];

export const ItemList = memo(function ItemList({
  groups,
  onStatusChange,
  onDelete,
  onGetLabel,
  onShip,
  doneItems,
  clickToAddTarget,
  onItemClick,
  sortColumn,
  sortDirection,
  onSort,
  currentType,
}: ItemListProps) {
  const expandNew = currentType
    ? NEW_AUTO_EXPAND_TYPES.has(currentType)
    : false;
  const doneGroup: Group = {
    id: "done-group",
    title: ItemStatus.Done,
    items: doneItems,
  };

  const newGroup = groups.find((g) => g.title === ItemStatus.New);
  const leftGroups = groups.filter((g) =>
    LEFT_LANE_STATUSES.has(g.title)
  );
  const rightGroups = RIGHT_LANE_ORDER.map((status) =>
    groups.find((g) => g.title === status)
  ).filter((g): g is Group => Boolean(g));

  const renderGroup = (
    group: Group,
    defaultCollapsed: boolean,
    keyOverride?: string
  ) => (
    <div
      key={keyOverride ?? group.id}
      id={`section-${group.title.toLowerCase().replace(/\s+/g, "-")}`}
      className="min-h-[50px] scroll-mt-32"
    >
      <ItemGroupSection
        group={group}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        onGetLabel={onGetLabel}
        onShip={onShip}
        isCollapsible={true}
        defaultCollapsed={defaultCollapsed}
        clickToAddTarget={clickToAddTarget}
        onItemClick={onItemClick}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={onSort}
      />
    </div>
  );

  return (
    <div className="flex-grow">
      {newGroup &&
        renderGroup(
          newGroup,
          !expandNew,
          `${newGroup.id}-${expandNew ? "open" : "closed"}`
        )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <div className="min-w-0">
          {leftGroups.map((g) => renderGroup(g, false))}
        </div>
        <div className="min-w-0">
          {rightGroups.map((g) => renderGroup(g, false))}
        </div>
      </div>
      <div key="done-section" className="min-h-[50px]">
        <ItemGroupSection
          group={doneGroup}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onGetLabel={onGetLabel}
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
