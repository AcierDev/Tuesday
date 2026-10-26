import assert from "node:assert/strict";
import { test } from "node:test";
import { useOrderStore } from "../stores/useOrderStore";
import { ItemStatus, type Item } from "../typings/types";

test("generic order edits adopt merged server shipping fields instead of replacing them with a partial correction", async () => {
  const originalFetch = globalThis.fetch;
  const originalState = useOrderStore.getState();
  const fixture = { id: "address-store-test", customerName: "Fixture", status: ItemStatus.New,
    createdAt: 0, index: 0, visible: true, deleted: false, notes: "Artwork note",
    shippingDetails: { name: "Recipient", street1: "Old Street", street2: "Unit 8", state: "Ontario", country: "CA" } } as Item;
  globalThis.fetch = async () => new Response(JSON.stringify({ matchedCount: 1, modifiedCount: 1,
    shippingDetails: { name: "Recipient", street1: "New Street", street2: "Unit 8", state: "Ontario", country: "CA" } }));
  try {
    useOrderStore.setState({ items: [fixture], scheduledItems: [], doneItems: [] });
    const result = await useOrderStore.getState().updateItem({ ...fixture, shippingDetails: { street1: "New Street" } as Item["shippingDetails"] });
    assert.equal(result.shippingDetails?.street2, "Unit 8");
    assert.equal(result.shippingDetails?.street1, "New Street");
    assert.equal(result.notes, "Artwork note");
    assert.equal(useOrderStore.getState().items[0]?.shippingDetails?.state, "Ontario");
  } finally { globalThis.fetch = originalFetch; useOrderStore.setState(originalState); }
});

test("editing another field omits unchanged legacy shipping metadata from the save", async () => {
  const originalFetch = globalThis.fetch;
  const originalState = useOrderStore.getState();
  const fixture = { id: "legacy-address-store", customerName: "Fixture", status: ItemStatus.New,
    createdAt: 0, index: 0, visible: true, deleted: false,
    shippingDetails: { name: "Legacy", country: "United States", street1: "Keep Street" } } as Item;
  let updates: Partial<Item> | undefined;
  globalThis.fetch = async (_url, options) => { updates = JSON.parse(String(options?.body)).updates; return new Response(JSON.stringify({ matchedCount: 1 })); };
  try {
    useOrderStore.setState({ items: [fixture], scheduledItems: [], doneItems: [] });
    const result = await useOrderStore.getState().updateItem({ ...fixture, notes: "Changed note" });
    assert.equal(Object.hasOwn(updates!, "shippingDetails"), false);
    assert.equal(result.shippingDetails?.country, "United States");
    assert.equal(result.shippingDetails?.street1, "Keep Street");
  } finally { globalThis.fetch = originalFetch; useOrderStore.setState(originalState); }
});
