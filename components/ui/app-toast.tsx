"use client";

import Link from "next/link";
import { useEffect } from "react";
import { create } from "zustand";

import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🍞 SHARED TOAST                                                       ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// One compact pill at a time; a new toast replaces the current one. Call
// showToast / showErrorToast from anywhere (cells, stores, handlers) and
// <Toaster /> is mounted once in the app shell.

export const TOAST_DEFAULT_MS = 4_000;
export const TOAST_ERROR_MS = 6_000;

export type ToastTone = "default" | "error";

export interface ToastAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface ToastInput {
  message: string;
  tone?: ToastTone;
  action?: ToastAction;
  durationMs?: number;
}

interface ToastEntry extends ToastInput {
  id: number;
}

export const useToastStore = create<{ toast: ToastEntry | null }>(() => ({
  toast: null,
}));

let nextToastId = 0;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

function clearDismissTimer() {
  if (dismissTimer) clearTimeout(dismissTimer);
  dismissTimer = null;
}

export function showToast(input: ToastInput): number {
  const id = ++nextToastId;
  clearDismissTimer();
  useToastStore.setState({ toast: { ...input, id } });
  const durationMs =
    input.durationMs ??
    (input.tone === "error" ? TOAST_ERROR_MS : TOAST_DEFAULT_MS);
  dismissTimer = setTimeout(() => dismissToast(id), durationMs);
  return id;
}

export function showErrorToast(message: string): number {
  return showToast({ message, tone: "error" });
}

// Without an id, dismisses whatever is showing.
export function dismissToast(id?: number) {
  const current = useToastStore.getState().toast;
  if (!current || (id !== undefined && current.id !== id)) return;
  clearDismissTimer();
  useToastStore.setState({ toast: null });
}

const ACTION_CLASSES =
  "shrink-0 font-semibold underline-offset-2 hover:underline focus:outline-none focus-visible:underline";

export function Toaster() {
  const toast = useToastStore((state) => state.toast);

  // A toast belongs to the page that raised it; don't carry it across routes.
  useEffect(() => () => dismissToast(), []);

  if (!toast) return null;
  const { action } = toast;
  const isError = toast.tone === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={cn(
        // Sits above the phone page switcher; drops to the corner on desktop.
        "fixed left-1/2 -translate-x-1/2 z-[60] bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-4",
        "flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full px-4 py-2 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2",
        isError
          ? "bg-red-600 text-white"
          : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
      )}
    >
      <span className="truncate">{toast.message}</span>
      {action &&
        (action.href ? (
          <Link
            href={action.href}
            className={ACTION_CLASSES}
            onClick={() => dismissToast(toast.id)}
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            className={ACTION_CLASSES}
            onClick={() => {
              dismissToast(toast.id);
              action.onClick?.();
            }}
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}
