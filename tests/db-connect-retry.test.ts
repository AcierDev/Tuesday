import assert from "node:assert/strict";
import test from "node:test";
import { lazyPromise, retryingConnection } from "../app/api/db/retrying-connection";

function memorySlot<T>() {
  let value: Promise<T> | undefined;
  return { get: () => value, set: (promise: Promise<T> | undefined) => { value = promise; } };
}

test("concurrent callers share one connection attempt", async () => {
  let attempts = 0;
  const connect = retryingConnection(async () => ++attempts, memorySlot<number>());
  assert.deepEqual(await Promise.all([connect(), connect()]), [1, 1]);
  assert.equal(attempts, 1);
});

test("a failed connection is retried by the next caller", async () => {
  let attempts = 0;
  const connect = retryingConnection(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("offline");
    return "client";
  }, memorySlot<string>());
  const client = lazyPromise(connect);
  await assert.rejects(client, /offline/);
  assert.equal(await client, "client");
  assert.equal(await client, "client");
  assert.equal(attempts, 2);
});
