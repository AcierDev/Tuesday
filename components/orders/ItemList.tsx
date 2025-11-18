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
}

export const ItemList = memo(function ItemList({
  groups,
  onStatusChange,
  onDelete,
  onGetLabel,
  onMarkCompleted,
  onShip,
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

  return (
      <div className="flex-grow">
        {groups
          .filter((group) =>
          (isAdmin ? true : group.title !== ItemStatus.Hidden)
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
                      group.title === ItemStatus.Done ||
                      group.title === ItemStatus.Hidden
                    }
                  />
                </div>
          ))}
      </div>
  );
});
