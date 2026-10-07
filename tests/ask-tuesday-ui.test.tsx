import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { createRequire, Module } from "node:module";
import React from "react";
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import type { AskTuesdayResponse, TuesdayScanResponse } from "../lib/ask-tuesday/types";
import { ASK_TUESDAY } from "../config/ask-tuesday";
import { ItemStatus } from "../typings/types";

const require = createRequire(import.meta.url);
const EXTRA_MATCH_COUNT = 1;
const originalFetch = globalThis.fetch;
let AskTuesday: typeof import("../components/ask-tuesday/AskTuesday").AskTuesday;
let AskTuesdayResults: typeof import("../components/ask-tuesday/AskTuesdayResults").AskTuesdayResults;
let TuesdayScanProvider: typeof import("../components/ask-tuesday/TuesdayScanProvider").TuesdayScanProvider;
let OrderIssueIcon: typeof import("../components/ask-tuesday/OrderIssueIcon").OrderIssueIcon;
let OrderCustomerChatIcon: typeof import("../components/ask-tuesday/OrderCustomerChatIcon").OrderCustomerChatIcon;
let OrderAttentionIcons: typeof import("../components/ask-tuesday/OrderAttentionIcons").OrderAttentionIcons;
let pathname = "/orders";
let searchQuery = "Jane";
let navigatedTo = "";
let selectedOrder = "";
let inputFocusCount = 0;
let triggerFocusCount = 0;
let currentOrders: { id: string; status: ItemStatus }[] = [];
let completedOrders: { id: string; status: ItemStatus }[] = [];

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
      items: currentOrders, doneItems: completedOrders,
    }),
  };
  require.cache[storePath] = storeModule;
  (globalThis as typeof globalThis & { React: typeof React }).React = React;
  ({ AskTuesday } = await import("../components/ask-tuesday/AskTuesday"));
  ({ AskTuesdayResults } = await import("../components/ask-tuesday/AskTuesdayResults"));
  ({ TuesdayScanProvider } = await import("../components/ask-tuesday/TuesdayScanProvider"));
  ({ OrderIssueIcon } = await import("../components/ask-tuesday/OrderIssueIcon"));
  ({ OrderCustomerChatIcon } = await import("../components/ask-tuesday/OrderCustomerChatIcon"));
  ({ OrderAttentionIcons } = await import("../components/ask-tuesday/OrderAttentionIcons"));
});

after(() => { globalThis.fetch = originalFetch; });

function renderPopup() {
  return TestRenderer.create(<TuesdayScanProvider><AskTuesday /></TuesdayScanProvider>, {
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
  if (!renderer.root.findAllByType("textarea").length) {
    act(() => renderer.root.findByProps({ "aria-label": "Show record search" }).props.onClick());
  }
  act(() => renderer.root.findByType("textarea").props.onChange({ target: { value: question } }));
  await act(async () => renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }));
}

function visibleText(renderer: ReactTestRenderer) {
  return JSON.stringify(renderer.toJSON());
}

