import assert from "node:assert/strict";
import { test } from "node:test";
import React, { createElement } from "react";
import TestRenderer, { act } from "react-test-renderer";

import type { Item } from "../typings/types";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function textOf(node: TestRenderer.ReactTestInstance): string {
  return node.children
    .map((child) => (typeof child === "string" ? child : textOf(child)))
    .join("");
}

function buttonsText(renderer: TestRenderer.ReactTestRenderer): string[] {
  return renderer.root.findAllByType("button").map(textOf);
}

function buttonWithText(renderer: TestRenderer.ReactTestRenderer, text: string) {
  return renderer.root.findAllByType("button").find((button) => textOf(button).includes(text));
}

test("purchased FedEx labels list retry and confirm-guarded void actions", async () => {
  const { PurchasedLabelsPanel } = await import("../components/shipping/PurchasedLabelsPanel");
  const { useOrderStore } = await import("../stores/useOrderStore");
  const { useShippingStore } = await import("../stores/useShippingStore");
  const { useTrackingStore } = await import("../stores/useTrackingStore");
  // The panel refreshes these after a void; keep them local to the test.
  useOrderStore.setState({ loadItems: async () => undefined });
  useShippingStore.setState({ fetchAllLabels: async () => undefined });
  useTrackingStore.setState({ fetchTrackingInfo: async () => undefined });
  const requests: { url: string; body: unknown }[] = [];
  const originalFetch = globalThis.fetch;
  const originalConfirm = (globalThis as { confirm?: unknown }).confirm;
  let confirmAnswer = false;
  (globalThis as { window?: unknown }).window = globalThis;
  (globalThis as { confirm?: unknown }).confirm = () => confirmAnswer;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response(JSON.stringify({ message: "ok", warnings: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const item = {
      id: "order-1",
      status: "Done",
      purchasedShipments: [
        {
          id: "p1",
          source: "fedex-api",
          trackingNumber: "794600000001",
          trackingNumbers: ["794600000001", "794600000002"],
          totalNetCharge: 62.4,
          currency: "USD",
          purchasedAt: Date.UTC(2026, 9, 26),
          serviceName: "Fedex Ground",
          labelStatus: "failed",
          labelError: "S3 unavailable",
          trackerStatus: "done",
        },
      ],
    } as unknown as Item;

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(createElement(PurchasedLabelsPanel, { item }));
    });
    const labels = buttonsText(renderer!);
    assert.ok(labels.some((label) => label.includes("Retry")), labels.join("|"));
    assert.ok(labels.some((label) => label.includes("Void label")), labels.join("|"));

    const voidButton = buttonWithText(renderer!, "Void label");
    await act(async () => {
      voidButton?.props.onClick();
    });
    assert.equal(requests.length, 0, "declining the confirm sends nothing");

    confirmAnswer = true;
    await act(async () => {
      voidButton?.props.onClick();
    });
    const voidRequest = requests.find((request) => request.url === "/api/shipping/fedex/cancel");
    assert.deepEqual(voidRequest?.body, {
      orderId: "order-1",
      trackingNumber: "794600000001",
    });
    act(() => renderer!.unmount());
  } finally {
    globalThis.fetch = originalFetch;
    (globalThis as { confirm?: unknown }).confirm = originalConfirm;
  }
});
