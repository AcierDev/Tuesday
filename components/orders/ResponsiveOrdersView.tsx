import React, { useState, useEffect } from "react";
import MobileOrderView from "./mobile/MobileOrderView";
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
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if we're on the client side
    if (typeof window !== "undefined") {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768);
      };

      // Initial check
      checkMobile();

      // Set up the resize listener
      window.addEventListener("resize", checkMobile);

      // Clean up
      return () => {
        window.removeEventListener("resize", checkMobile);
      };
    }
  }, []);

  return (
    <div className="h-full">
      {isMobile ? (
        <MobileOrderView
          items={groups.flatMap((group) => group.items)}
          doneItems={doneItems}
          loadDoneItems={loadDoneItems}
          hasMoreDoneItems={hasMoreDoneItems}
          isDoneLoading={isDoneLoading}
          onDelete={onDelete}
          onGetLabel={onGetLabel}
          onMarkCompleted={onMarkCompleted}
          onShip={onShip}
          clickToAddTarget={clickToAddTarget}
          onItemClick={onItemClick}
        />
      ) : (
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
        />
      )}
    </div>
  );
};

export default ResponsiveOrdersView;