function contentText(node: ReactTestInstance): string {
  return node.children.map((child) => typeof child === "string" ? child : contentText(child)).join(" ").replace(/\s+/g, " ").trim();
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
    assert.equal(inputFocusCount, 0);
    assert.equal(renderer!.root.findAllByType("form").length, 0);
    const region = renderer!.root.findByProps({ role: "region", "aria-label": "Ask Tuesday" });
    assert.equal(region.props["aria-modal"], undefined);
    assert.match(visibleText(renderer!), /Orders and saved Etsy reviews/);
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
    assert.match(visibleText(renderer!), /Mint was agreed/);
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

test("employees can inspect dated messages, agreement status and relevant order uncertainties", () => {
  const renderer = TestRenderer.create(<AskTuesdayResults response={response} referencePrefix="turn-one" onOpenOrder={() => undefined} />);
  try {
    const text = visibleText(renderer);
    assert.match(text, /Reviewed/);
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
    assert.ok(renderer.root.findAllByType("time").some((node) => node.props.dateTime === "2026-10-01T15:00:00Z"));
    assert.ok(renderer.root.findAllByType("time").some((node) => node.props.dateTime === "2026-10-01T14:00:00Z"));
    const messageLink = renderer.root.findByProps({ href: "https://www.etsy.com/messages/1" });
    assert.equal(contentText(messageLink), "View messages ↗");
  } finally { renderer.unmount(); }
});

test("employee summaries show separate expandable points without technical background information", () => {
  const renderer = TestRenderer.create(<AskTuesdayResults response={response} referencePrefix="coverage-turn" onOpenOrder={() => undefined} />);
  try {
    const cards = renderer.root.findAllByProps({ "data-tuesday-result": true });
    assert.equal(cards.length, response.results.length);
    cards.forEach((card, index) => {
      assert.equal(card.type, "details");
      assert.notEqual(card.props.open, true);
      const summary = card.findAllByType("summary").find((node) => node.parent === card);
      assert.ok(summary);
      assert.ok(contentText(summary).includes(response.results[index]!.title));
      assert.doesNotMatch(contentText(summary), /Please use mint|Paused: no|Earlier conversation/);
    });
    assert.doesNotMatch(visibleText(renderer), /Source availability|Coverage limits|Live orders checked|Saved source updated|Imported|Evidence gaps/);
    assert.equal(renderer.root.findAllByProps({ href: "https://www.etsy.com/messages/1" }).length, 1);
  } finally { renderer.unmount(); }
});

test("employees are warned when a successful search could not check current orders", () => {
  const partial: AskTuesdayResponse = {
    ...response,
    freshness: { ...response.freshness, ordersCheckedAt: null },
    results: response.results.filter((result) => result.kind === "conversation"),
    limitations: ["Live orders are unavailable; their current state could not be checked."],
  };
  const renderer = TestRenderer.create(<AskTuesdayResults response={partial} referencePrefix="missing-orders" onOpenOrder={() => undefined} />);
  try {
    assert.match(visibleText(renderer), /Current orders could not be checked/);
    assert.ok(renderer.root.findByProps({ href: "https://www.etsy.com/messages/1" }));
    assert.doesNotMatch(visibleText(renderer), /database|record limit|coverage/i);
  } finally { renderer.unmount(); }
});

test("employees can see when more matching items exist than the displayed cards", () => {
  const limited = { ...response, totalMatches: response.results.length + EXTRA_MATCH_COUNT };
  const renderer = TestRenderer.create(<AskTuesdayResults response={limited} referencePrefix="limited-results" onOpenOrder={() => undefined} />);
  try {
    assert.ok(contentText(renderer.root).includes(`Showing ${limited.results.length} of ${limited.totalMatches} items`));
    assert.equal(renderer.root.findAllByProps({ "data-tuesday-result": true }).length, limited.results.length);
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
    assert.match(visibleText(renderer!), /Last findings/);
    assert.match(visibleText(renderer!), /Saved artwork requirements need double check/);
    assert.equal(renderer!.root.findByProps({ "aria-label": "Automatic check status" }).children.join(""), "?");
    await act(async () => renderer!.root.findByProps({ "aria-label": "Retry automatic checks" }).props.onClick());
    assert.match(visibleText(renderer!), /Some orders or messages could not be checked/);
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

test("row issue icons share one scan and only exact active order links display concerns", async () => {
  const browser = installVisibleWindow();
  let scanCalls = 0;
  const scan: TuesdayScanResponse = {
    ...automaticScan, totalIssues: 2,
    issues: [...automaticScan.issues, {
      ...automaticScan.issues[0]!, key: "saved:shared", rule: "saved-review", kind: "finding",
      orderId: undefined, orderIds: ["456", "987"],
      title: "Jane · artwork", detail: "Buyer requested mint artwork.",
      sources: [{ label: "Etsy messages", href: "https://www.etsy.com/messages/thread-77" }],
    }],
  };
  globalThis.fetch = async () => { scanCalls += 1; return Response.json(scan); };
  const rows = [
    { id: "123", status: ItemStatus.New, customerName: "Jane" },
    { id: "456", status: ItemStatus.Wip, customerName: "Jane" },
    { id: "987", status: ItemStatus.New, customerName: "Jane" },
    { id: "789", status: ItemStatus.New, customerName: "Jane" },
    { id: "123", status: ItemStatus.Done, customerName: "Jane" },
    { id: "456", status: ItemStatus.Hidden, customerName: "Jane" },
  ];
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<TuesdayScanProvider>
    <AskTuesday />
    {rows.map((item, index) => <div key={index} data-order-row={`${item.id}:${item.status}`}><OrderIssueIcon item={item} /></div>)}
  </TuesdayScanProvider>); });
  try {
    assert.equal(scanCalls, 1);
    for (const row of ["123:New", "456:Wip", "987:New"]) {
      assert.equal(renderer!.root.findByProps({ "data-order-row": row }).findAllByType("button").length, 1);
    }
    for (const row of ["789:New", "123:Done", "456:Hidden"]) {
      assert.equal(renderer!.root.findByProps({ "data-order-row": row }).findAllByType("button").length, 0);
    }
    let propagationStops = 0;
    const button = renderer!.root.findByProps({ "data-order-row": "456:Wip" }).findByType("button");
    act(() => button.props.onClick({ currentTarget: { focus() {} }, stopPropagation() { propagationStops += 1; } }));
    const dialog = renderer!.root.findByProps({ role: "dialog" });
    assert.match(contentText(dialog), /Buyer requested mint artwork/);
    assert.doesNotMatch(contentText(dialog), /Saved artwork requirements need double check/);
    assert.equal(dialog.findByProps({ href: "https://www.etsy.com/messages/thread-77" }).props.target, "_blank");
    assert.equal(dialog.findAllByProps({ "data-tuesday-result": true }).length, 1);
    assert.equal(propagationStops, 1);
    assert.equal(scanCalls, 1);
  } finally { act(() => renderer!.unmount()); browser.restore(); }
});

test("order issues isolate row gestures and Escape restores focus to the clicked icon", async () => {
  const browser = installVisibleWindow();
  globalThis.fetch = async () => Response.json(automaticScan);
  const item = { id: "123", status: ItemStatus.New, customerName: "Jane" };
  let focused = 0;
  let stopped = 0;
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<TuesdayScanProvider><OrderIssueIcon item={item} /></TuesdayScanProvider>); });
  try {
    const icon = renderer!.root.findByType("button");
    for (const handler of ["onPointerDown", "onMouseDown", "onKeyDown"]) {
      act(() => icon.props[handler]({ key: "Enter", stopPropagation() { stopped += 1; } }));
    }
    act(() => icon.props.onClick({ currentTarget: { focus() { focused += 1; } }, stopPropagation() { stopped += 1; } }));
    const dialog = renderer!.root.findByProps({ role: "dialog" });
    act(() => dialog.props.onKeyDown({ key: "Escape", preventDefault() {}, stopPropagation() { stopped += 1; } }));
    assert.equal(renderer!.root.findAllByProps({ role: "dialog" }).length, 0);
    assert.equal(focused, 1);
    assert.equal(stopped, 5);
  } finally { act(() => renderer!.unmount()); browser.restore(); }
});

