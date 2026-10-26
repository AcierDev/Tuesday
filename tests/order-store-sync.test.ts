import assert from "node:assert/strict";
import { test } from "node:test";
import { useOrderStore } from "../stores/useOrderStore";
import { ColumnTitles, ItemStatus, type Item } from "../typings/types";

const originalFetch = globalThis.fetch;
const FIRST_INDEX = 0;
const DONE_PAGE_DELAY_MS = 20;
const fixture: Item = {
  id: "sync-fixture", customerName: "Alex Lee", painted: "", glued: "", notes: "",
  status: ItemStatus.OnDeck, createdAt: 0, index: 0, visible: true, deleted: false,
};
type Call = { url: string; method: string; body?: Record<string, unknown> };

async function withStore(
  state: Partial<ReturnType<typeof useOrderStore.getState>>,
  respond: (call: Call) => Response | Promise<Response>,
  run: (calls: Call[]) => Promise<void>
) {
  const originalState = useOrderStore.getState();
  const calls: Call[] = [];
  globalThis.fetch = async (url, options) => {
    const call = {
      url: String(url), method: options?.method ?? "GET",
      body: options?.body ? JSON.parse(String(options.body)) : undefined,
    };
    calls.push(call);
    return respond(call);
  };
  try {
    useOrderStore.setState({ items: [], doneItems: [], scheduledItems: [], allItems: [], searchResults: [], ...state });
    await run(calls);
  } finally {
    globalThis.fetch = originalFetch;
    useOrderStore.setState(originalState);
  }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

test("a cell edit sends only its own field, even from a stale copy of the order", async () => {
  const latest = { ...fixture, glued: "Yes" };
  await withStore({ items: [latest] }, () => json({ item: { ...latest, painted: "Yes" } }), async (calls) => {
    const saved = await useOrderStore.getState().updateItem({ ...fixture, painted: "Yes" }, ColumnTitles.Painted);
    assert.deepEqual(calls[0]?.body?.updates, { painted: "Yes" });
    assert.deepEqual(calls[0]?.body?.expected, { painted: "" });
    assert.equal(saved.glued, "Yes");
    assert.equal(saved.searchText?.includes("alex lee"), true);
  });
});

test("a rejected save shows the stored version and tells the caller", async () => {
  const stored = { ...fixture, painted: "No" };
  await withStore({ items: [fixture] }, () => json({ error: "Changed elsewhere", item: stored }, 409), async () => {
    await assert.rejects(
      useOrderStore.getState().updateItem({ ...fixture, painted: "Yes" }, ColumnTitles.Painted),
      /Changed elsewhere/
    );
    assert.equal(useOrderStore.getState().items[0]?.painted, "No");
  });
});

test("a renamed order is found by its new name", async () => {
  const renamed = { ...fixture, customerName: "Jordan Park" };
  await withStore({ items: [{ ...fixture, searchText: "alex lee" }] }, () => json({ item: renamed }), async () => {
    const saved = await useOrderStore.getState().updateItem(renamed, ColumnTitles.Customer_Name);
    assert.equal(saved.searchText?.includes("jordan park"), true);
  });
});

test("a failed delete is reported to the caller", async () => {
  await withStore({ items: [fixture] }, () => json({ error: "nope" }, 500), async () => {
    await assert.rejects(useOrderStore.getState().deleteItem(fixture.id));
    assert.equal(useOrderStore.getState().items.length, 1);
  });
});

test("adding an order keeps orders that arrived while it was saving, without duplicates", async () => {
  const other = { ...fixture, id: "arrived-meanwhile" };
  await withStore({ items: [] }, (call) => {
    if (call.method === "POST") {
      // The live stream delivers another order and this one before the POST returns.
      useOrderStore.setState((state) => ({ items: [...state.items, other, { ...call.body, _id: "doc" } as unknown as Item] }));
      return json(call.body);
    }
    return json({});
  }, async () => {
    await useOrderStore.getState().addNewItem({ customerName: "New Order" });
    const ids = useOrderStore.getState().items.map((item) => item.id);
    assert.equal(ids.length, 2);
    assert.ok(ids.includes(other.id));
  });
});

test("dragging an order into Done moves it to the Done list", async () => {
  const other = { ...fixture, id: "other-order" };
  await withStore({ items: [fixture] }, (call) => {
    useOrderStore.setState((state) => ({ items: [...state.items, other] }));
    return json({ item: { ...fixture, ...call.body?.updates as object } });
  }, async () => {
    await useOrderStore.getState().reorderItems(fixture.id, ItemStatus.OnDeck, ItemStatus.Done, FIRST_INDEX);
    const state = useOrderStore.getState();
    assert.deepEqual(state.items.map((item) => item.id), [other.id]);
    assert.deepEqual(state.doneItems.map((item) => item.id), [fixture.id]);
  });
});

test("a slower, superseded Done page never overwrites the newer one", async () => {
  const stale = { ...fixture, id: "stale", status: ItemStatus.Done };
  const fresh = { ...fixture, id: "fresh", status: ItemStatus.Done };
  let request = 0;
  await withStore({ searchQuery: "" }, async () => {
    request += 1;
    if (request === 1) await new Promise((resolve) => setTimeout(resolve, DONE_PAGE_DELAY_MS));
    return json(request === 1 ? [stale] : [fresh]);
  }, async () => {
    const first = useOrderStore.getState().loadDoneItems(true);
    const second = useOrderStore.getState().loadDoneItems(true);
    await Promise.all([first, second]);
    assert.deepEqual(useOrderStore.getState().doneItems.map((item) => item.id), [fresh.id]);
    assert.equal(useOrderStore.getState().isDoneLoading, false);
  });
});

test("live inserts appear, hard deletes disappear, and a reconnect reloads the board", async () => {
  const originalWindow = globalThis.window;
  const originalEventSource = globalThis.EventSource;
  let stream: FakeEventSource;
  class FakeEventSource {
    onmessage: ((event: { data: string }) => void) | null = null;
    onopen: (() => void) | null = null;
    onerror: (() => void) | null = null;
    close() {}
    constructor() { stream = this; }
  }
  globalThis.window = {} as Window & typeof globalThis;
  globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;
  // loadItems starts the midnight clock; keep it from holding the test open.
  const originalSetInterval = globalThis.setInterval;
  globalThis.setInterval = ((...args: Parameters<typeof setInterval>) =>
    originalSetInterval(...args).unref()) as typeof setInterval;
  const inserted = { ...fixture, id: "inserted", _id: "doc-1" } as Item;
  try {
    await withStore({}, () => json([inserted]), async (calls) => {
      useOrderStore.getState().startWatchingChanges();
      stream!.onmessage!({ data: JSON.stringify({ type: "insert", itemId: inserted.id, item: inserted }) });
      assert.deepEqual(useOrderStore.getState().items.map((item) => item.id), [inserted.id]);
      stream!.onmessage!({ data: JSON.stringify({ type: "delete", documentId: "doc-1" }) });
      assert.deepEqual(useOrderStore.getState().items, []);

      const beforeError = stream!;
      beforeError.onopen!();
      assert.equal(calls.length, 0, "the first connection does not reload");
      beforeError.onerror!();
      useOrderStore.getState().startWatchingChanges();
      stream!.onopen!();
      do await new Promise((resolve) => setImmediate(resolve));
      while (useOrderStore.getState().isLoading);
      assert.ok(calls.some((call) => call.url.startsWith("/api/items?includeDone=false")));
    });
  } finally {
    useOrderStore.getState().stopWatchingChanges();
    globalThis.setInterval = originalSetInterval;
    globalThis.window = originalWindow;
    globalThis.EventSource = originalEventSource;
  }
});
