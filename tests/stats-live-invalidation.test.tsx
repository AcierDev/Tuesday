import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { invalidateStatsCaches, useAllItems, useActivities } from "../lib/stats-shared";
import { buildGluedEvents } from "../lib/production-metrics";
import { ItemStatus, type Item, type Activity } from "../typings/types";

const SQUARES = 100;
const EMPTY_COUNT = 0;
const ORDER_ID = "live-glued-order";
const JSON_HEADERS = { "Content-Type": "application/json" };
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: JSON_HEADERS });

function Counter() {
  const { items } = useAllItems();
  const { activities } = useActivities();
  const squares = buildGluedEvents(activities ?? [], items ?? []).reduce((sum, event) => sum + event.squares, EMPTY_COUNT);
  return React.createElement("span", null, squares);
}

test("glued counter updates after moving into each completed-gluing section without remounting", async () => {
  const originalFetch = globalThis.fetch;
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  const item = { id: ORDER_ID, size: "10x10", status: ItemStatus.Wip } as Item;
  let activities: Activity[] = [];
  globalThis.fetch = async input => String(input).startsWith("/api/items") ? json([item]) : json({ activities });
  try {
    for (const status of [ItemStatus.Packaging, ItemStatus.At_The_Door, ItemStatus.Done]) {
      item.status = ItemStatus.Wip;
      activities = [];
      invalidateStatsCaches();
      await act(async () => { renderer = TestRenderer.create(React.createElement(Counter)); });
      assert.equal(renderer!.root.findByType("span").children.join(), String(EMPTY_COUNT));
      item.status = status;
      activities = [{ itemId: ORDER_ID, type: "status_change", timestamp: Date.now(), changes: [{ field: "status", oldValue: ItemStatus.Wip, newValue: status }] } as Activity];
      await act(async () => { invalidateStatsCaches(); });
      assert.equal(renderer!.root.findByType("span").children.join(), String(SQUARES), status);
      act(() => renderer!.unmount());
    }
  } finally {
    if (renderer) act(() => renderer!.unmount());
    globalThis.fetch = originalFetch;
    invalidateStatsCaches();
  }
});

test("a request started before a move cannot restore stale cached items", async () => {
  const originalFetch = globalThis.fetch;
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  let resolveOld!: (response: Response) => void;
  let firstRequest = true;
  function Status() {
    const { items } = useAllItems();
    return React.createElement("span", null, items?.[EMPTY_COUNT]?.status ?? "loading");
  }
  globalThis.fetch = async () => {
    if (firstRequest) {
      firstRequest = false;
      return new Promise<Response>(resolve => { resolveOld = resolve; });
    }
    return json([{ id: ORDER_ID, status: ItemStatus.Done }]);
  };
  try {
    invalidateStatsCaches();
    await act(async () => { renderer = TestRenderer.create(React.createElement(Status)); });
    await act(async () => { invalidateStatsCaches(); });
    assert.equal(renderer!.root.findByType("span").children.join(), ItemStatus.Done);
    await act(async () => { resolveOld(json([{ id: ORDER_ID, status: ItemStatus.Packaging }])); });
    act(() => renderer!.unmount());
    await act(async () => { renderer = TestRenderer.create(React.createElement(Status)); });
    assert.equal(renderer!.root.findByType("span").children.join(), ItemStatus.Done);
  } finally {
    if (renderer) act(() => renderer!.unmount());
    globalThis.fetch = originalFetch;
    invalidateStatsCaches();
  }
});