test("an order moved to Done immediately loses its icon and open issue details", async () => {
  const browser = installVisibleWindow();
  globalThis.fetch = async () => Response.json(automaticScan);
  const render = (status: ItemStatus) => <TuesdayScanProvider><OrderIssueIcon item={{ id: "123", status, customerName: "Jane" }} /></TuesdayScanProvider>;
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(render(ItemStatus.New)); });
  try {
    act(() => renderer!.root.findByType("button").props.onClick({ currentTarget: { focus() {} }, stopPropagation() {} }));
    assert.equal(renderer!.root.findAllByProps({ role: "dialog" }).length, 1);
    await act(async () => { renderer!.update(render(ItemStatus.Done)); });
    assert.equal(renderer!.root.findAllByType("button").length, 0);
    assert.equal(renderer!.root.findAllByProps({ role: "dialog" }).length, 0);
  } finally { act(() => renderer!.unmount()); browser.restore(); }
});

test("orders outside the global card limit still receive their linked issue icon", async () => {
  const browser = installVisibleWindow();
  const scan: TuesdayScanResponse = {
    ...automaticScan, totalIssues: 2,
    orderIssues: [...automaticScan.issues, { ...automaticScan.issues[0]!, key: "requirements:456", orderId: "456" }],
  };
  globalThis.fetch = async () => Response.json(scan);
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<TuesdayScanProvider><OrderIssueIcon item={{ id: "456", status: ItemStatus.New, customerName: "Jane" }} /></TuesdayScanProvider>); });
  try {
    assert.equal(renderer!.root.findAllByType("button").length, 1);
  } finally { act(() => renderer!.unmount()); browser.restore(); }
});

