import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React, { createElement } from "react";
import { PDFDocument } from "pdf-lib";
import TestRenderer, {
  act,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";

import type { ViewLabel as ViewLabelComponent } from "../components/shipping/ViewLabel";
import type { useShippingStore as ShippingStoreHook } from "../stores/useShippingStore";

const FUTURE_ORDER_ID = "future-order";
const EMPTY_ORDER_ID = "empty-order";
const ONE_LABEL = 1;
const ZERO_LABELS = 0;
const NOT_FOUND_INDEX = -1;
const PREVIEW_TIMEOUT_MS = 3000;
const PREVIEW_POLL_MS = 20;

const originalFetch = globalThis.fetch;
let ViewLabel: typeof ViewLabelComponent;
let useShippingStore: typeof ShippingStoreHook;

function buttonByLabel(
  renderer: ReactTestRenderer,
  label: string
): ReactTestInstance {
  const button = renderer.root.findAllByType("button").find((candidate) =>
    candidate
      .findAllByType("span")
      .some((span) => span.children.join("") === label)
  );
  assert.ok(button, `Missing button label: ${label}`);
  return button;
}

before(async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const pdfBytes = await pdf.save();
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.startsWith("https://")) throw new TypeError("Failed to fetch");
    if (url.endsWith("/pdf") || url.startsWith("/api/shipping/pdf/")) return new Response(new Uint8Array(pdfBytes));
    const body = url.includes("/summary")
      ? { summaries: {} }
      : url.includes("/labels?")
        ? { labels: [{
            id: "saved-label",
            orderId: FUTURE_ORDER_ID,
            pageNumber: ONE_LABEL,
            processingStatus: "ready",
            trackerId: "saved-tracker",
            tracker: { status: "in_transit" },
          }] }
        : { files: [] };
    return new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
    });
  };
  (globalThis as typeof globalThis & { React: typeof React }).React = React;

  ({ ViewLabel } = await import("../components/shipping/ViewLabel"));
  ({ useShippingStore } = await import("../stores/useShippingStore"));
  useShippingStore.getState().stopPolling();
  await new Promise<void>((resolve) => setImmediate(resolve));
});

after(() => {
  useShippingStore.getState().stopPolling();
  globalThis.fetch = originalFetch;
});

test("future-only orders can open the label view without an empty warning", async () => {
  useShippingStore.setState({
    labels: {},
    futureSummaries: {
      [FUTURE_ORDER_ID]: {
        total: ONE_LABEL,
        unused: ZERO_LABELS,
        used: ONE_LABEL,
        issues: ZERO_LABELS,
      },
    },
    isLoading: false,
    fetchAllLabels: async () => undefined,
  });

  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      createElement(ViewLabel, { orderId: FUTURE_ORDER_ID })
    );
  });

  assert.equal(buttonByLabel(renderer!, "View Labels").props.disabled, false);
  assert.equal(
    renderer!.root.findAll(
      (node) => node.children.indexOf("No Labels Found") !== NOT_FOUND_INDEX
    ).length,
    ZERO_LABELS
  );
  const deadline = Date.now() + PREVIEW_TIMEOUT_MS;
  while (!renderer!.root.findAllByType("iframe").length && Date.now() < deadline) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, PREVIEW_POLL_MS));
    });
  }
  const previews = renderer!.root.findAllByType("iframe");
  assert.equal(previews.length, ONE_LABEL);
  const preview = previews[ZERO_LABELS];
  assert.ok(preview);
  assert.match(preview.props.src, /^blob:/);
  assert.equal(
    renderer!.root.findAllByProps({ "aria-label": "Individual shipping labels" }).length,
    ZERO_LABELS
  );
  act(() => renderer!.unmount());
});

test("orders without any labels keep the label view disabled", async () => {
  useShippingStore.setState({
    labels: {},
    futureSummaries: {},
    isLoading: false,
    fetchAllLabels: async () => undefined,
  });

  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      createElement(ViewLabel, { orderId: EMPTY_ORDER_ID })
    );
  });

  assert.equal(buttonByLabel(renderer!, "View Labels").props.disabled, true);
  act(() => renderer!.unmount());
});


test("legacy labels combine through the same-origin proxy even with S3 config loaded", async () => {
  const legacyOrderId = "legacy-order";
  const expectedPages = 2;
  useShippingStore.setState({
    labels: { [legacyOrderId]: ["legacy-order.pdf", "legacy-order-1.pdf"] },
    s3Config: { bucket: "labels", region: "us-east-1" },
    futureSummaries: {},
    isLoading: false,
    fetchAllLabels: async () => undefined,
  });
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(ViewLabel, { orderId: legacyOrderId }));
  });
  const deadline = Date.now() + PREVIEW_TIMEOUT_MS;
  while (!renderer!.root.findAllByType("iframe").length && Date.now() < deadline) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, PREVIEW_POLL_MS));
    });
  }
  try {
    const preview = renderer!.root.findByType("iframe");
    const response = await originalFetch(preview.props.src);
    const merged = await PDFDocument.load(await response.arrayBuffer());
    assert.equal(merged.getPageCount(), expectedPages);
  } finally {
    act(() => renderer!.unmount());
  }
});
