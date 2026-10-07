import assert from "node:assert/strict";
import test from "node:test";
import { scanTuesdaySnapshot, handleTuesdayScan } from "../lib/ask-tuesday/scan";
import { normalizeOperationalReview, parseTuesdayKnowledge } from "../lib/ask-tuesday/knowledge";
import { ASK_TUESDAY } from "../config/ask-tuesday";
import { ItemStatus } from "../typings/types";
import type { AskOrder, TuesdaySnapshot } from "../lib/ask-tuesday/types";

const now = "2026-10-07T01:00:00.000Z";
const order = (id: string, extra: Partial<AskOrder> = {}): AskOrder => ({
  id, customerName: id, status: ItemStatus.New, visible: true, deleted: false, dueDate: "2026-10-05", ...extra,
});
const snapshot = (orders: AskOrder[] = []): TuesdaySnapshot => ({
  orders, activities: [], ordersCheckedAt: now, activitiesCheckedAt: now,
  ordersTruncated: false, activitiesTruncated: false, limitations: [],
  knowledge: {schemaVersion: 1, importedAt: now, reviewObservedOn: "2026-10-06", sourceUpdatedAt: now,
    limitations: [], findings: [], conversations: [], excludedAuditCustomers: ["[EW] Excluded Buyer"]},
});

test("automatic checks flag overdue work and explicit requirement reviews, not routine priority", () => {
  const data = snapshot([
    order("late"), order("held", {onHold: true}), order("done", {status: ItemStatus.Done}),
    order("hidden", {status: ItemStatus.Hidden}), order("deleted", {deleted: true}),
    order("framed", {design: "Framed Artwork"}), order("excluded", {customerName: "Excluded Buyer"}),
    order("rushed", {customerName: "Priority (Rushed)", dueDate: "2026-10-09"}),
    order("today", {dueDate: "2026-10-06"}), order("invalid", {dueDate: "not-a-date"}),
    order("check", {notes: "AI needs double check", dueDate: "2026-10-09", tags: {hasCustomerMessage: true}}),
    order("message-only", {dueDate: "2026-10-09", tags: {hasCustomerMessage: true}}),
  ]);
  const result = scanTuesdaySnapshot(data, now);
  assert.deepEqual(result.issues.map(issue => [issue.orderId, issue.rule]).sort(), [["check", "requirements-check"], ["late", "overdue"]]);
  assert.equal(result.totalIssues, 2);
  assert.match(result.issues.find(issue => issue.rule === "overdue")?.uncertainty.join(" ") ?? "", /arrival|promise/i);
  assert.equal(result.capabilities.liveEtsy, "unavailable");
});

test("holds suppress deadline alerts but do not hide explicit requirement checks", () => {
  const result = scanTuesdaySnapshot(snapshot([order("held-check", {onHold: true, notes: "AI needs double check"})]), now);
  assert.deepEqual(result.issues.map(issue => issue.rule), ["requirements-check"]);
});

test("saved unresolved findings retain quotes, dates and uncertainty for eligible work", () => {
  const data = snapshot();
  data.knowledge!.findings = [
    {key: "thread:123", customer: "Done Buyer", status: "unresolved", evidence: ["Buyer asked for center fade."],
      action: "Review the buyer's requested change", observedOn: "2026-10-01", sources: [{label: "Etsy conversation", href: "https://www.etsy.com/messages/123"}], uncertainty: ["Earlier agreement unverified."]},
    {key: "resolved", customer: "Resolved Buyer", status: "resolved", evidence: [], action: null, observedOn: "2026-10-01", sources: [], uncertainty: []},
    {key: "excluded", customer: "Excluded Buyer", status: "unresolved", evidence: ["Old framed art"], action: null, observedOn: null, sources: [], uncertainty: []},
  ];
  const result = scanTuesdaySnapshot(data, now);
  assert.equal(result.totalIssues, 1);
  assert.equal(result.issues[0]?.orderId, undefined);
  assert.equal(result.issues[0]?.observedAt, "2026-10-01");
  assert.deepEqual(result.issues[0]?.facts, ["Buyer asked for center fade."]);
  assert.match(result.issues[0]?.uncertainty.join(" ") ?? "", /not a live Etsy check/i);
});

test("Done customers cannot reappear as saved message issues", () => {
  const data = snapshot([order("done", {customerName: "[EW] José Buyer (Semi-Rushed) (Center Fade)", status: ItemStatus.Done})]);
  data.knowledge!.findings = [{key: "closed-thread", customer: "Jose Buyer", status: "unresolved",
    evidence: ["Old requested change"], action: "Check artwork", observedOn: "2026-10-01", sources: [], uncertainty: []}];
  assert.equal(scanTuesdaySnapshot(data, now).totalIssues, 0);
});