test("locally completed orders leave stale global cards while active shared findings and capped counts remain honest", async () => {
  const browser = installVisibleWindow();
  const shared: TuesdayScanResponse["issues"][number] = {
    ...automaticScan.issues[0]!, key: "shared:123:456", orderId: undefined, orderIds: ["123", "456"],
    detail: "Shared artwork needs confirmation.",
  };
  globalThis.fetch = async () => Response.json({
    ...automaticScan, totalIssues: 3, issues: [...automaticScan.issues, shared], orderIssues: [...automaticScan.issues, shared],
  });
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = renderPopup(); });
  try {
    completedOrders = [{ id: "123", status: ItemStatus.Done }];
    await act(async () => { renderer!.update(<TuesdayScanProvider><AskTuesday /></TuesdayScanProvider>); });
    open(renderer!);
    assert.equal(renderer!.root.findByProps({ "aria-label": "Automatic check status" }).children.join(""), "2");
    assert.doesNotMatch(visibleText(renderer!), /Saved artwork requirements need double check/);
    assert.match(visibleText(renderer!), /Shared artwork needs confirmation/);
    assert.equal(renderer!.root.findAllByProps({ "aria-label": "Open order 123" }).length, 0);
    assert.ok(contentText(renderer!.root).includes("Showing 1 of 2 items"));
  } finally { completedOrders = []; act(() => renderer!.unmount()); browser.restore(); }
});

test("malformed order linkage in a successful scan stays unknown rather than creating misleading icons", async () => {
  const browser = installVisibleWindow();
  globalThis.fetch = async () => Response.json({ ...automaticScan,
    orderIssues: [{ ...automaticScan.issues[0]!, orderId: undefined, orderIds: "123" }],
  });
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = renderPopup(); });
  try {
    assert.equal(renderer!.root.findByProps({ "aria-label": "Automatic check status" }).children.join(""), "?");
    open(renderer!);
    assert.match(visibleText(renderer!), /Automatic check results were incomplete/);
  } finally { act(() => renderer!.unmount()); browser.restore(); }
});

test("cached search results drop completed orders and retain active message links without claiming capped results are exhaustive", async () => {
  const searched: AskTuesdayResponse = {
    ...response, totalMatches: 3,
    results: [{ ...response.results[0]!, title: "Jane · active order 123", detail: "Artwork requirements for the active order." },
      { ...response.results[1]!, orderIds: ["123", "456"] }],
  };
  globalThis.fetch = async (_url, options) => Response.json(options?.method === "GET" ? automaticScan : searched);
  let renderer: ReactTestRenderer;
  act(() => { renderer = renderPopup(); });
  try {
    open(renderer!);
    await submit(renderer!, "Jane");
    assert.match(visibleText(renderer!), /active order 123/);
    completedOrders = [{ id: "123", status: ItemStatus.Done }];
    act(() => { renderer!.update(<TuesdayScanProvider><AskTuesday /></TuesdayScanProvider>); });
    assert.doesNotMatch(visibleText(renderer!), /active order 123|Artwork requirements for the active order/);
    assert.equal(renderer!.root.findAllByProps({ "aria-label": "Open order 123" }).length, 0);
    assert.ok(renderer!.root.findByProps({ href: "https://www.etsy.com/messages/1" }));
    assert.ok(contentText(renderer!.root).includes("Showing 1 of 2 items"));
    completedOrders = [{ id: "123", status: ItemStatus.Done }, { id: "456", status: ItemStatus.Done }];
    act(() => { renderer!.update(<TuesdayScanProvider><AskTuesday /></TuesdayScanProvider>); });
    assert.equal(renderer!.root.findAllByProps({ "data-tuesday-result": true }).length, 0);
    assert.equal(renderer!.root.findAllByProps({ href: "https://www.etsy.com/messages/1" }).length, 0);
  } finally { completedOrders = []; act(() => renderer!.unmount()); }
});

