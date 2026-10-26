import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import type { fetchTracker as FetchTracker } from "../lib/easypost-tracking";

const HTTP_UNPROCESSABLE = 422;
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
let fetchTracker: typeof FetchTracker;
const requestedUrls: string[] = [];

before(async () => {
  // lib/easypost-tracking imports the Mongo connector. Pre-seeding the
  // development client promise means no MongoClient is ever created.
  process.env.MONGODB_URI = "mongodb://stub.invalid/never-used";
  (process.env as Record<string, string>).NODE_ENV = "development";
  process.env.EASYPOST_API_KEY = "EZTKtest-not-real";
  (globalThis as { _mongoClientPromise?: Promise<unknown> })._mongoClientPromise =
    Promise.resolve({ db: () => ({}) });

  globalThis.fetch = async (input) => {
    const url = String(input);
    requestedUrls.push(url);
    if (!url.startsWith("https://api.easypost.com/v2/trackers")) {
      throw new Error(`Unexpected request: ${url}`);
    }
    // Creation fails so the code falls back to listing existing trackers.
    if (!url.includes("?")) {
      return new Response("{}", { status: HTTP_UNPROCESSABLE });
    }
    return new Response(
      JSON.stringify({ trackers: [{ id: "trk_1", tracking_code: "x" }] }),
      { headers: { "Content-Type": "application/json" } }
    );
  };

  ({ fetchTracker } = await import("../lib/easypost-tracking"));
});

after(() => {
  globalThis.fetch = originalFetch;
  process.env = originalEnv;
  delete (globalThis as { _mongoClientPromise?: Promise<unknown> })
    ._mongoClientPromise;
});

test("tracker lookups encode the tracking code into the query", async () => {
  await fetchTracker("1Z 999&carrier=evil#x", "UPS");

  const listUrl = requestedUrls.find((url) => url.includes("?"));
  assert.ok(listUrl);
  const parsed = new URL(listUrl);
  assert.deepEqual(parsed.searchParams.getAll("tracking_codes[]"), [
    "1Z 999&carrier=evil#x",
  ]);
  assert.equal(parsed.searchParams.get("carrier"), null);
  assert.equal(parsed.hash, "");
});