test("a Hidden namesake cannot revive a completed customer's saved issue", () => {
  const data = snapshot([order("done", {customerName: "Buyer", status: ItemStatus.Done}),
    order("hidden", {customerName: "Buyer", status: ItemStatus.Hidden})]);
  data.knowledge!.findings = [{key: "old", customer: "Buyer", status: "unresolved", evidence: ["Old change"],
    action: null, observedOn: "2026-10-01", sources: [], uncertainty: []}];
  assert.equal(scanTuesdaySnapshot(data, now).totalIssues, 0);
});

test("a saved account-alias issue stays excluded when its matched order is Done", () => {
  const data = snapshot([order("done", {customerName: "Harrison Winn", status: ItemStatus.Done})]);
  data.knowledge!.findings = [{key: "accounts", customer: "Harrison Winn / Donn Winn", status: "unresolved",
    evidence: ["Old account-linkage question"], action: null, observedOn: "2026-10-01", sources: [], uncertainty: []}];
  assert.equal(scanTuesdaySnapshot(data, now).totalIssues, 0);
});

test("a newly observed Done status overrides an older active order read", () => {
  const data = snapshot([order("just-completed", {notes: "AI needs double check"})]);
  data.orderScope = {checkedAt: now, truncated: false, orders: [{id: "just-completed", customerName: "Buyer", status: ItemStatus.Done}]};
  assert.equal(scanTuesdaySnapshot(data, now).totalIssues, 0);
});

test("completed thread linkage overrides a repeat buyer's active order", () => {
  const data = snapshot([order("active", {customerName: "Buyer", dueDate: "2026-10-12"})]);
  data.orderScope = {checkedAt: now, truncated: false, orders: [
    {id: "completed", customerName: "Buyer", status: ItemStatus.Done},
    {id: "active", customerName: "Buyer", status: ItemStatus.New},
  ]};
  data.knowledge!.conversations = [{threadId: "123", buyerName: "Other account", orderIds: ["completed"],
    checkedAt: now, historyComplete: true, messages: [], agreements: []}];
  data.knowledge!.findings = [{key: "thread:123", customer: "Buyer / Other account", status: "unresolved",
    evidence: ["Old requested change"], action: null, observedOn: "2026-10-01",
    sources: [{label: "Messages", href: "https://www.etsy.com/messages/123"}], uncertainty: []}];
  assert.equal(scanTuesdaySnapshot(data, now).totalIssues, 0);
});

test("unverified completion status hides saved issues while retaining active order alerts", () => {
  for (const scope of [{checkedAt: null, truncated: false, orders: []}, {checkedAt: now, truncated: true, orders: []}]) {
    const data = snapshot([order("active")]);
    data.orderScope = scope;
    data.knowledge!.findings = [{key: "saved", customer: "Buyer", status: "unresolved", evidence: ["Check change"],
      action: null, observedOn: "2026-10-06", sources: [], uncertainty: []}];
    const result = scanTuesdaySnapshot(data, now);
    assert.deepEqual(result.issues.map(issue => issue.kind), ["order"]);
    assert.equal(result.status, "partial");
    assert.match(result.limitations.join(" "), /order status.*(?:unavailable|incomplete)/i);
  }
});

test("order-linked issues remain available for row icons beyond the global card limit", () => {
  const data = snapshot(Array.from({length: ASK_TUESDAY.maxScanIssues + 1}, (_, index) => order(`active-${index}`)));
  data.orders.push(order("completed", {status: ItemStatus.Done}));
  const result = scanTuesdaySnapshot(data, now);
  assert.equal(result.issues.length, ASK_TUESDAY.maxScanIssues);
  assert.equal(result.orderIssues?.length, ASK_TUESDAY.maxScanIssues + 1);
  assert.equal(result.orderIssues?.at(-1)?.orderId, `active-${ASK_TUESDAY.maxScanIssues}`);
  assert.ok(result.orderIssues?.every(issue => issue.orderId !== "completed"));
});

test("a saved issue gets only the active order IDs established by its thread", () => {
  const data = snapshot([order("new-order", {customerName: "Buyer", dueDate: "2026-10-12"}),
    order("completed", {customerName: "Buyer", status: ItemStatus.Done})]);
  data.knowledge!.conversations = [{threadId: "123", buyerName: "Other account", orderIds: ["completed", "new-order"],
    checkedAt: now, historyComplete: true, messages: [], agreements: []}];
  data.knowledge!.findings = [{key: "thread:123", customer: "Buyer / Other account", status: "unresolved",
    evidence: ["Check agreed change"], action: null, observedOn: "2026-10-06",
    sources: [{label: "Messages", href: "https://www.etsy.com/messages/123"}], uncertainty: []}];
  const result = scanTuesdaySnapshot(data, now);
  assert.deepEqual(result.issues[0]?.orderIds, ["new-order"]);
});

