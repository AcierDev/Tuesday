import { useEffect, useState } from "react";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🐢 DEFERRED BOOT — non-critical loads wait for the board's first load ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// The order board's /api/items request is the only one the first paint needs.
// Everything else that boots with the app (label listing, trackers, settings,
// nav stats badges, issue scan) waits until that first load settles and the
// browser is idle, so it no longer competes for connections and bandwidth.

// Longest wait for an idle slot once the board has loaded.
export const DEFERRED_BOOT_IDLE_TIMEOUT_MS = 2_000;
// Browsers without requestIdleCallback run deferred work after this delay.
export const DEFERRED_BOOT_FALLBACK_DELAY_MS = 200;
// Safety net: deferred work starts by this long after it was queued even if
// the board never reports (e.g. a page that does not load orders).
export const DEFERRED_BOOT_MAX_WAIT_MS = 10_000;

interface IdleWindow {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number }
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
}

let boardSettled = false;
let maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
const waiting = new Set<() => void>();

function runWhenIdle(callback: () => void): () => void {
  // globalThis is window in the browser; tests can stub the idle callback.
  const idle = globalThis as IdleWindow;
  if (idle.requestIdleCallback) {
    const handle = idle.requestIdleCallback(callback, {
      timeout: DEFERRED_BOOT_IDLE_TIMEOUT_MS,
    });
    return () => idle.cancelIdleCallback?.(handle);
  }
  const timer = setTimeout(callback, DEFERRED_BOOT_FALLBACK_DELAY_MS);
  return () => clearTimeout(timer);
}

// Called by the order store once its first board load has finished (whether
// it succeeded or not). Releases every queued task at the next idle moment.
export function markBoardBootSettled(): void {
  if (boardSettled) return;
  boardSettled = true;
  if (maxWaitTimer) {
    clearTimeout(maxWaitTimer);
    maxWaitTimer = null;
  }
  const queued = [...waiting];
  waiting.clear();
  for (const release of queued) release();
}

export function isBoardBootSettled(): boolean {
  return boardSettled;
}

// Runs `task` once the board's first load has settled and the browser is
// idle. Returns a cancel function.
export function afterBoardBoot(task: () => void): () => void {
  let cancelIdle: (() => void) | null = null;
  let cancelled = false;
  const release = () => {
    if (cancelled) return;
    cancelIdle = runWhenIdle(() => {
      if (!cancelled) task();
    });
  };
  if (boardSettled) {
    release();
  } else {
    waiting.add(release);
    if (!maxWaitTimer) {
      maxWaitTimer = setTimeout(markBoardBootSettled, DEFERRED_BOOT_MAX_WAIT_MS);
      // Node (tests, SSR tooling): the safety net must not keep a process alive.
      (maxWaitTimer as { unref?: () => void }).unref?.();
    }
  }
  return () => {
    cancelled = true;
    waiting.delete(release);
    cancelIdle?.();
  };
}

// React binding: false until afterBoardBoot would run, then true for good.
export function useAfterBoardBoot(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready) return;
    return afterBoardBoot(() => setReady(true));
  }, [ready]);
  return ready;
}

// Test-only: restore the initial (board not yet loaded) state.
export function resetDeferredBootForTests(): void {
  boardSettled = false;
  waiting.clear();
  if (maxWaitTimer) clearTimeout(maxWaitTimer);
  maxWaitTimer = null;
}
