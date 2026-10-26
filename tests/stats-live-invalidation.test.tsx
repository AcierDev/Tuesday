import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import {
  fetchSharedJson,
  flushStatsInvalidation,
  invalidateStatsCaches,
  STATS_INVALIDATION_DEBOUNCE_MS,
  STATS_SERVER_CACHE_TTL_MS,
  statsReadsNeedFresh,
  statsViewUrl,
  useStatsView,
} from "../lib/stats-shared";

const JSON_HEADERS = { "Content-Type": "application/json" };
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: JSON_HEADERS });
const SETTLE_MS = 50;
const BURST_SIZE = 5;
const HTTP_SERVER_ERROR = 500;

type Payload = { label: string };

function View({ view }: { view: string }) {
  const { data, loading } = useStatsView<Payload>(view);
  return React.createElement("span", null, data?.label ?? (loading ? "loading" : "none"));
}

const text = (renderer: TestRenderer.ReactTestRenderer) =>
  renderer.root.findAllByType("span").map((s) => s.children.join()).join("|");

// Each test swaps in a scripted fetch and restores it (and the shared cache).
async function withFetch(
  impl: (url: string) => Promise<Response>,
  body: (calls: string[]) => Promise<void>
) {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    return impl(url);
  }) as typeof fetch;
  try {
    await body(calls);
  } finally {
    globalThis.fetch = originalFetch;
    invalidateStatsCaches();
    flushStatsInvalidation();
  }
}

// Runs first: before any write this tab reads the server's cached copy.
test("consumers of one view share a single request, without the fresh flag before any write", async () => {
  await withFetch(async () => json({ label: "v1" }), async (calls) => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        React.createElement(React.Fragment, null,
          React.createElement(View, { view: "shared" }),
          React.createElement(View, { view: "shared" }))
      );
    });
    assert.equal(text(renderer), "v1|v1");
    assert.deepEqual(calls, [statsViewUrl("shared")]);
    // A later mount inside the TTL reuses the response.
    await act(async () => { renderer.update(React.createElement(View, { view: "shared" })); });
    assert.equal(calls.length, 1);
    act(() => renderer.unmount());
  });
});

test("after a write, mounted consumers refetch once with the fresh flag", async () => {
  let label = "before";
  await withFetch(async () => json({ label }), async (calls) => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        React.createElement(React.Fragment, null,
          React.createElement(View, { view: "fresh" }),
          React.createElement(View, { view: "fresh" }))
      );
    });
    const before = calls.length;
    label = "after";
    await act(async () => { invalidateStatsCaches(); flushStatsInvalidation(); });
    assert.equal(text(renderer), "after|after");
    assert.equal(calls.length, before + 1, "one refetch shared by both consumers");
    const refetch = new URL(calls.at(-1)!, "http://local");
    assert.equal(refetch.pathname, "/api/stats/view/fresh");
    assert.equal(refetch.searchParams.get("fresh"), "1");
    assert.ok(refetch.searchParams.has("_"), "HTTP caches are bypassed too");
    act(() => renderer.unmount());
  });
});

test("reads ask for fresh data only within the server cache TTL after a write", () => {
  invalidateStatsCaches();
  const now = Date.now();
  assert.equal(statsReadsNeedFresh(now), true);
  assert.equal(statsReadsNeedFresh(now + STATS_SERVER_CACHE_TTL_MS), false);
  flushStatsInvalidation();
});

test("a request started before a write cannot restore its stale response", async () => {
  let resolveOld!: (response: Response) => void;
  let first = true;
  await withFetch((url) => {
    if (first) {
      first = false;
      return new Promise<Response>((resolve) => { resolveOld = resolve; });
    }
    return Promise.resolve(json({ label: `new:${url.includes("fresh=1")}` }));
  }, async (calls) => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(React.createElement(View, { view: "race" })); });
    await act(async () => { invalidateStatsCaches(); flushStatsInvalidation(); });
    assert.equal(text(renderer), "new:true");
    await act(async () => { resolveOld(json({ label: "old" })); });
    assert.equal(text(renderer), "new:true", "late stale response is ignored");
    act(() => renderer.unmount());
    await act(async () => { renderer = TestRenderer.create(React.createElement(View, { view: "race" })); });
    assert.equal(text(renderer), "new:true", "a later mount gets the post-write copy");
    assert.equal(calls.length, 2);
    act(() => renderer.unmount());
  });
});

test("a burst of invalidations notifies subscribers once, after the debounce", async () => {
  await withFetch(async () => json({ label: "v" }), async (calls) => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(React.createElement(View, { view: "burst" })); });
    const afterMount = calls.length;
    await act(async () => {
      for (let i = 0; i < BURST_SIZE; i++) invalidateStatsCaches();
    });
    assert.equal(calls.length, afterMount, "no refetch before the debounce elapses");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, STATS_INVALIDATION_DEBOUNCE_MS + SETTLE_MS));
    });
    assert.equal(calls.length, afterMount + 1, "one refetch for the whole burst");
    act(() => renderer.unmount());
  });
});

test("a failed request is not cached; the next caller retries", async () => {
  let fail = true;
  await withFetch(async () => (fail ? new Response("", { status: HTTP_SERVER_ERROR }) : json({ label: "ok" })), async (calls) => {
    const url = statsViewUrl("flaky");
    await assert.rejects(fetchSharedJson(url), /HTTP 500/);
    fail = false;
    assert.deepEqual(await fetchSharedJson<Payload>(url), { label: "ok" });
    assert.equal(calls.length, 2);
  });
});

test("view URLs are stable regardless of param order", () => {
  assert.equal(
    statsViewUrl("mix", { start: "2026-10-01", end: "2026-10-30" }),
    statsViewUrl("mix", { end: "2026-10-30", start: "2026-10-01" })
  );
  assert.equal(statsViewUrl("summary"), "/api/stats/view/summary");
});

test("the client's fresh window covers the server's dataset TTL", async () => {
  // stats-dataset imports the DB module, which connects eagerly at load; point
  // it at a closed local port that fails fast so nothing real is touched.
  process.env.MONGODB_URI = "mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=50&connectTimeoutMS=50";
  const { STATS_DATASET_TTL_MS } = await import("../lib/server/stats-dataset");
  assert.ok(STATS_SERVER_CACHE_TTL_MS >= STATS_DATASET_TTL_MS);
});
