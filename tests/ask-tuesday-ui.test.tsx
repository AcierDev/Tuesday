import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { createRequire, Module } from "node:module";
import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import type { AskTuesdayResponse, TuesdayScanResponse } from "../lib/ask-tuesday/types";
import { ASK_TUESDAY } from "../config/ask-tuesday";

const require = createRequire(import.meta.url);
const originalFetch = globalThis.fetch;
let AskTuesday: typeof import("../components/ask-tuesday/AskTuesday").AskTuesday;
let AskTuesdayResults: typeof import("../components/ask-tuesday/AskTuesdayResults").AskTuesdayResults;
let pathname = "/orders";
let searchQuery = "Jane";
let navigatedTo = "";
let selectedOrder = "";
let inputFocusCount = 0;
let triggerFocusCount = 0;

const response: AskTuesdayResponse = {
  mode: "record-search", summary: "One order and one saved conversation match Jane.",
  page: "/orders", totalMatches: 2,
  results: [{
    kind: "order", key: "order-123", title: "Jane · order 123", detail: "Done · Mint",
    facts: ["Paused: no"], sources: [], orderId: "123", observedAt: null,
    observedPrecision: "date", uncertainty: ["Shipment delivery is unverified."],
  }, {
    kind: "conversation", key: "thread-1", title: "Jane · saved conversation",
    detail: "Saved conversation evidence", facts: [],
    sources: [{ label: "Etsy thread", href: "https://www.etsy.com/messages/1" }],
    observedAt: "2026-10-01T15:00:00Z", observedPrecision: "time",
    uncertainty: ["Earlier conversation history is missing."],
    agreements: [
      { status: "proposal", text: "Blue was proposed.", messageIds: ["m1"] },
      { status: "superseded", text: "The initial size was replaced.", messageIds: ["m1"] },
      { status: "final", text: "Mint was agreed.", messageIds: ["m2"] },
    ],
    messages: [
      { id: "m1", sentAt: "2026-09-29T12:00:00Z", sender: "seller", text: "Would you prefer blue?" },
      { id: "m2", sentAt: "2026-10-01T14:00:00Z", sender: "buyer", text: "Please use mint." },
    ],
  }],
  freshness: {
    ordersCheckedAt: "2026-10-06T18:00:00Z", activitiesCheckedAt: null,
    reviewObservedOn: "2026-10-01", sourceUpdatedAt: "2026-10-02T12:00:00Z",
    importedAt: "2026-10-06T17:00:00Z",
  },
  capabilities: { inference: "unavailable", liveEtsy: "unavailable", savedConversations: "available" },
  limitations: ["Saved reviews can be incomplete."],
};

const automaticScan: TuesdayScanResponse = {
  mode: "issue-scan", checkedAt: "2026-10-06T18:00:00Z", status: "checked",
  totalIssues: 1,
  issues: [{ ...response.results[0]!, key: "requirements:123", rule: "requirements-check", severity: "review",
    detail: "Saved artwork requirements need double check.", observedAt: "2026-10-06T18:00:00Z", observedPrecision: "time" }],
  freshness: response.freshness, capabilities: response.capabilities, limitations: response.limitations,
};

function installVisibleWindow() {
  const globals = globalThis as unknown as Record<string, unknown>;
  const previousWindow = globals.window;
  const previousDocument = globals.document;
  const windowEvents = new EventTarget();
  const documentEvents = Object.assign(new EventTarget(), { visibilityState: "visible" });
  globals.window = windowEvents;
  globals.document = documentEvents;
  return {
    focus: () => windowEvents.dispatchEvent(new Event("focus")),
    visibility: (value: "visible" | "hidden") => {
      documentEvents.visibilityState = value;
      documentEvents.dispatchEvent(new Event("visibilitychange"));
    },
    restore: () => { globals.window = previousWindow; globals.document = previousDocument; },
  };
}

before(async () => {
  // Next navigation requires an app router. Replace that external boundary;
  // retain the real popup, form state, requests, and result rendering.
  const navigationPath = require.resolve("next/navigation");
  const navigationModule = new Module(navigationPath);
  navigationModule.loaded = true;
  navigationModule.exports = {
    usePathname: () => pathname,
    useRouter: () => ({ push: (path: string) => { navigatedTo = path; } }),
  };
  require.cache[navigationPath] = navigationModule;
  const storePath = require.resolve("../stores/useOrderStore");
  const storeModule = new Module(storePath);
  storeModule.loaded = true;
  storeModule.exports = {
    useOrderStore: (selector: (state: unknown) => unknown) => selector({
      searchQuery, setSearchQuery: (value: string) => { selectedOrder = value; },
    }),
  };
  require.cache[storePath] = storeModule;
  (globalThis as typeof globalThis & { React: typeof React }).React = React;
  ({ AskTuesday } = await import("../components/ask-tuesday/AskTuesday"));
  ({ AskTuesdayResults } = await import("../components/ask-tuesday/AskTuesdayResults"));
});

