import assert from "node:assert/strict";
import { test } from "node:test";

import { createTtlCache } from "../lib/server/ttl-cache";

const TTL_MS = 1_000;
const JOIN_WINDOW_MS = 100;
const KEY = "k";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// A cache over a scripted loader: each load returns the next pending promise
// so tests decide when (and in which order) loads finish.
function harness() {
  let clock = 0;
  const loads: { previous: string | undefined; d: Deferred<string> }[] = [];
  const cache = createTtlCache<string, string>(
    (_key, previous) => {
      const d = deferred<string>();
      loads.push({ previous, d });
      return d.promise;
    },
    { ttlMs: TTL_MS, freshJoinWindowMs: JOIN_WINDOW_MS, now: () => clock }
  );
  return {
    cache,
    loads,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

test("concurrent reads share one load", async () => {
  const h = harness();
  const a = h.cache.get(KEY);
  const b = h.cache.get(KEY);
  assert.equal(h.loads.length, 1);
  h.loads[0]!.d.resolve("v1");
  assert.deepEqual(await Promise.all([a, b]), ["v1", "v1"]);
});

test("a settled value is reused within the TTL and reloaded after it", async () => {
  const h = harness();
  const first = h.cache.get(KEY);
  h.loads[0]!.d.resolve("v1");
  await first;
  h.advance(TTL_MS - 1);
  assert.equal(await h.cache.get(KEY), "v1");
  assert.equal(h.loads.length, 1);
  h.advance(1);
  const reload = h.cache.get(KEY);
  assert.equal(h.loads.length, 2);
  h.loads[1]!.d.resolve("v2");
  assert.equal(await reload, "v2");
});

test("the loader receives the previously settled value", async () => {
  const h = harness();
  const first = h.cache.get(KEY);
  assert.equal(h.loads[0]!.previous, undefined);
  h.loads[0]!.d.resolve("v1");
  await first;
  h.advance(TTL_MS);
  void h.cache.get(KEY);
  assert.equal(h.loads[1]!.previous, "v1");
  h.loads[1]!.d.resolve("v2");
});

test("a fresh read reuses a value loaded inside the join window only", async () => {
  const h = harness();
  const first = h.cache.get(KEY);
  h.loads[0]!.d.resolve("v1");
  await first;
  h.advance(JOIN_WINDOW_MS);
  assert.equal(await h.cache.get(KEY, { fresh: true }), "v1");
  assert.equal(h.loads.length, 1);
  h.advance(1);
  const fresh = h.cache.get(KEY, { fresh: true });
  assert.equal(h.loads.length, 2, "older than the window: reload");
  h.loads[1]!.d.resolve("v2");
  assert.equal(await fresh, "v2");
});

test("a fresh read joins a recent in-flight load but not an older one", async () => {
  const h = harness();
  const plain = h.cache.get(KEY);
  h.advance(JOIN_WINDOW_MS);
  const joined = h.cache.get(KEY, { fresh: true });
  assert.equal(h.loads.length, 1, "load started inside the window is shared");
  h.advance(1);
  const own = h.cache.get(KEY, { fresh: true });
  assert.equal(h.loads.length, 2, "load started before the window is not");
  h.loads[0]!.d.resolve("old");
  h.loads[1]!.d.resolve("new");
  assert.deepEqual(await Promise.all([plain, joined, own]), ["old", "old", "new"]);
});

test("an older load resolving late never replaces newer data", async () => {
  const h = harness();
  const older = h.cache.get(KEY);
  h.advance(JOIN_WINDOW_MS + 1);
  const newer = h.cache.get(KEY, { fresh: true });
  h.loads[1]!.d.resolve("new");
  await newer;
  h.loads[0]!.d.resolve("old");
  assert.equal(await older, "old", "its own caller still gets its result");
  assert.equal(await h.cache.get(KEY), "new");
  assert.equal(h.loads.length, 2);
});

test("invalidate() detaches in-flight loads and drops settled values", async () => {
  const h = harness();
  const settledRead = h.cache.get(KEY);
  h.loads[0]!.d.resolve("v1");
  await settledRead;
  h.advance(TTL_MS);
  const inflight = h.cache.get(KEY);
  h.cache.invalidate();
  const after = h.cache.get(KEY);
  assert.equal(h.loads.length, 3, "a read after invalidate starts its own load");
  h.loads[1]!.d.resolve("pre-invalidate");
  assert.equal(await inflight, "pre-invalidate");
  h.loads[2]!.d.resolve("post-invalidate");
  assert.equal(await after, "post-invalidate");
  assert.equal(await h.cache.get(KEY), "post-invalidate");
  assert.equal(h.loads.length, 3);
});

test("a detached load finishing after invalidate() does not repopulate", async () => {
  const h = harness();
  const detached = h.cache.get(KEY);
  h.cache.invalidate();
  h.loads[0]!.d.resolve("stale");
  await detached;
  const next = h.cache.get(KEY);
  assert.equal(h.loads.length, 2);
  h.loads[1]!.d.resolve("current");
  assert.equal(await next, "current");
});

test("failed loads are not cached; the next read retries", async () => {
  const h = harness();
  const failing = h.cache.get(KEY);
  h.loads[0]!.d.reject(new Error("offline"));
  await assert.rejects(failing, /offline/);
  const retry = h.cache.get(KEY);
  assert.equal(h.loads.length, 2);
  h.loads[1]!.d.resolve("v1");
  assert.equal(await retry, "v1");
});

test("keys are cached independently", async () => {
  const h = harness();
  const a = h.cache.get("a");
  const b = h.cache.get("b");
  assert.equal(h.loads.length, 2);
  h.loads[0]!.d.resolve("A");
  h.loads[1]!.d.resolve("B");
  assert.deepEqual(await Promise.all([a, b]), ["A", "B"]);
});
