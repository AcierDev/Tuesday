import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";

import {
  afterBoardBoot,
  DEFERRED_BOOT_FALLBACK_DELAY_MS,
  DEFERRED_BOOT_IDLE_TIMEOUT_MS,
  DEFERRED_BOOT_MAX_WAIT_MS,
  isBoardBootSettled,
  markBoardBootSettled,
  resetDeferredBootForTests,
} from "../lib/deferred-boot";

type IdleGlobal = {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};
const idleGlobal = globalThis as IdleGlobal;

// Collects idle callbacks so a test decides when the browser is "idle".
function installIdleQueue() {
  const queue = new Map<number, () => void>();
  const timeouts: number[] = [];
  let nextHandle = 1;
  idleGlobal.requestIdleCallback = (callback, options) => {
    const handle = nextHandle++;
    queue.set(handle, callback);
    if (options) timeouts.push(options.timeout);
    return handle;
  };
  idleGlobal.cancelIdleCallback = (handle) => queue.delete(handle);
  return {
    timeouts,
    pending: () => queue.size,
    runIdle: () => {
      const callbacks = [...queue.values()];
      queue.clear();
      for (const callback of callbacks) callback();
    },
  };
}

afterEach(() => {
  resetDeferredBootForTests();
  delete idleGlobal.requestIdleCallback;
  delete idleGlobal.cancelIdleCallback;
  mock.timers.reset();
});

test("queued work waits for the board's first load, then for an idle moment", () => {
  const idle = installIdleQueue();
  const ran: string[] = [];
  afterBoardBoot(() => ran.push("labels"));
  afterBoardBoot(() => ran.push("trackers"));
  assert.equal(idle.pending(), 0, "nothing is scheduled before the board loads");

  markBoardBootSettled();
  assert.equal(isBoardBootSettled(), true);
  assert.deepEqual(ran, [], "board load alone does not run the work");
  assert.deepEqual(idle.timeouts, [DEFERRED_BOOT_IDLE_TIMEOUT_MS, DEFERRED_BOOT_IDLE_TIMEOUT_MS]);

  idle.runIdle();
  assert.deepEqual(ran, ["labels", "trackers"]);
});

test("work queued after the board loaded still waits for idle", () => {
  const idle = installIdleQueue();
  markBoardBootSettled();
  let ran = false;
  afterBoardBoot(() => {
    ran = true;
  });
  assert.equal(ran, false);
  idle.runIdle();
  assert.equal(ran, true);
});

test("cancelled work never runs, before or after the board loads", () => {
  const idle = installIdleQueue();
  let early = false;
  let late = false;
  const cancelEarly = afterBoardBoot(() => {
    early = true;
  });
  cancelEarly();
  markBoardBootSettled();
  const cancelLate = afterBoardBoot(() => {
    late = true;
  });
  cancelLate();
  idle.runIdle();
  assert.equal(early, false);
  assert.equal(late, false);
});

test("without requestIdleCallback, work runs after the fallback delay", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  let ran = false;
  markBoardBootSettled();
  afterBoardBoot(() => {
    ran = true;
  });
  mock.timers.tick(DEFERRED_BOOT_FALLBACK_DELAY_MS - 1);
  assert.equal(ran, false);
  mock.timers.tick(1);
  assert.equal(ran, true);
});

test("a board that never reports still releases work after the max wait", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  let ran = false;
  afterBoardBoot(() => {
    ran = true;
  });
  mock.timers.tick(DEFERRED_BOOT_MAX_WAIT_MS);
  assert.equal(isBoardBootSettled(), true);
  mock.timers.tick(DEFERRED_BOOT_FALLBACK_DELAY_MS);
  assert.equal(ran, true);
});