test("a name-only issue is not attached to a repeat buyer's new order", () => {
  const data = snapshot([order("new-order", {customerName: "Buyer", dueDate: "2026-10-12"}),
    order("completed", {customerName: "Buyer", status: ItemStatus.Done})]);
  data.knowledge!.findings = [{key: "unlinked", customer: "Buyer", status: "unresolved", evidence: ["Check palette"],
    action: null, observedOn: "2026-10-06", sources: [], uncertainty: []}];
  const result = scanTuesdaySnapshot(data, now);
  assert.deepEqual(result.issues[0]?.orderIds, []);
});

test("active buyer chats are available even without an issue, while Done and seller-only histories are excluded", () => {
  const data = snapshot([order("active", {customerName: "Buyer", dueDate: "2026-10-12"}),
    order("completed", {customerName: "Done Buyer", status: ItemStatus.Done})]);
  const summary = {text: "The buyer wants a white palette.", highlights: ["White palette"], nextAction: null,
    evidence: [{sender: "buyer" as const, text: "Use white."}]};
  const message = {id: "m1", sentAt: now, sender: "buyer" as const, text: "Use white."};
  data.knowledge!.conversations = [
    {threadId: "111", buyerName: "Buyer", orderIds: ["active"], checkedAt: now, historyComplete: true,
      messages: [message], agreements: [], summary},
    {threadId: "222", buyerName: "Done Buyer", orderIds: ["completed"], checkedAt: now, historyComplete: true,
      messages: [message], agreements: [], summary},
    {threadId: "333", buyerName: "Buyer", orderIds: ["active"], checkedAt: now, historyComplete: true,
      messages: [{...message, sender: "seller"}], agreements: []},
  ];
  const result = scanTuesdaySnapshot(data, now);
  assert.equal(result.totalIssues, 0);
  assert.deepEqual(result.customerChats?.map(chat => chat.threadId), ["111"]);
  assert.deepEqual(result.customerChats?.[0]?.orderIds, ["active"]);
  assert.equal(result.customerChats?.[0]?.summary?.text, "The buyer wants a white palette.");
});

test("a partial cited summary can establish a buyer chat without fabricated message timestamps", () => {
  const data = snapshot([order("active", {customerName: "Buyer", dueDate: "2026-10-12"})]);
  data.knowledge!.conversations = [{threadId: "111", buyerName: "Buyer", orderIds: ["active"], checkedAt: now,
    historyComplete: false, messages: [], agreements: [], summary: {text: "The buyer requested white.", highlights: [],
      nextAction: "Check the latest approval before production.", evidence: [{sender: "buyer", text: "Use white."}]}}];
  const result = scanTuesdaySnapshot(data, now);
  assert.equal(result.customerChats?.length, 1);
  assert.equal(result.customerChats?.[0]?.historyComplete, false);
  assert.equal(result.status, "partial");
});

test("uncertain order status and ambiguous repeat buyers never attach chats to active rows", () => {
  const data = snapshot([order("active", {customerName: "Buyer", dueDate: "2026-10-12"}),
    order("completed", {customerName: "Buyer", status: ItemStatus.Done})]);
  data.knowledge!.conversations = [{threadId: "111", buyerName: "Buyer", orderIds: [], checkedAt: now,
    historyComplete: true, messages: [{id: "m1", sentAt: now, sender: "buyer", text: "Use white."}], agreements: []}];
  assert.deepEqual(scanTuesdaySnapshot(data, now).customerChats, []);
  data.knowledge!.conversations[0]!.orderIds = ["active"];
  data.orderScope = {checkedAt: null, truncated: false, orders: []};
  assert.deepEqual(scanTuesdaySnapshot(data, now).customerChats, []);
});

test("a linked buyer chat without a saved buyer name uses the active order label", () => {
  const data = snapshot([order("active", {customerName: "Buyer", dueDate: "2026-10-12"})]);
  data.knowledge!.conversations = [{threadId: "111", buyerName: "", orderIds: ["active"], checkedAt: now,
    historyComplete: true, messages: [{id: "m1", sentAt: now, sender: "buyer", text: "Use white."}], agreements: []}];
  assert.equal(scanTuesdaySnapshot(data, now).customerChats?.[0]?.buyerName, "Buyer");
});

