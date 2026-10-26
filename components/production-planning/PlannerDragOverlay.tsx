"use client";

import { motion } from "framer-motion";
import {
  DragOverlay,
  defaultDropAnimationSideEffects,
  type DropAnimation,
} from "@dnd-kit/core";

import { OrderCard } from "@/components/production-planning/OrderCard";
import type { OrderMeta } from "@/components/production-planning/types";

// Drop animation: defaults to dnd-kit's keyframes which morph the overlay
// from its current (cursor) transform to the source-rect transform. Because
// updateSchedule applies optimistically before setActiveId(null), the source
// rect is already the destination slot by the time the animation runs — so
// the card visually flies from cursor → drop slot instead of fading in place.
// sideEffects fades the underlying card during the flight so we don't see a
// duplicate at the destination.
const DROP_ANIMATION: DropAnimation = {
  duration: 260,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0" } },
  }),
};

// Pickup lift: tiny scale-up + shadow so grabbing a card feels like detaching
// it from its slot rather than a duplicate flashing in over the source.
const DRAG_OVERLAY_VARIANTS = {
  initial: { scale: 0.96, boxShadow: "0 0 0 rgba(0,0,0,0)" },
  animate: {
    scale: 1.04,
    boxShadow: "0 16px 30px -10px rgba(0,0,0,0.32)",
  },
};

interface PlannerDragOverlayProps {
  activeId: string | null;
  activeMeta: OrderMeta | undefined;
  referenceDate: Date | undefined;
  isPinned: boolean;
}

// Floating card that follows the cursor while a planner card is dragged.
export function PlannerDragOverlay({
  activeId,
  activeMeta,
  referenceDate,
  isPinned,
}: PlannerDragOverlayProps) {
  return (
    <DragOverlay dropAnimation={DROP_ANIMATION}>
      {activeId && activeMeta ? (
        <motion.div
          variants={DRAG_OVERLAY_VARIANTS}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="cursor-grabbing rounded-md"
        >
          <OrderCard
            meta={activeMeta}
            isScheduled={true}
            referenceDate={referenceDate}
            isPinned={isPinned}
            onTogglePin={() => {}}
          />
        </motion.div>
      ) : null}
    </DragOverlay>
  );
}