after(() => { globalThis.fetch = originalFetch; });

function renderPopup() {
  return TestRenderer.create(<AskTuesday />, {
    createNodeMock: (element) => ({
      focus: () => {
        if (element.type === "textarea") inputFocusCount += 1;
        if (element.type === "button" && element.props["aria-label"] === "Open Ask Tuesday") triggerFocusCount += 1;
      },
      scrollIntoView: () => undefined,
    }),
  });
}

function open(renderer: ReactTestRenderer) {
  act(() => renderer.root.findByProps({ "aria-label": "Open Ask Tuesday" }).props.onClick());
}

async function submit(renderer: ReactTestRenderer, question: string) {
  act(() => renderer.root.findByType("textarea").props.onChange({ target: { value: question } }));
  await act(async () => renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }));
}

function visibleText(renderer: ReactTestRenderer) {
  return JSON.stringify(renderer.toJSON());
}

test("automatic checks update the closed badge without opening the popup or submitting a search", async () => {
  const browser = installVisibleWindow();
  let scanCalls = 0;
  let searchCalls = 0;
  globalThis.fetch = async (url, options) => {
    if (url === ASK_TUESDAY.scanEndpoint) {
      scanCalls += 1;
      assert.equal(options?.method, "GET");
      assert.equal(options?.body, undefined);
      return Response.json(automaticScan);
    }
    searchCalls += 1;
    return Response.json(response);
  };
  inputFocusCount = 0;
  triggerFocusCount = 0;
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = renderPopup(); });
  try {
    assert.equal(renderer!.root.findAllByProps({ role: "region" }).length, 0);
    assert.equal(scanCalls, 1);
    assert.equal(searchCalls, 0);
    assert.equal(renderer!.root.findByProps({ "aria-label": "Automatic check status" }).children.join(""), "1");
    assert.doesNotMatch(visibleText(renderer!), /Saved artwork requirements need double check/);
    open(renderer!);
    assert.equal(inputFocusCount, 1);
    const region = renderer!.root.findByProps({ role: "region", "aria-label": "Ask Tuesday" });
    assert.equal(region.props["aria-modal"], undefined);
    assert.match(visibleText(renderer!), /Automatic issue checks/);
    assert.match(visibleText(renderer!), /live Etsy messages aren’t connected/i);
    assert.ok(renderer!.root.findByProps({ "aria-label": "Automatic issues" }));
    assert.match(visibleText(renderer!), /Saved artwork requirements need double check/);
    act(() => region.props.onKeyDown({ key: "Escape", preventDefault() {}, stopPropagation() {} }));
    assert.equal(renderer!.root.findAllByProps({ role: "region" }).length, 0);
    assert.equal(triggerFocusCount, 1);
    assert.equal(searchCalls, 0);
  } finally { act(() => renderer!.unmount()); browser.restore(); }
});

test("questions carry actual page and order filter context and render returned records", async () => {
  pathname = "/orders";
  searchQuery = "Jane";
  let payload: unknown;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/ask-tuesday");
    assert.equal(options?.method, "POST");
    payload = JSON.parse(options?.body as string);
    return Response.json(response);
  };
  let renderer: ReactTestRenderer;
  act(() => { renderer = renderPopup(); });
  try {
    open(renderer!);
    await submit(renderer!, "  Jane's latest agreement?  ");
    assert.deepEqual(payload, { question: "Jane's latest agreement?", page: "/orders", orderSearch: "Jane" });
    assert.match(visibleText(renderer!), /One order and one saved conversation match Jane/);
    assert.match(visibleText(renderer!), /Saved reviews can be incomplete/);
    navigatedTo = "";
    selectedOrder = "";
    act(() => renderer!.root.findByProps({ "aria-label": "Open order 123" }).props.onClick());
    assert.equal(selectedOrder, "123");
    assert.equal(navigatedTo, "/orders");
    assert.equal(renderer!.root.findAllByProps({ role: "region" }).length, 1);
  } finally { act(() => renderer!.unmount()); }
});

test("page suggestions omit stale order filters on other pages", async () => {
  pathname = "/production-planning";
  searchQuery = "Jane";
  let payload: unknown;
  globalThis.fetch = async (_url, options) => {
    payload = JSON.parse(options?.body as string);
    return Response.json({ ...response, page: pathname, results: [] });
  };
  let renderer: ReactTestRenderer;
  act(() => { renderer = renderPopup(); });
  try {
    open(renderer!);
    act(() => renderer!.root.findByProps({ "aria-label": "Show record search" }).props.onClick());
    await act(async () => renderer!.root.findByProps({ "aria-label": "Search current page" }).props.onClick());
    assert.deepEqual(payload, { question: "What matters on this page?", page: "/production-planning" });
  } finally { act(() => renderer!.unmount()); pathname = "/orders"; }
});

