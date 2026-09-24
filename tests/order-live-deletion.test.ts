import assert from "node:assert/strict";
import { test } from "node:test";
import { useOrderStore } from "../stores/useOrderStore";
import { ItemStatus, type Item } from "../typings/types";

const DELETED_ID = "deleted-on-another-device";
const KEPT_ID = "keep-this-order";
const LISTS = ["items", "doneItems", "scheduledItems", "allItems", "searchResults"] as const;

test("remote soft deletion removes an order from all cached lists without refreshing", () => {
  const originalWindow = globalThis.window;
  const originalEventSource = globalThis.EventSource;
  const originalState = useOrderStore.getState();
  let stream: FakeEventSource;
  class FakeEventSource {
    onmessage: ((event: { data: string }) => void) | null = null;
    close() {}
    constructor() { stream = this; }
  }
  globalThis.window = {} as Window & typeof globalThis;
  globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;
  const removed = { id: DELETED_ID, status: ItemStatus.Packaging, visible: true, deleted: false } as Item;
  const kept = { ...removed, id: KEPT_ID };
  try {
    useOrderStore.setState(Object.fromEntries(LISTS.map(key => [key, [removed, kept]])));
    useOrderStore.getState().startWatchingChanges();
    const event = { data: JSON.stringify({ type: "update", itemId: DELETED_ID, item: { ...removed, deleted: true } }) };
    stream!.onmessage!(event);
    for (const key of LISTS) {
      assert.deepEqual(useOrderStore.getState()[key].map(item => item.id), [KEPT_ID], key);
    }
    // Repeated delivery must not reintroduce the deleted order.
    stream!.onmessage!(event);
    assert.deepEqual(useOrderStore.getState().items.map(item => item.id), [KEPT_ID]);
  } finally {
    useOrderStore.getState().stopWatchingChanges();
    useOrderStore.setState(originalState);
    globalThis.window = originalWindow;
    globalThis.EventSource = originalEventSource;
  }
});