test("an issue dialog closes when its order row disappears", async () => {
  const browser = installVisibleWindow();
  globalThis.fetch = async () => Response.json(automaticScan);
  const render = (visible: boolean) => <TuesdayScanProvider>{visible && <OrderIssueIcon item={{ id: "123", status: ItemStatus.New, customerName: "Jane" }} />}</TuesdayScanProvider>;
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(render(true)); });
  try {
    act(() => renderer!.root.findByType("button").props.onClick({ currentTarget: { focus() {} }, stopPropagation() {} }));
    assert.equal(renderer!.root.findAllByProps({ role: "dialog" }).length, 1);
    await act(async () => { renderer!.update(render(false)); });
    assert.equal(renderer!.root.findAllByProps({ role: "dialog" }).length, 0);
  } finally { act(() => renderer!.unmount()); browser.restore(); }
});

test("completed order exclusions survive Done cache eviction and clear only when that order is observed active again", async () => {
  const browser = installVisibleWindow();
  const searched = { ...response, results: [response.results[0]!], totalMatches: 1 };
  globalThis.fetch = async (_url, options) => Response.json(options?.method === "GET" ? automaticScan : searched);
  currentOrders = [{ id: "123", status: ItemStatus.New }];
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = renderPopup(); });
  try {
    open(renderer!);
    await submit(renderer!, "Jane");
    assert.equal(renderer!.root.findAllByProps({ "data-tuesday-result": true }).length, 1);
    currentOrders = [];
    completedOrders = [{ id: "123", status: ItemStatus.Done }];
    await act(async () => { renderer!.update(<TuesdayScanProvider><AskTuesday /></TuesdayScanProvider>); });
    assert.equal(renderer!.root.findAllByProps({ "data-tuesday-result": true }).length, 0);
    completedOrders = [];
    await act(async () => { renderer!.update(<TuesdayScanProvider><AskTuesday /></TuesdayScanProvider>); });
    assert.equal(renderer!.root.findAllByProps({ "data-tuesday-result": true }).length, 0);
    assert.equal(renderer!.root.findByProps({ "aria-label": "Automatic check status" }).children.join(""), "0");
    currentOrders = [{ id: "123", status: ItemStatus.New }];
    await act(async () => { renderer!.update(<TuesdayScanProvider><AskTuesday /></TuesdayScanProvider>); });
    assert.equal(renderer!.root.findAllByProps({ "data-tuesday-result": true }).length, 1);
    assert.equal(renderer!.root.findByProps({ "aria-label": "Automatic check status" }).children.join(""), "1");
  } finally { currentOrders = []; completedOrders = []; act(() => renderer!.unmount()); browser.restore(); }
});

const customerChat = {
  threadId: "987654", buyerName: "Jane", orderIds: ["123", "456"], checkedAt: "2026-10-06T18:00:00Z", historyComplete: true,
  summary: { text: "Jane confirmed mint artwork and asked about the shipping date.", highlights: ["Mint artwork confirmed."],
    nextAction: "Confirm the shipping date.", evidence: [{ sender: "buyer" as const, text: "Please use mint. When will it ship?" }] },
};

