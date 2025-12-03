"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { OrderCard } from "./OrderCard";
import { OrderMeta } from "./types";
import { DayName } from "@/typings/types";

interface DraggableOrderCardProps {
  meta: OrderMeta;
  id: string;
  disabled?: boolean;
  isScheduled?: boolean;
  scheduledDay?: DayName | null;
  onUnschedule?: () => void;
  referenceDate?: Date;
}

export function DraggableOrderCard({ 
  meta, 
  id, 
  disabled,
  isScheduled,
  scheduledDay,
  onUnschedule,
  referenceDate
}: DraggableOrderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled, data: { meta, isScheduled, scheduledDay } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners} 
      className="touch-none mb-2"
    >
      <OrderCard 
        meta={meta} 
        isScheduled={isScheduled}
        scheduledDay={scheduledDay}
        onUnschedule={onUnschedule}
        showScheduleButtons={false} // Hide buttons in DnD mode
        referenceDate={referenceDate}
      />
    </div>
  );
}
