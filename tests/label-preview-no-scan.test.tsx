import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import TestRenderer, { act } from "react-test-renderer";
import type { useFutureLabelInventory } from "../hooks/useFutureLabelInventory";

const ORDER_ID = "raw-label-order";
const LABEL_ID = "unscanned-label";
const PAGE_NUMBER = 1;
const NO_SCANS = 0;
const ONE_SCAN = 1;
const JSON_HEADERS = { "Content-Type": "application/json" };

test("opening and refreshing incomplete labels is read-only; explicit retry scans", async () => {
  const originalFetch = globalThis.fetch;
  const scans: string[] = [];
  let inventory: ReturnType<typeof useFutureLabelInventory> | undefined;
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  let processingStatus = "pending";
  const record = () => ({
    id: LABEL_ID,
    orderId: ORDER_ID,
    pageNumber: PAGE_NUMBER,
    processingStatus,
  });
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/scan")) {
      scans.push(init?.method ?? "GET");
      return new Response(JSON.stringify({ label: record() }), { headers: JSON_HEADERS });
    }
    if (url.endsWith("/summary")) return new Response(JSON.stringify({ summaries: {} }), { headers: JSON_HEADERS });
    if (url.endsWith("/pdfs")) return new Response(JSON.stringify({ files: [] }), { headers: JSON_HEADERS });
    assert.match(url, /^\/api\/shipping\/labels\?orderId=/);
    return new Response(JSON.stringify({ labels: [record()] }), { headers: JSON_HEADERS });
  };
  const { useFutureLabelInventory } = await import("../hooks/useFutureLabelInventory");
  const { useShippingStore } = await import("../stores/useShippingStore");
  const { useTrackingStore } = await import("../stores/useTrackingStore");
  useShippingStore.getState().stopPolling();
  await new Promise<void>((resolve) => setImmediate(resolve));
  const shippingState = useShippingStore.getState();
  const trackingState = useTrackingStore.getState();
  useShippingStore.setState({ fetchAllLabels: async () => undefined });
  useTrackingStore.setState({ trackingInfo: [], fetchTrackingInfo: async () => undefined });
  function Preview() {
    inventory = useFutureLabelInventory(ORDER_ID);
    return createElement("span", null, inventory.labels.map((label) => label.id).join());
  }
  try {
    for (const status of ["pending", "needs_review", "scanning"]) {
      processingStatus = status;
      await act(async () => { renderer = TestRenderer.create(createElement(Preview)); });
      assert.equal(scans.length, NO_SCANS, `Opening ${status} labels must not analyze them`);
      assert.equal(inventory?.isLoading, false);
      assert.equal(renderer!.root.findByType("span").children.join(), LABEL_ID);
      await act(async () => { await inventory!.refresh(); });
      assert.equal(scans.length, NO_SCANS);
      act(() => renderer!.unmount());
    }
    await act(async () => { renderer = TestRenderer.create(createElement(Preview)); });
    await act(async () => { await inventory!.rescan(LABEL_ID); });
    assert.equal(scans.length, ONE_SCAN);
    assert.deepEqual(scans, ["POST"]);
  } finally {
    if (renderer) act(() => renderer!.unmount());
    globalThis.fetch = originalFetch;
    useShippingStore.setState(shippingState);
    useTrackingStore.setState(trackingState);
  }
});