test("customer chat icons share the existing poll and show saved AI summaries only for exact active orders", async () => {
  const browser = installVisibleWindow();
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return Response.json({ ...automaticScan, customerChats: [customerChat] }); };
  const rows = [
    { id: "123", status: ItemStatus.New, customerName: "Jane" },
    { id: "456", status: ItemStatus.Wip, customerName: "Jane" },
    { id: "789", status: ItemStatus.New, customerName: "Jane" },
    { id: "123", status: ItemStatus.Done, customerName: "Jane", tags: { hasCustomerMessage: true } },
    { id: "456", status: ItemStatus.Hidden, customerName: "Jane", tags: { hasCustomerMessage: true } },
  ];
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<TuesdayScanProvider><AskTuesday />
    {rows.map((item, index) => <div key={index} data-chat-row={`${item.id}:${item.status}`}><OrderAttentionIcons item={item} /></div>)}
  </TuesdayScanProvider>); });
  try {
    assert.equal(calls, 1);
    assert.equal(renderer!.root.findByProps({ "data-chat-row": "123:New" }).findAllByType("button").length, 2);
    for (const row of ["456:Wip"]) assert.equal(renderer!.root.findByProps({ "data-chat-row": row }).findAllByType("button").length, 1);
    for (const row of ["789:New", "123:Done", "456:Hidden"]) assert.equal(renderer!.root.findByProps({ "data-chat-row": row }).findAllByType("button").length, 0);
    const icon = renderer!.root.findByProps({ "aria-label": "Show customer chat for Jane order 123" });
    act(() => icon.props.onClick({ currentTarget: { focus() {} }, stopPropagation() {} }));
    const dialog = renderer!.root.findByProps({ role: "dialog" });
    assert.match(contentText(dialog), /AI summary.*Jane confirmed mint artwork/);
    assert.match(contentText(dialog), /Confirm the shipping date/);
    assert.match(contentText(dialog), /Saved Oct 6/);
    assert.equal(dialog.findByProps({ href: "https://www.etsy.com/messages/987654" }).props.target, "_blank");
    const evidence = dialog.findByType("details");
    assert.equal(evidence.props.open, undefined);
    assert.match(contentText(evidence), /Buyer.*Please use mint/);
    assert.doesNotMatch(contentText(dialog), /Saved artwork requirements need double check/);
    assert.equal(calls, 1);
  } finally { act(() => renderer!.unmount()); browser.restore(); }
});

test("message tags and saved chats without a summary remain honest and still link to messages", async () => {
  const browser = installVisibleWindow();
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return Response.json({ ...automaticScan, customerChats: [{ ...customerChat, summary: null }] }); };
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<TuesdayScanProvider>
    <OrderCustomerChatIcon item={{ id: "123", status: ItemStatus.New, customerName: "Jane" }} />
    <OrderCustomerChatIcon item={{ id: "789", status: ItemStatus.New, customerName: "Alex", tags: { hasCustomerMessage: true } }} />
  </TuesdayScanProvider>); });
  try {
    act(() => renderer!.root.findByProps({ "aria-label": "Show customer chat for Jane order 123" }).props.onClick({ currentTarget: { focus() {} }, stopPropagation() {} }));
    let dialog = renderer!.root.findByProps({ role: "dialog" });
    assert.match(contentText(dialog), /Summary not available yet/);
    assert.doesNotMatch(contentText(dialog), /AI summary|Jane confirmed/);
    assert.ok(dialog.findByProps({ href: "https://www.etsy.com/messages/987654" }));
    act(() => renderer!.root.findByProps({ "aria-label": "Show customer chat for Alex order 789" }).props.onClick({ currentTarget: { focus() {} }, stopPropagation() {} }));
    dialog = renderer!.root.findByProps({ role: "dialog" });
    assert.match(contentText(dialog), /Summary not available yet/);
    assert.ok(dialog.findByProps({ href: "https://www.etsy.com/messages" }));
    assert.equal(calls, 1);
  } finally { act(() => renderer!.unmount()); browser.restore(); }
});

