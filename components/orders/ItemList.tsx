"use client";

import { useEffect, useState, memo } from "react";
import { ItemStatus, type Group, type Item } from "@/typings/types";
import { ItemGroupSection } from "./ItemGroup";
import { useUser } from "@/contexts/UserContext";
import { getUserPermissions } from "@/app/actions/auth";

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
}

export const ItemList = memo(function ItemList({
  groups,
  onStatusChange,
  onDelete,
  onGetLabel,
  onMarkCompleted,
  onShip,
  doneItems,
}: ItemListProps) {
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (user) {
        const permissions = await getUserPermissions(user);
        setIsAdmin(permissions.includes("admin"));
      } else {
        setIsAdmin(false);
      }
    };

    fetchPermissions();
  }, [user]);

  const doneGroup: Group = {
    id: "done-group",
    title: ItemStatus.Done,
    items: doneItems,
  };

  return (
    <div className="flex-grow">
      {groups
        .filter((group) =>
          (isAdmin ? true : group.title !== ItemStatus.Hidden) &&
          group.title !== ItemStatus.Done
        )
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
                group.title === ItemStatus.Hidden
              }
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
        />
      </div>
    </div>
  );
});
