import { MouseSensor, TouchSensor } from "@dnd-kit/core";
import { isAnyModalDialogOpen } from "@/utils/dnd-modal-guard";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🚫 NO-DRAG WHILE MODAL OPEN                                          ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// Block sensor activation when a Radix dialog is open so background cards
// can't be dragged through the overlay.
export class GuardedMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: "onMouseDown" as const,
      handler: ({ nativeEvent: event }: React.MouseEvent) => {
        if (event.button !== 0) return false;
        if (isAnyModalDialogOpen()) return false;
        return true;
      },
    },
  ];
}

export class GuardedTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent: event }: React.TouchEvent) => {
        if (isAnyModalDialogOpen()) return false;
        if (event.touches.length > 1) return false;
        return true;
      },
    },
  ];
}