test("pending searches prevent duplicate sends and failures can retry the same question", async () => {
  let calls = 0;
  let finish!: (value: Response) => void;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) return new Promise<Response>((resolve) => { finish = resolve; });
    return Response.json(response);
  };
  let renderer: ReactTestRenderer;
  act(() => { renderer = renderPopup(); });
  try {
    open(renderer!);
    await submit(renderer!, "Jane");
    assert.match(visibleText(renderer!), /Checking records/);
    assert.equal(renderer!.root.findByProps({ "aria-label": "Search records" }).props.disabled, true);
    await submit(renderer!, "Jane again");
    assert.equal(calls, 1);
    await act(async () => finish(Response.json({ error: "Order records are unavailable." }, { status: 503 })));
    assert.match(visibleText(renderer!), /Order records are unavailable/);
    await act(async () => renderer!.root.findByProps({ "aria-label": "Retry search" }).props.onClick());
    assert.equal(calls, 2);
    assert.equal(renderer!.root.findAllByProps({ "data-search-turn": true }).length, 1);
    assert.match(visibleText(renderer!), /One order and one saved conversation/);
  } finally { act(() => renderer!.unmount()); }
});

test("unmount aborts the active records request", async () => {
  let signal: AbortSignal | undefined;
  globalThis.fetch = async (_url, options) => {
    signal = options?.signal ?? undefined;
    return new Promise<Response>((_resolve, reject) => signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
  };
  let renderer: ReactTestRenderer;
  act(() => { renderer = renderPopup(); });
  open(renderer!);
  await submit(renderer!, "Jane");
  await act(async () => renderer!.unmount());
  assert.equal(signal?.aborted, true);
});

test("a stalled request aborts at the configured timeout and offers retry", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let signal: AbortSignal | undefined;
  globalThis.fetch = async (_url, options) => {
    signal = options?.signal ?? undefined;
    return new Promise<Response>((_resolve, reject) => signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
  };
  let renderer: ReactTestRenderer;
  act(() => { renderer = renderPopup(); });
  try {
    open(renderer!);
    await submit(renderer!, "Jane");
    await act(async () => context.mock.timers.tick(ASK_TUESDAY.requestTimeoutMs));
    assert.equal(signal?.aborted, true);
    assert.match(visibleText(renderer!), /Search timed out/);
    assert.equal(renderer!.root.findByProps({ "aria-label": "Retry search" }).props.disabled, false);
  } finally { act(() => renderer!.unmount()); context.mock.timers.reset(); }
});

test("results distinguish saved observations from live checks and link agreement quotes", () => {
  const renderer = TestRenderer.create(<AskTuesdayResults response={response} referencePrefix="turn-one" onOpenOrder={() => undefined} />);
  try {
    const text = visibleText(renderer);
    assert.match(text, /Live orders checked/);
    assert.match(text, /Saved review observed/);
    assert.match(text, /Earlier conversation history is missing/);
    assert.match(text, /Shipment delivery is unverified/);
    for (const status of ["Final agreement", "Proposal", "Superseded agreement"]) assert.match(text, new RegExp(status));
    const quotes = renderer.root.findAllByType("blockquote");
    assert.equal(quotes.length, 2);
    assert.match(JSON.stringify(quotes.map((quote) => quote.children)), /Please use mint/);
    const quoteContainer = quotes.find((quote) => quote.children.includes("Please use mint."))?.parent;
    assert.ok(quoteContainer?.props.id);
    const finalCitation = renderer.root.findAllByType("a").find((link) => link.props.href === `#${quoteContainer.props.id}`);
    assert.ok(finalCitation);
    assert.ok(renderer.root.findAllByType("time").some((node) => node.props.dateTime === "2026-10-01"));
    assert.ok(renderer.root.findAllByType("time").some((node) => node.props.dateTime === "2026-10-06T18:00:00Z"));
  } finally { renderer.unmount(); }
});

test("coverage limits remain accessible without pushing matching records below a long list", () => {
  const renderer = TestRenderer.create(<AskTuesdayResults response={response} referencePrefix="coverage-turn" onOpenOrder={() => undefined} />);
  try {
    const limits = renderer.root.findByProps({ "aria-label": "All coverage limits" });
    assert.equal(limits.type, "details");
    assert.notEqual(limits.props.open, true);
    assert.ok(limits.findAllByType("li").some((node) => node.children.includes("Saved reviews can be incomplete.")));
    assert.ok(renderer.root.findByProps({ "aria-label": "Source availability" }));
    assert.equal(renderer.root.findAllByType("article").length, 2);
  } finally { renderer.unmount(); }
});

test("automatic polling skips hidden tabs, resumes on visibility, and never overlaps requests", async (context) => {
  context.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });
  const browser = installVisibleWindow();
  const requests: { signal: AbortSignal; finish: (value: Response) => void }[] = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(url, ASK_TUESDAY.scanEndpoint);
    return new Promise<Response>((resolve, reject) => {
      const signal = options?.signal as AbortSignal;
      requests.push({ signal, finish: resolve });
      signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    });
  };
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = renderPopup(); });
  try {
    assert.equal(requests.length, 1);
    await act(async () => { browser.focus(); browser.focus(); });
    assert.equal(requests.length, 1);
    await act(async () => requests[0]!.finish(Response.json(automaticScan)));
    await act(async () => { browser.visibility("hidden"); context.mock.timers.tick(ASK_TUESDAY.scanIntervalMs); });
    assert.equal(requests.length, 1);
    await act(async () => { browser.visibility("visible"); browser.focus(); });
    assert.equal(requests.length, 2);
    await act(async () => requests[1]!.finish(Response.json({ ...automaticScan, totalIssues: 2,
      issues: [...automaticScan.issues, { ...automaticScan.issues[0]!, key: "requirements:456", orderId: "456" }],
    })));
    assert.equal(renderer!.root.findByProps({ "aria-label": "Automatic check status" }).children.join(""), "2");
    await act(async () => context.mock.timers.tick(ASK_TUESDAY.scanIntervalMs));
    assert.equal(requests.length, 3);
    await act(async () => renderer!.unmount());
    assert.equal(requests[2]?.signal.aborted, true);
    await act(async () => { browser.focus(); context.mock.timers.tick(ASK_TUESDAY.scanIntervalMs); });
    assert.equal(requests.length, 3);
  } finally { act(() => renderer!.unmount()); browser.restore(); context.mock.timers.reset(); }
});

