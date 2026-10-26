import assert from "node:assert/strict";
import { before, test } from "node:test";

import type { OrderTrackingInfo, Tracker } from "../typings/types";
import type { useTrackingStore as TrackingStoreHook } from "../stores/useTrackingStore";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }
  close() {
    this.closed = true;
  }
}

function tracker(id: string, status: Tracker["status"]): Tracker {
  return { id, tracking_code: `code-${id}`, status } as Tracker;
}

const requests: string[] = [];
let useTrackingStore: typeof TrackingStoreHook;
let requestsBeforeBoard: string[] = [];
let streamsBeforeBoard = 0;

before(async () => {
  (globalThis as { window?: unknown }).window = {};
  (globalThis as { EventSource?: unknown }).EventSource = FakeEventSource;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    const body: OrderTrackingInfo[] = [
      { orderId: "a", trackers: [tracker("trk_a", "in_transit")] },
      { orderId: "b", trackers: [tracker("trk_b", "pre_transit")] },
    ];
    return new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  (globalThis as { requestIdleCallback?: (callback: () => void) => number }).requestIdleCallback = (callback) => {
    callback();
    return 0;
  };
  ({ useTrackingStore } = await import("../stores/useTrackingStore"));
  await new Promise<void>((resolve) => setImmediate(resolve));
  requestsBeforeBoard = [...requests];
  streamsBeforeBoard = FakeEventSource.instances.length;
  (await import("../lib/deferred-boot")).markBoardBootSettled();
  await new Promise<void>((resolve) => setImmediate(resolve));
});

test("trackers and their live stream wait for the board's first load", () => {
  assert.deepEqual(requestsBeforeBoard, []);
  assert.equal(streamsBeforeBoard, 0);
});

test("live tracking listens on the authenticated changes route, not the webhook", () => {
  assert.deepEqual(requests, ["/api/order-tracking"]);
  assert.equal(FakeEventSource.instances.length, 1);
  assert.equal(FakeEventSource.instances[0]?.url, "/api/tracking/changes");
});

test("a change replaces only that order's entry and keeps other rows' references", () => {
  const before = useTrackingStore.getState().trackingByOrderId;
  const unchangedB = before.b;
  FakeEventSource.instances[0]?.onmessage?.({
    data: JSON.stringify({
      type: "tracking.updated",
      data: { orderId: "a", trackers: [tracker("trk_a", "delivered")] },
    }),
  });

  const after = useTrackingStore.getState();
  assert.equal(after.trackingByOrderId.a?.trackers[0]?.status, "delivered");
  assert.equal(after.trackingByOrderId.b, unchangedB);
  assert.equal(after.trackingInfo.length, 2);

  FakeEventSource.instances[0]?.onmessage?.({
    data: JSON.stringify({
      type: "tracking.updated",
      data: { orderId: "c", trackers: [tracker("trk_c", "pre_transit")] },
    }),
  });
  assert.equal(useTrackingStore.getState().trackingInfo.length, 3);
});

test("malformed messages are ignored", () => {
  const snapshot = useTrackingStore.getState().trackingInfo;
  FakeEventSource.instances[0]?.onmessage?.({ data: "not json" });
  FakeEventSource.instances[0]?.onmessage?.({ data: JSON.stringify({ type: "other" }) });
  assert.equal(useTrackingStore.getState().trackingInfo, snapshot);
});

test("stopping closes the stream and cancels any pending reconnect", async () => {
  const source = FakeEventSource.instances[0]!;
  source.onerror?.();
  useTrackingStore.getState().stopWatchingChanges();
  assert.equal(source.closed, true);
  assert.equal(useTrackingStore.getState().eventSource, null);
  assert.equal(FakeEventSource.instances.length, 1);
});
