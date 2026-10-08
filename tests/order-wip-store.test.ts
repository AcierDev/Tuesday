import assert from "node:assert/strict";
import { test } from "node:test";
import { useOrderStore } from "../stores/useOrderStore";
import { ItemStatus, type Item } from "../typings/types";

const originalFetch = globalThis.fetch;
const fixture: Item = {
  id: "wip-store-fixture", customerName: "Fixture", status: ItemStatus.OnDeck,
  createdAt: 0, index: 0, visible: true, deleted: false, isWip: true,
};

test("a section move clears WIP in both the save payload and the immediate board state", async () => {
  const originalState = useOrderStore.getState();
  let saved: Partial<Item> | undefined;
  globalThis.fetch = async (_url, options) => {
    if (options?.method === "PATCH") saved = JSON.parse(String(options.body)).updates;
    return new Response(JSON.stringify({ matchedCount: 1, modifiedCount: 1 }));
  };
  try {
    useOrderStore.setState({ items: [fixture], doneItems: [], scheduledItems: [] });
    await useOrderStore.getState().updateItem({ ...fixture, status: ItemStatus.Packaging });
    assert.equal(saved?.isWip, false);
    assert.equal(useOrderStore.getState().items.find(i => i.id === fixture.id)?.isWip, false);
    assert.equal(useOrderStore.getState().items.find(i => i.id === fixture.id)?.status, ItemStatus.Packaging);
  } finally {
    globalThis.fetch = originalFetch;
    useOrderStore.setState(originalState);
  }
});

test("reordering inside the same section preserves WIP but moving elsewhere clears it", async () => {
  const originalState = useOrderStore.getState();
  const saved: Partial<Item>[] = [];
  globalThis.fetch = async (_url, options) => {
    if (options?.method === "PATCH") saved.push(JSON.parse(String(options.body)).updates);
    return new Response(JSON.stringify({ matchedCount: 1, modifiedCount: 1 }));
  };
  const FIRST_INDEX = 0;
  try {
    useOrderStore.setState({ items: [fixture], doneItems: [], scheduledItems: [] });
    await useOrderStore.getState().reorderItems(fixture.id, ItemStatus.OnDeck, ItemStatus.OnDeck, FIRST_INDEX);
    assert.equal(useOrderStore.getState().items.find(i => i.id === fixture.id)?.isWip, true);
    await useOrderStore.getState().reorderItems(fixture.id, ItemStatus.OnDeck, ItemStatus.Packaging, FIRST_INDEX);
    assert.equal(saved.at(-1)?.isWip, false);
    assert.equal(useOrderStore.getState().items.find(i => i.id === fixture.id)?.isWip, false);
  } finally {
    globalThis.fetch = originalFetch;
    useOrderStore.setState(originalState);
  }
});
