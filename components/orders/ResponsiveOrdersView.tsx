import React, { useState, useEffect } from "react";
import MobileOrderView from "./mobile/MobileOrderView";
import { ItemList } from "./ItemList";
import { Group, Item } from "@/typings/types";
import { DropResult, ResponderProvided } from "@hello-pangea/dnd";

interface ResponsiveOrdersViewProps {
  groups: Group[];
  onDragEnd: (result: DropResult, provided: ResponderProvided) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onGetLabel: (item: Item) => void;
  onMarkCompleted: (itemId: string) => Promise<void>;
  onShip: (itemId: string) => Promise<void>;
}

export const ResponsiveOrdersView: React.FC<ResponsiveOrdersViewProps> = ({
  groups,
  onDragEnd,
  onDelete,
  onGetLabel,
  onMarkCompleted,
  onShip,
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
          onDelete={onDelete}
          onGetLabel={onGetLabel}
          onMarkCompleted={onMarkCompleted}
          onShip={onShip}
        />
      ) : (
        <ItemList
          groups={groups}
          onDragEnd={onDragEnd}
          onDelete={onDelete}
          onGetLabel={onGetLabel}
          onMarkCompleted={onMarkCompleted}
          onShip={onShip}
        />
      )}
    </div>
  );
};

export default ResponsiveOrdersView;