test("chat gestures stay inside the icon and Escape returns focus while replacing the issue panel", async () => {
  const browser = installVisibleWindow();
  globalThis.fetch = async () => Response.json({ ...automaticScan, customerChats: [customerChat] });
  const item = { id: "123", status: ItemStatus.New, customerName: "Jane" };
  let renderer: ReactTestRenderer;
  let stopped = 0;
  let focused = 0;
  await act(async () => { renderer = TestRenderer.create(<TuesdayScanProvider><OrderAttentionIcons item={item} /></TuesdayScanProvider>); });
  try {
    act(() => renderer!.root.findByProps({ "aria-label": "Show 1 issue for Jane 123" }).props.onClick({ currentTarget: { focus() {} }, stopPropagation() {} }));
    const icon = renderer!.root.findByProps({ "aria-label": "Show customer chat for Jane order 123" });
    for (const handler of ["onPointerDownCapture", "onPointerDown", "onMouseDown", "onTouchStart", "onKeyDown"]) {
      act(() => icon.props[handler]({ key: "Enter", stopPropagation() { stopped += 1; } }));
    }
    act(() => icon.props.onClick({ currentTarget: { focus() { focused += 1; } }, stopPropagation() { stopped += 1; } }));
    assert.equal(renderer!.root.findAllByProps({ role: "dialog" }).length, 1);
    const dialog = renderer!.root.findByProps({ role: "dialog" });
    assert.match(contentText(dialog), /Jane confirmed mint/);
    act(() => dialog.props.onKeyDown({ key: "Escape", preventDefault() {}, stopPropagation() { stopped += 1; } }));
    assert.equal(renderer!.root.findAllByProps({ role: "dialog" }).length, 0);
    assert.equal(focused, 1);
    assert.equal(stopped, 7);
  } finally { act(() => renderer!.unmount()); browser.restore(); }
});

test("Done chat exclusions survive cache eviction including message tags and the open panel closes", async () => {
  const browser = installVisibleWindow();
  globalThis.fetch = async () => Response.json({ ...automaticScan, customerChats: [customerChat] });
  const item = { id: "123", status: ItemStatus.New, customerName: "Jane", tags: { hasCustomerMessage: true } };
  const render = () => <TuesdayScanProvider><OrderCustomerChatIcon item={item} /></TuesdayScanProvider>;
  currentOrders = [{ id: "123", status: ItemStatus.New }];
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(render()); });
  try {
    act(() => renderer!.root.findByType("button").props.onClick({ currentTarget: { focus() {} }, stopPropagation() {} }));
    currentOrders = []; completedOrders = [{ id: "123", status: ItemStatus.Done }];
    await act(async () => { renderer!.update(render()); });
    assert.equal(renderer!.root.findAllByProps({ role: "dialog" }).length, 0);
    assert.equal(renderer!.root.findAllByType("button").length, 0);
    completedOrders = [];
    await act(async () => { renderer!.update(render()); });
    assert.equal(renderer!.root.findAllByType("button").length, 0);
    currentOrders = [{ id: "123", status: ItemStatus.New }];
    await act(async () => { renderer!.update(render()); });
    assert.equal(renderer!.root.findAllByType("button").length, 1);
  } finally { currentOrders = []; completedOrders = []; act(() => renderer!.unmount()); browser.restore(); }
});

