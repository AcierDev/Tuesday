import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { PDFDocument } from "pdf-lib";
import { CombinedLabelPreview } from "../components/shipping/CombinedLabelPreview";

const PAGE_COUNT = 3;
const TIMEOUT_MS = 3000;
const POLL_MS = 20;

test("label navigation advances through PDF pages and stops at either end", async () => {
  const originalFetch = globalThis.fetch;
  const pdf = await PDFDocument.create();
  for (let page = 0; page < PAGE_COUNT; page++) pdf.addPage();
  const bytes = await pdf.save();
  globalThis.fetch = async () => new Response(new Uint8Array(bytes));
  (globalThis as typeof globalThis & { React: typeof React }).React = React;
  let renderer: TestRenderer.ReactTestRenderer;
  try {
    await act(async () => {
      renderer = TestRenderer.create(<CombinedLabelPreview urls={["/labels.pdf"]} height="600px" orderId="order" />);
    });
    const deadline = Date.now() + TIMEOUT_MS;
    while (!renderer!.root.findAllByType("iframe").length && Date.now() < deadline) {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, POLL_MS)); });
    }
    const next = () => renderer!.root.findByProps({ "aria-label": "Next label" });
    const previous = () => renderer!.root.findByProps({ "aria-label": "Previous label" });
    assert.equal(previous().props.disabled, true);
    for (let page = 2; page <= PAGE_COUNT; page++) {
      act(() => next().props.onClick());
      assert.ok(renderer!.root.findByType("iframe").props.src.endsWith(`#page=${page}`));
    }
    assert.equal(next().props.disabled, true);
    act(() => previous().props.onClick());
    assert.ok(renderer!.root.findByType("iframe").props.src.endsWith("#page=2"));
  } finally {
    act(() => renderer!.unmount());
    globalThis.fetch = originalFetch;
  }
});
