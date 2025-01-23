"use client";

import { useEffect, useState } from "react";
import {
  DragDropContext,
  type DropResult,
  Droppable,
  type ResponderProvided,
} from "@hello-pangea/dnd";
import { ItemStatus, type Group, type Item } from "@/typings/types";
import { ItemGroupSection } from "./ItemGroup";
import { useUser } from "@/contexts/UserContext";
import { getUserPermissions } from "@/app/actions/auth";

interface ItemListProps {
  groups: Group[];
  onDragEnd: (result: DropResult, provided: ResponderProvided) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onGetLabel: (item: Item) => void;
  onMarkCompleted: (itemId: string) => Promise<void>;
  onShip: (itemId: string) => Promise<void>;
}

export const ItemList: React.FC<ItemListProps> = ({
  groups,
  onDragEnd,
  onDelete,
  onGetLabel,
  onMarkCompleted,
  onShip,
}) => {
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

  const handleDragEnd = (result: DropResult, provided: ResponderProvided) => {
    console.log("ItemList: Drag ended with result:", result);
    onDragEnd(result, provided);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex-grow">
        {groups
          .filter((group) =>
            isAdmin ? true : group.title !== ItemStatus.Hidden
          )
          .map((group) => (
            <Droppable droppableId={group.title} key={`droppable-${group.id}`}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="min-h-[50px]"
                >
                  <ItemGroupSection
                    key={group.id}
                    group={group}
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
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
      </div>
    </DragDropContext>
  );
};