test("missing sources and record limits never produce a complete all-clear", () => {
  const absent = snapshot();
  absent.ordersCheckedAt = null;
  absent.knowledge = null;
  assert.equal(scanTuesdaySnapshot(absent, now).status, "unavailable");
  const partial = snapshot();
  partial.ordersTruncated = true;
  assert.equal(scanTuesdaySnapshot(partial, now).status, "partial");
  assert.match(scanTuesdaySnapshot(partial, now).limitations.join(" "), /limit|incomplete/i);
});

test("saved findings with unknown resolution stay visible when they contain evidence or an action", () => {
  const data = snapshot();
  data.knowledge!.findings = [
    {key: "missing-status", customer: "Buyer", status: "unknown", evidence: ["Buyer asked to change the palette."],
      action: "Check the final agreed palette", observedOn: "2026-10-06", sources: [], uncertainty: []},
    {key: "conflicting-status", customer: "Other Buyer", status: "unknown", evidence: [], action: null,
      observedOn: "2026-10-06", sources: [], uncertainty: ["Conflicting saved statuses; resolution remains unknown."]},
    {key: "empty-placeholder", customer: "", status: "unknown", evidence: [], action: null, observedOn: null, sources: [], uncertainty: []},
  ];
  const result = scanTuesdaySnapshot(data, now);
  assert.equal(result.totalIssues, 2);
  assert.ok(result.issues.every(issue => issue.severity === "review"));
  assert.match(result.issues[0]?.uncertainty.join(" ") ?? "", /resolution is unknown/i);
  assert.match(result.issues[1]?.detail ?? "", /resolution is unknown/i);
});

test("saved evidence limits retain unresolved findings before resolved history and keep coverage partial", () => {
  const resolved = Array.from({length: ASK_TUESDAY.maxFindings}, (_, index) => ({
    issueKey: `resolved-${index}`, customer: "Resolved Buyer", status: "resolved", evidence: ["Completed."],
  }));
  const knowledge = normalizeOperationalReview({latestReviewDate: "2026-10-06", issues: [
    ...resolved, {issueKey: "still-open", customer: "Buyer", status: "unresolved", evidence: ["Replacement still missing."]},
  ]}, now);
  const data = snapshot();
  data.knowledge = parseTuesdayKnowledge(JSON.parse(JSON.stringify(knowledge)), now);
  const result = scanTuesdaySnapshot(data, now);
  assert.equal(result.status, "partial");
  assert.equal(result.totalIssues, 1);
  assert.match(result.issues[0]?.facts.join(" ") ?? "", /Replacement still missing/);
});

test("nested message, agreement and text caps preserve partial evidence coverage", () => {
  const message = {id: "m1", sentAt: now, sender: "buyer", text: "Use white."};
  const agreement = {status: "final", text: "Use white.", messageIds: ["m1"]};
  const conversation = {threadId: "123", buyerName: "Buyer", checkedAt: now, historyComplete: true,
    orderIds: [], messages: [message], agreements: [agreement]};
  const capped = [
    {...conversation, messages: Array.from({length: ASK_TUESDAY.maxMessagesPerConversation + 1}, (_, index) => ({...message, id: `m-${index}`})), agreements: []},
    {...conversation, agreements: Array.from({length: ASK_TUESDAY.maxMessagesPerConversation + 1}, () => agreement)},
    {...conversation, messages: [{...message, text: "x".repeat(ASK_TUESDAY.maxTextLength + 1)}], agreements: []},
    {...conversation, agreements: [{...agreement, text: "x".repeat(ASK_TUESDAY.maxTextLength + 1)}]},
  ];
  for (const source of capped) {
    const data = snapshot();
    data.knowledge = parseTuesdayKnowledge({...data.knowledge, conversations: [source]}, now);
    assert.equal(data.knowledge.evidenceTruncated, true);
    assert.equal(scanTuesdaySnapshot(data, now).status, "partial");
  }
  const last = parseTuesdayKnowledge({...snapshot().knowledge, conversations: [capped.at(-1)]}, now);
  assert.equal(last.conversations[0]?.agreements.length, 0);
});

test("the automatic scan authenticates before loading data and ignores employee filters", async () => {
  let reads = 0;
  let received: unknown;
  const req = new Request("http://localhost/api/ask-tuesday/scan?orderSearch=Someone");
  const deps = {authorize: async () => false, load: async (input: unknown) => {reads += 1; received = input; return snapshot();}, now: () => now};
  const rejected = await handleTuesdayScan(req, deps);
  assert.equal(rejected.status, 401);
  assert.equal(reads, 0);
  const accepted = await handleTuesdayScan(req, {...deps, authorize: async () => true});
  assert.equal(accepted.status, 200);
  assert.deepEqual(received, {question: "What needs attention?", page: "/orders"});
  assert.equal((await accepted.json()).mode, "issue-scan");
  assert.equal(accepted.headers.get("cache-control"), "private, no-store");
});
