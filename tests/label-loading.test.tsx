import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { PDFDocument } from "pdf-lib";

import { CombinedLabelPreview } from "../components/shipping/CombinedLabelPreview";
import { s3Client } from "../lib/s3-client";
import { listAllLabels } from "../lib/s3-client";
import { ensureShippingLabelIndexes } from "../lib/shipping-labels/repository";
import { useShippingStore } from "../stores/useShippingStore";

const TIMEOUT_MS = 6000;
const POLL_MS = 20;
const HTTP_SERVER_ERROR = 503;
const HTTP_NOT_FOUND = 404;

(globalThis as typeof globalThis & { React: typeof React }).React = React;

async function onePagePdf() {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  return pdf.save();
}

async function until(condition: () => boolean) {
  const deadline = Date.now() + TIMEOUT_MS;
  while (!condition() && Date.now() < deadline) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, POLL_MS)); });
  }
}

test("the preview retries a failing label download by itself", async () => {
  const originalFetch = globalThis.fetch;
  const bytes = await onePagePdf();
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 1) throw new TypeError("network error");
    if (calls === 2) return new Response("busy", { status: HTTP_SERVER_ERROR });
    return new Response(new Uint8Array(bytes));
  };
  let renderer: TestRenderer.ReactTestRenderer;
  try {
    await act(async () => {
      renderer = TestRenderer.create(<CombinedLabelPreview urls={["/a.pdf"]} height="600px" orderId="o" />);
    });
    await until(() => renderer!.root.findAllByType("iframe").length > 0);
    assert.equal(renderer!.root.findAllByType("iframe").length, 1);
    assert.equal(calls, 3);
  } finally {
    act(() => renderer!.unmount());
    globalThis.fetch = originalFetch;
  }
});

test("a missing label fails at once with a Try again button that reloads", async () => {
  const originalFetch = globalThis.fetch;
  const bytes = await onePagePdf();
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return calls === 1 ? new Response("{}", { status: HTTP_NOT_FOUND }) : new Response(new Uint8Array(bytes));
  };
  let renderer: TestRenderer.ReactTestRenderer;
  try {
    await act(async () => {
      renderer = TestRenderer.create(<CombinedLabelPreview urls={["/a.pdf"]} height="600px" orderId="o" />);
    });
    await until(() => renderer!.root.findAllByProps({ role: "alert" }).length > 0);
    assert.equal(calls, 1, "a 404 is not retried");
    const retry = renderer!.root.findByType("button");
    await act(async () => { retry.props.onClick(); });
    await until(() => renderer!.root.findAllByType("iframe").length > 0);
    assert.equal(renderer!.root.findAllByType("iframe").length, 1);
  } finally {
    act(() => renderer!.unmount());
    globalThis.fetch = originalFetch;
  }
});

function installShippingFetch() {
  const requests: string[] = [];
  const originalFetch = globalThis.fetch;
  const waiting: Array<() => void> = [];
  const gate = () => new Promise<void>((resolve) => { waiting.push(resolve); });
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    requests.push(url);
    await gate();
    const body = url === "/api/shipping/pdfs" ? { files: ["a.pdf"] } : { summaries: {} };
    return new Response(JSON.stringify(body));
  }) as typeof fetch;
  return {
    requests,
    release: () => waiting.splice(0).forEach((resolve) => resolve()),
    restore: () => { globalThis.fetch = originalFetch; },
  };
}

test("label refreshes share one request and never disable the barcode buttons after the first load", async () => {
  const net = installShippingFetch();
  try {
    useShippingStore.setState({ isLoading: false, labels: {}, futureSummaries: {}, labelVersions: {} });
    const { fetchAllLabels } = useShippingStore.getState();

    // First load: shows loading; three callers share one pair of requests.
    const first = [fetchAllLabels(), fetchAllLabels(), fetchAllLabels()];
    assert.equal(useShippingStore.getState().isLoading, true);
    await new Promise((resolve) => setImmediate(resolve));
    net.release();
    await Promise.all(first);
    assert.equal(net.requests.length, 2);
    assert.equal(useShippingStore.getState().isLoading, false);
    assert.deepEqual(useShippingStore.getState().labels, { a: ["a.pdf"] });

    // A refresh right after reuses the listing; a forced one (poll, purchase) refetches silently.
    await fetchAllLabels();
    assert.equal(net.requests.length, 2);
    const forced = fetchAllLabels({ force: true });
    assert.equal(useShippingStore.getState().isLoading, false, "buttons stay enabled during a refresh");
    await new Promise((resolve) => setImmediate(resolve));
    net.release();
    await forced;
    assert.equal(net.requests.length, 4);
    assert.equal(useShippingStore.getState().isLoading, false);
  } finally {
    net.restore();
  }
});

test("a failed refresh keeps the labels already on screen", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => new Response("{}", { status: HTTP_SERVER_ERROR })) as typeof fetch;
    useShippingStore.setState({ labels: { keep: ["keep.pdf"] }, isLoading: false });
    await useShippingStore.getState().fetchAllLabels({ force: true });
    assert.deepEqual(useShippingStore.getState().labels, { keep: ["keep.pdf"] });
    assert.equal(useShippingStore.getState().isLoading, false);
    assert.ok(useShippingStore.getState().error);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("the S3 listing follows continuation tokens and skips the label sub-folders", async () => {
  const sent: Array<Record<string, unknown>> = [];
  const pages = [
    { Contents: [{ Key: "a.pdf" }, { Key: "b.txt" }], IsTruncated: true, NextContinuationToken: "t1" },
    { Contents: [{ Key: "c-12.pdf" }], IsTruncated: true, NextContinuationToken: "t2" },
    { Contents: [{ Key: "d.pdf" }], IsTruncated: false },
  ];
  const originalSend = s3Client.send.bind(s3Client);
  (s3Client as unknown as { send: (command: { input: Record<string, unknown> }) => Promise<unknown> }).send =
    async (command) => { sent.push(command.input); return pages[sent.length - 1]; };
  try {
    assert.deepEqual(await listAllLabels(), ["a.pdf", "c-12.pdf", "d.pdf"]);
    assert.deepEqual(sent.map((input) => input.ContinuationToken), [undefined, "t1", "t2"]);
    assert.ok(sent.every((input) => input.Delimiter === "/"));
  } finally {
    (s3Client as unknown as { send: typeof originalSend }).send = originalSend;
  }
});

test("shipping-label indexes are created once per process and a failure is retried later", async () => {
  let createCalls = 0;
  let failNext = true;
  const collection = {
    createIndex: async () => {
      createCalls++;
      if (failNext) { failNext = false; throw new Error("index build failed"); }
      return "ok";
    },
  };
  const db = { collection: () => collection } as never;
  const originalError = console.error;
  console.error = () => undefined;
  try {
    await ensureShippingLabelIndexes(db);          // fails quietly, does not throw
    const afterFailure = createCalls;
    await ensureShippingLabelIndexes(db);          // retried
    const afterRetry = createCalls;
    await ensureShippingLabelIndexes(db);          // memoized
    await ensureShippingLabelIndexes(db);
    assert.ok(afterFailure >= 1 && afterRetry > afterFailure);
    assert.equal(createCalls, afterRetry);
  } finally {
    console.error = originalError;
  }
});
