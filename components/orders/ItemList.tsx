// components/orders/ItemList.tsx
import { DragDropContext, type DropResult, Droppable, type ResponderProvided } from "@hello-pangea/dnd"

import { type Board, type Group, type Item } from "@/typings/types"

import { ItemGroupSection } from "./ItemGroup"

interface ItemListProps {
  board: Board
  groups: Group[]
  onDragEnd: (result: DropResult, provided: ResponderProvided) => void
  onDelete: (itemId: string) => void
  onGetLabel: (item: Item) => void
  onMarkCompleted: (itemId: string) => void
  onShip: (itemId: string) => void
  onUpdate: (updatedItem: Item) => void
}

export const ItemList: React.FC<ItemListProps> = ({
  board,
  groups,
  onDragEnd,
  onDelete,
  onGetLabel,
  onMarkCompleted,
  onShip,
  onUpdate,
}) => {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex-grow overflow-x-auto">
        {groups.map((group) => (
          <ItemGroupSection
            key={group.id}
            board={board}
            group={group}
            onDelete={onDelete}
            onGetLabel={onGetLabel}
            onMarkCompleted={onMarkCompleted}
            onShip={onShip}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </DragDropContext>
  )
}
