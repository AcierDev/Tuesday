import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const PROJECT_DIRECTORY = fileURLToPath(new URL("../", import.meta.url));
const STORE_URLS = [
  "../stores/useOrderStore.ts",
  "../stores/useShippingStore.ts",
  "../stores/useTrackingStore.ts",
  "../stores/useShippingSettingsStore.ts",
].map((path) => new URL(path, import.meta.url).href);
const CHILD_TIMEOUT_MS = 20_000;
const SUCCESS_EXIT_CODE = 0;
const BOARD_ITEMS_URL = "/api/items?includeDone=false&includeHidden=true";
// Booted by stores this change does not own (planner schedules).
const UNOWNED_BOOT_PREFIX = "/api/weekly-schedules";
const DEFERRED_ENDPOINTS = [
  "/api/order-tracking",
  "/api/settings/shipping",
  "/api/shipping/labels/summary",
  "/api/shipping/pdfs",
];

type BootResult = {
  beforeBoard: string[];
  streamsBeforeBoard: string[];
  afterBoard: string[];
  streamsAfterBoard: string[];
};

// Boots the browser stores in a fresh process, holding the board's items
// request open, and records what is requested before and after it settles.
function bootStores(): BootResult {
  const script = `
    globalThis.window = { location: { pathname: "/orders" } };
    globalThis.requestIdleCallback = (callback) => { callback(); return 0; };
    const streams = [];
    globalThis.EventSource = class { constructor(url) { streams.push(url); } close() {} };
    const requests = [];
    let releaseBoard;
    const boardResponse = new Promise((resolve) => { releaseBoard = resolve; });
    const json = (body) => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      requests.push((init?.method ?? "GET") + " " + url);
      if (url === ${JSON.stringify(BOARD_ITEMS_URL)}) { await boardResponse; return json([]); }
      if (url === "/api/shipping/pdfs") return json({ files: [] });
      if (url === "/api/shipping/labels/summary") return json({ summaries: {} });
      if (url === "/api/order-tracking") return json([]);
      if (url === "/api/settings/shipping") return json({});
      return json([]);
    };
    globalThis.setInterval = () => 0;
    for (const url of ${JSON.stringify(STORE_URLS)}) await import(url);
    const settle = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };
    await settle();
    const beforeBoard = [...requests];
    const streamsBeforeBoard = [...streams];
    releaseBoard();
    await settle();
    console.log(JSON.stringify({
      beforeBoard,
      streamsBeforeBoard,
      afterBoard: requests.slice(beforeBoard.length),
      streamsAfterBoard: streams.slice(streamsBeforeBoard.length),
    }));
    process.exit(0);
  `;
  const child = spawnSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", script],
    { cwd: PROJECT_DIRECTORY, encoding: "utf8", timeout: CHILD_TIMEOUT_MS }
  );
  assert.ifError(child.error);
  assert.equal(child.status, SUCCESS_EXIT_CODE, child.stderr);
  const line = child.stdout.trim().split("\n").at(-1) ?? "";
  return JSON.parse(line) as BootResult;
}

test("the board's items request has the critical path to itself", () => {
  const result = bootStores();
  const ours = result.beforeBoard.filter(
    (request) => !request.includes(UNOWNED_BOOT_PREFIX)
  );
  assert.deepEqual(ours, [`GET ${BOARD_ITEMS_URL}`]);
  assert.deepEqual(result.streamsBeforeBoard, []);

  // Once it settles (and the browser is idle) the deferred boot loads start.
  const deferred = result.afterBoard
    .map((request) => request.replace(/^GET /, ""))
    .filter((url) => DEFERRED_ENDPOINTS.includes(url))
    .sort();
  assert.deepEqual(deferred, DEFERRED_ENDPOINTS);
  assert.ok(result.streamsAfterBoard.includes("/api/items/changes"));
  assert.ok(result.streamsAfterBoard.includes("/api/tracking/changes"));
});