test("failed refreshes preserve dated findings and partial checks never claim all clear", async () => {
  const browser = installVisibleWindow();
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 2) throw new Error("offline");
    if (calls === 3) return Response.json({ ...automaticScan, status: "partial", issues: [], totalIssues: 0,
      limitations: ["Order coverage is incomplete."],
    });
    return Response.json(automaticScan);
  };
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = renderPopup(); });
  try {
    await act(async () => { browser.focus(); });
    open(renderer!);
    assert.match(visibleText(renderer!), /Last successful/);
    assert.match(visibleText(renderer!), /Saved artwork requirements need double check/);
    assert.equal(renderer!.root.findByProps({ "aria-label": "Automatic check status" }).children.join(""), "?");
    await act(async () => renderer!.root.findByProps({ "aria-label": "Retry automatic checks" }).props.onClick());
    assert.match(visibleText(renderer!), /Coverage is incomplete/);
    assert.doesNotMatch(visibleText(renderer!), /all clear/i);
    assert.equal(renderer!.root.findByProps({ "aria-label": "Automatic check status" }).children.join(""), "?");
  } finally { act(() => renderer!.unmount()); browser.restore(); }
});

test("automatic request timeout shows unknown status with retry instead of a zero badge", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  const browser = installVisibleWindow();
  let signal: AbortSignal | undefined;
  globalThis.fetch = async (_url, options) => {
    signal = options?.signal ?? undefined;
    return new Promise<Response>((_resolve, reject) => signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
  };
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = renderPopup(); });
  try {
    await act(async () => context.mock.timers.tick(ASK_TUESDAY.requestTimeoutMs));
    assert.equal(signal?.aborted, true);
    assert.equal(renderer!.root.findAllByProps({ role: "region" }).length, 0);
    assert.equal(renderer!.root.findByProps({ "aria-label": "Automatic check status" }).children.join(""), "?");
    open(renderer!);
    assert.match(visibleText(renderer!), /Automatic check timed out/);
    assert.ok(renderer!.root.findByProps({ "aria-label": "Retry automatic checks" }));
    assert.doesNotMatch(visibleText(renderer!), /all clear/i);
  } finally { act(() => renderer!.unmount()); browser.restore(); context.mock.timers.reset(); }
});

test("an inconsistent successful scan response cannot turn listed issues into a zero badge", async () => {
  const browser = installVisibleWindow();
  globalThis.fetch = async () => Response.json({ ...automaticScan, totalIssues: 0 });
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = renderPopup(); });
  try {
    assert.equal(renderer!.root.findByProps({ "aria-label": "Automatic check status" }).children.join(""), "?");
    open(renderer!);
    assert.match(visibleText(renderer!), /Automatic check results were incomplete/);
    assert.doesNotMatch(visibleText(renderer!), /No issues detected/);
  } finally { act(() => renderer!.unmount()); browser.restore(); }
});
