import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const PROJECT_DIRECTORY = fileURLToPath(new URL("../", import.meta.url));
const STORE_URL = new URL("../stores/useShippingStore.ts", import.meta.url).href;
const CHILD_TIMEOUT_MS = 10_000;
const SUCCESS_EXIT_CODE = 0;
const NO_REQUESTS = 0;
const ONE_INTERVAL = 1;
const FUTURE_LABEL_SUMMARY = { total: 1, unused: 1, used: 0, issues: 0 };
const SHIPPING_ENDPOINTS = [
  "/api/shipping/pdfs",
  "/api/shipping/labels/summary",
];

interface StartupResult {
  initialRequests: string[];
  intervalCount: number;
  pollDelay?: number;
  initialLabels: Record<string, string[]>;
  initialHasFutureLabel: boolean;
  requestsAfterPoll: string[];
  labelsAfterPoll: Record<string, string[]>;
  remainingIntervals: number;
}

function importShippingStore(browser: boolean): StartupResult {
  // A fresh process exercises real module initialization in each environment.
  // Only network access and timers are replaced; Zustand and both APIs run.
  const script = `
    if (process.env.SHIPPING_STORE_BROWSER === "true") globalThis.window = {};
    const requests = [];
    const intervals = new Map();
    let files = ["legacy-order.pdf"];
    globalThis.fetch = async (input) => {
      const url = String(input);
      requests.push(url);
      const body = url === "/api/shipping/pdfs"
        ? { files }
        : url === "/api/shipping/labels/summary"
          ? { summaries: { "future-order": ${JSON.stringify(FUTURE_LABEL_SUMMARY)} } }
          : (() => { throw new Error("Unexpected request: " + url); })();
      return new Response(JSON.stringify(body), {
        headers: { "Content-Type": "application/json" },
      });
    };
    globalThis.setInterval = (callback, delay) => {
      const handle = Symbol("poll");
      intervals.set(handle, { callback, delay });
      return handle;
    };
    globalThis.clearInterval = (handle) => intervals.delete(handle);
    const module = await import(${JSON.stringify(STORE_URL)});
    const { useShippingStore } = module.default ?? module;
    await new Promise((resolve) => setImmediate(resolve));
    const poll = intervals.values().next().value;
    const result = {
      initialRequests: [...requests],
      intervalCount: intervals.size,
      pollDelay: poll?.delay,
      initialLabels: useShippingStore.getState().labels,
      initialHasFutureLabel: useShippingStore.getState().hasLabel("future-order"),
    };
    if (poll) {
      files = ["legacy-order.pdf", "second-order.pdf"];
      await poll.callback();
    }
    useShippingStore.getState().stopPolling();
    result.requestsAfterPoll = [...requests];
    result.labelsAfterPoll = useShippingStore.getState().labels;
    result.remainingIntervals = intervals.size;
    console.log(JSON.stringify(result));
  `;
  const child = spawnSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", script],
    {
      cwd: PROJECT_DIRECTORY,
      env: { ...process.env, SHIPPING_STORE_BROWSER: String(browser) },
      encoding: "utf8",
      timeout: CHILD_TIMEOUT_MS,
    }
  );
  assert.ifError(child.error);
  assert.equal(child.status, SUCCESS_EXIT_CODE, child.stderr);
  assert.equal(child.stderr, "");
  return JSON.parse(child.stdout.trim()) as StartupResult;
}

test("SSR store import makes no shipping requests or polling timers", () => {
  const result = importShippingStore(false);
  assert.equal(result.initialRequests.length, NO_REQUESTS);
  assert.equal(result.intervalCount, NO_REQUESTS);
  assert.deepEqual(result.initialLabels, {});
});

test("browser store import loads labels immediately and keeps polling", () => {
  const result = importShippingStore(true);
  assert.deepEqual(result.initialRequests, SHIPPING_ENDPOINTS);
  assert.equal(result.intervalCount, ONE_INTERVAL);
  assert.ok(result.pollDelay && result.pollDelay > NO_REQUESTS);
  assert.deepEqual(result.initialLabels, {
    "legacy-order": ["legacy-order.pdf"],
  });
  assert.equal(result.initialHasFutureLabel, true);
  assert.deepEqual(result.requestsAfterPoll, [
    ...SHIPPING_ENDPOINTS,
    ...SHIPPING_ENDPOINTS,
  ]);
  assert.deepEqual(result.labelsAfterPoll, {
    "legacy-order": ["legacy-order.pdf"],
    "second-order": ["second-order.pdf"],
  });
  assert.equal(result.remainingIntervals, NO_REQUESTS);
});