test("a customer chat panel closes when its order row disappears or moves to Done", async () => {
  const browser = installVisibleWindow();
  globalThis.fetch = async () => Response.json({ ...automaticScan, customerChats: [customerChat] });
  const render = (visible: boolean, status = ItemStatus.New) => <TuesdayScanProvider>{visible && <OrderCustomerChatIcon item={{ id: "123", status, customerName: "Jane" }} />}</TuesdayScanProvider>;
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(render(true)); });
  try {
    act(() => renderer!.root.findByType("button").props.onClick({ currentTarget: { focus() {} }, stopPropagation() {} }));
    await act(async () => { renderer!.update(render(false)); });
    assert.equal(renderer!.root.findAllByProps({ role: "dialog" }).length, 0);
    await act(async () => { renderer!.update(render(true)); });
    act(() => renderer!.root.findByType("button").props.onClick({ currentTarget: { focus() {} }, stopPropagation() {} }));
    await act(async () => { renderer!.update(render(true, ItemStatus.Done)); });
    assert.equal(renderer!.root.findAllByType("button").length, 0);
    assert.equal(renderer!.root.findAllByProps({ role: "dialog" }).length, 0);
  } finally { act(() => renderer!.unmount()); browser.restore(); }
});

test("incomplete and stale message coverage stays visible alongside a saved AI summary", async () => {
  const browser = installVisibleWindow();
  let fail = false;
  globalThis.fetch = async () => fail ? new Response("unavailable", { status: 503 }) : Response.json({ ...automaticScan, status: "partial", customerChats: [{ ...customerChat, historyComplete: false }] });
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(<TuesdayScanProvider><OrderCustomerChatIcon item={{ id: "123", status: ItemStatus.New, customerName: "Jane" }} /></TuesdayScanProvider>); });
  try {
    act(() => renderer!.root.findByType("button").props.onClick({ currentTarget: { focus() {} }, stopPropagation() {} }));
    assert.match(contentText(renderer!.root.findByProps({ role: "dialog" })), /Earlier messages may be missing/);
    assert.match(contentText(renderer!.root.findByProps({ role: "dialog" })), /Some messages could not be checked/);
    fail = true;
    await act(async () => { browser.focus(); });
    assert.match(contentText(renderer!.root.findByProps({ role: "dialog" })), /Saved summary.*current checks are unavailable/);
    assert.match(contentText(renderer!.root.findByProps({ role: "dialog" })), /Jane confirmed mint/);
  } finally { act(() => renderer!.unmount()); browser.restore(); }
});

test("malformed customer chat payloads remain unknown rather than exposing unsafe links or invalid summaries", async () => {
  const browser = installVisibleWindow();
  const invalidChats = [
    { ...customerChat, threadId: "987654?redirect=bad" },
    { ...customerChat, orderIds: [] },
    { ...customerChat, checkedAt: "not-a-date" },
    { ...customerChat, summary: { ...customerChat.summary, evidence: [{ sender: "robot", text: "mint" }] } },
    { ...customerChat, summary: { ...customerChat.summary, highlights: "mint" } },
  ];
  try {
    for (const chat of invalidChats) {
      globalThis.fetch = async () => Response.json({ ...automaticScan, customerChats: [chat] });
      let renderer: ReactTestRenderer;
      await act(async () => { renderer = renderPopup(); });
      try { assert.equal(renderer!.root.findByProps({ "aria-label": "Automatic check status" }).children.join(""), "?"); }
      finally { act(() => renderer!.unmount()); }
    }
  } finally { browser.restore(); }
});

test("removing the only message indicator closes a pending summary panel", async () => {
  const browser = installVisibleWindow();
  globalThis.fetch = async () => Response.json(automaticScan);
  const render = (hasCustomerMessage: boolean) => <TuesdayScanProvider><OrderCustomerChatIcon item={{ id: "789", status: ItemStatus.New, customerName: "Alex", tags: { hasCustomerMessage } }} /></TuesdayScanProvider>;
  let renderer: ReactTestRenderer;
  await act(async () => { renderer = TestRenderer.create(render(true)); });
  try {
    act(() => renderer!.root.findByType("button").props.onClick({ currentTarget: { focus() {} }, stopPropagation() {} }));
    assert.equal(renderer!.root.findAllByProps({ role: "dialog" }).length, 1);
    await act(async () => { renderer!.update(render(false)); });
    assert.equal(renderer!.root.findAllByProps({ role: "dialog" }).length, 0);
    assert.equal(renderer!.root.findAllByType("button").length, 0);
  } finally { act(() => renderer!.unmount()); browser.restore(); }
});
