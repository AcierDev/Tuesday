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

test("saved unresolved findings retain quotes, dates and uncertainty, including completed orders", () => {
  const data = snapshot([order("done", {status: ItemStatus.Done})]);
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
