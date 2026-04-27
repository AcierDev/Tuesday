"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ItemStatus } from "@/typings/types";
import { cn } from "@/utils/functions";

const STATUS_OPTIONS: ItemStatus[] = [
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
  ItemStatus.Packaging,
  ItemStatus.At_The_Door,
  ItemStatus.Done,
];

const STATUS_DOT: Record<ItemStatus, string> = {
  [ItemStatus.New]: "bg-gray-400",
  [ItemStatus.OnDeck]: "bg-gray-400",
  [ItemStatus.Wip]: "bg-orange-500",
  [ItemStatus.Packaging]: "bg-red-500",
  [ItemStatus.At_The_Door]: "bg-lime-500",
  [ItemStatus.Done]: "bg-emerald-500",
  [ItemStatus.Hidden]: "bg-gray-400",
};

const MENU_MARGIN = 6;

interface OrderContextMenuProps {
  x: number;
  y: number;
  currentStatus: ItemStatus | undefined;
  onSelectStatus: (status: ItemStatus) => void;
  onClose: () => void;
}

export function OrderContextMenu({
  x,
  y,
  currentStatus,
  onSelectStatus,
  onClose,
}: OrderContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  // Clamp the menu inside the viewport so right-clicks near the edge don't
  // push it off-screen.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - MENU_MARGIN;
    const maxY = window.innerHeight - rect.height - MENU_MARGIN;
    setPos({
      x: Math.max(MENU_MARGIN, Math.min(x, maxX)),
      y: Math.max(MENU_MARGIN, Math.min(y, maxY)),
    });
  }, [x, y]);

  useEffect(() => {
    const handlePointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleScroll = () => onClose();
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-[100] min-w-[180px] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1"
      style={{ top: pos.y, left: pos.x }}
    >
      <div className="px-3 pt-1 pb-1 text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold">
        Move to
      </div>
      {STATUS_OPTIONS.map((status) => (
        <button
          key={status}
          type="button"
          disabled={status === currentStatus}
          onClick={() => {
            onSelectStatus(status);
            onClose();
          }}
          className={cn(
            "w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent rounded-sm text-gray-800 dark:text-gray-100"
          )}
        >
          <span
            className={cn("inline-block w-2 h-2 rounded-full", STATUS_DOT[status])}
          />
          {status}
        </button>
      ))}
    </div>,
    document.body
  );
}
