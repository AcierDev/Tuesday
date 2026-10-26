import type { DayName, WeeklyScheduleData } from "@/typings/types";
import { DAYS } from "@/components/production-planning/planner-config";
import type { OrderMeta } from "@/components/production-planning/types";

export type PlannerContainer = DayName | "unscheduled";

// Which list a draggable / droppable id belongs to: the unscheduled sidebar,
// a day of the current week, or a day column itself.
export function findPlannerContainer(
  id: string,
  unscheduledOrders: OrderMeta[],
  currentSchedule: WeeklyScheduleData | undefined
): PlannerContainer | null {
  if (unscheduledOrders.find((o) => o.id === id)) return "unscheduled";
  if (id === "unscheduled") return "unscheduled";

  // Check scheduled orders
  if (currentSchedule) {
    for (const [day, items] of Object.entries(currentSchedule.schedule)) {
      if (items.find((i) => i.id === id)) return day as DayName;
    }
  }

  // Check if it's a day column ID
  if (DAYS.includes(id as DayName)) return id as DayName;

  return null;
}

type PlannerDrop = {
  activeId: string;
  activeContainer: PlannerContainer;
  overId: string;
  targetDay: DayName;
  // Cursor is past the vertical midpoint of the card it's over.
  dropsAfterOver: boolean;
};

// Applies a drop onto a day column to `schedule` in place. Returns false when
// the dragged entry is no longer in its source list (the drop is ignored).
export function applyPlannerDrop(
  schedule: WeeklyScheduleData["schedule"],
  { activeId, activeContainer, overId, targetDay, dropsAfterOver }: PlannerDrop
): boolean {
  // Insertion index follows the cursor. Dropping on an unpinned card
  // inserts before it (cursor on top half) or after it (bottom half) so the
  // user can land on either side of any card — including the very last
  // one when the column body is content-sized and there's no gap to hover
  // below it. Pinned cards always slot the new arrival at the top of
  // unpinned. Column body / empty area falls through to the end. Mirrors
  // the ghost-preview logic in DroppableDayColumn.
  const indexFromOver = (list: WeeklyScheduleData["schedule"][DayName]) => {
    if (!overId || overId === targetDay) return list.length;
    const idx = list.findIndex((item) => item.id === overId);
    if (idx === -1) return list.length;
    if (list[idx]?.pinned) {
      const firstUnpinnedIdx = list.findIndex((item) => !item.pinned);
      return firstUnpinnedIdx !== -1 ? firstUnpinnedIdx : list.length;
    }
    return idx + (dropsAfterOver ? 1 : 0);
  };

  if (activeContainer === "unscheduled") {
    const targetList = schedule[targetDay];
    targetList.splice(indexFromOver(targetList), 0, {
      id: activeId,
      done: false,
    });
    return true;
  }

  const activeDay = activeContainer;
  const sourceList = schedule[activeDay];
  const activeIndex = sourceList.findIndex((item) => item.id === activeId);

  if (activeIndex === -1) return false;

  if (activeDay === targetDay) {
    // Same-day reorder: use arrayMove semantics so the drop matches what
    // dnd-kit's sortable already animated during the drag (active swaps
    // into the over-card's slot). The previous logic computed
    // indexFromOver against the post-splice list, which produced an
    // off-by-one for "drop above an item I was already above" — the card
    // landed back at its source slot and looked like a snap-back.
    let newIndex: number;
    if (!overId || overId === targetDay) {
      newIndex = sourceList.length - 1;
    } else if (overId === activeId) {
      newIndex = activeIndex;
    } else {
      const overIdx = sourceList.findIndex((item) => item.id === overId);
      if (overIdx === -1) {
        newIndex = activeIndex;
      } else if (sourceList[overIdx]?.pinned) {
        const firstUnpinnedIdx = sourceList.findIndex((item) => !item.pinned);
        newIndex = firstUnpinnedIdx !== -1 ? firstUnpinnedIdx : activeIndex;
      } else {
        newIndex = overIdx;
      }
    }

    if (newIndex !== activeIndex) {
      const [moved] = sourceList.splice(activeIndex, 1);
      if (moved) sourceList.splice(newIndex, 0, moved);
    }
    return true;
  }

  const [movedItem] = sourceList.splice(activeIndex, 1);
  if (!movedItem) return false;
  const targetList = schedule[targetDay];
  targetList.splice(indexFromOver(targetList), 0, movedItem);
  return true;
}
