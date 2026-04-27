"use client";

import { useDndContext } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { OrderCard } from "./OrderCard";
import { OrderMeta } from "./types";
import { POST_WIP_STATUSES } from "./constants";
import { DayName } from "@/typings/types";

interface DraggableOrderCardProps {
  meta: OrderMeta;
  id: string;
  disabled?: boolean;
  isScheduled?: boolean;
  scheduledDay?: DayName | null;
  referenceDate?: Date;
  isPinned?: boolean;
  onTogglePin?: () => void;
  justPlaced?: boolean;
  placeIndex?: number;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function DraggableOrderCard({
  meta,
  id,
  disabled,
  isScheduled,
  scheduledDay,
  referenceDate,
  isPinned,
  onTogglePin,
  justPlaced,
  placeIndex,
  onContextMenu,
}: DraggableOrderCardProps) {
  // Pinned cards are locked in place — auto-plan won't move them and the user
  // can't drag them either. They have to be unpinned first via the pin toggle.
  // Scheduled cards past Wip (Packaging and beyond) are also locked so
  // historical day assignments stay accurate. Moving the order back to Wip
  // or earlier unlocks the card.
  const lockedByStatus =
    !!isScheduled && POST_WIP_STATUSES.has(meta.item.status);
  const dragDisabled = disabled || !!isPinned || lockedByStatus;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: dragDisabled,
    data: { meta, isScheduled, scheduledDay },
  });

  // While dragging this card, peek at where the cursor is. If it's left this
  // day for another day's column, hide the source slot — the user wants the
  // origin to clear out, not leave a faded ghost behind.
  const { over } = useDndContext();
  const overData = over?.data.current as
    | { day?: DayName; scheduledDay?: DayName | null }
    | undefined;
  const overDay = overData?.day ?? overData?.scheduledDay ?? null;
  const sourceLeftOriginDay =
    isDragging && !!scheduledDay && !!overDay && overDay !== scheduledDay;

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? (sourceLeftOriginDay ? 0 : 0.4) : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onContextMenu={onContextMenu}
      className={`touch-none select-none mb-2.5 ${
        dragDisabled
          ? "cursor-default"
          : isDragging
          ? "cursor-grabbing"
          : "cursor-grab active:cursor-grabbing"
      }`}
    >
      <OrderCard
        meta={meta}
        isScheduled={isScheduled}
        scheduledDay={scheduledDay}
        showScheduleButtons={false}
        referenceDate={referenceDate}
        isPinned={isPinned}
        onTogglePin={onTogglePin}
        justPlaced={justPlaced}
        placeIndex={placeIndex}
      />
    </div>
  );
}
