import { useCallback, useEffect, useRef, useState } from "react";

interface UseUndoRedoOptions<T> {
  current: T;
  apply: (next: T) => void;
  isEqual?: (a: T, b: T) => boolean;
  enabled?: boolean;
  historyKey?: string;
  onUndo?: () => void;
  onRedo?: () => void;
  maxDepth?: number;
}

export function useUndoRedo<T>({
  current,
  apply,
  isEqual = Object.is,
  enabled = true,
  historyKey,
  onUndo,
  onRedo,
  maxDepth = 50,
}: UseUndoRedoOptions<T>) {
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const isApplying = useRef(false);
  const lastSeen = useRef<T>(current);
  const lastKey = useRef<string | undefined>(historyKey);
  const [, force] = useState({});

  useEffect(() => {
    if (lastKey.current !== historyKey) {
      past.current = [];
      future.current = [];
      lastSeen.current = current;
      lastKey.current = historyKey;
      force({});
      return;
    }
    if (!enabled) {
      // Stay in sync with current while disabled so re-enabling does
      // not record the gap as a single "undo step".
      lastSeen.current = current;
      return;
    }
    if (isApplying.current) {
      isApplying.current = false;
      lastSeen.current = current;
      return;
    }
    if (!isEqual(lastSeen.current, current)) {
      past.current.push(lastSeen.current);
      if (past.current.length > maxDepth) past.current.shift();
      future.current = [];
      lastSeen.current = current;
      force({});
    }
  }, [current, isEqual, enabled, historyKey, maxDepth]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (prev === undefined) return false;
    future.current.push(lastSeen.current);
    isApplying.current = true;
    apply(prev);
    onUndo?.();
    force({});
    return true;
  }, [apply, onUndo]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (next === undefined) return false;
    past.current.push(lastSeen.current);
    isApplying.current = true;
    apply(next);
    onRedo?.();
    force({});
    return true;
  }, [apply, onRedo]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, undo, redo]);

  return {
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
