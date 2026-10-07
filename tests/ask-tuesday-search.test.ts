import assert from "node:assert/strict";
import test from "node:test";
import { ItemStatus } from "../typings/types";
import { ASK_TUESDAY } from "../config/ask-tuesday";
import { searchTuesdayRecords, planTuesdaySearch } from "../lib/ask-tuesday/search";
import type { AskOrder, TuesdayKnowledge, TuesdaySnapshot } from "../lib/ask-tuesday/types";

const now = "2026-10-06T23:30:00.000Z";
const order = (overrides: Partial<AskOrder> = {}): AskOrder => ({
  id: "tuesday-harrison", customerName: "Harrison Winn", design: "Timberline",
  size: "16 x 24", notes: "Light to medium tan; no dark brown. Linkage needs review.",
  status: ItemStatus.New, visible: true, deleted: false, dueDate: "2026-10-12",
  ...overrides,
});
const knowledge: TuesdayKnowledge = {
  schemaVersion: 1, importedAt: now, reviewObservedOn: "2026-10-06",
  sourceUpdatedAt: "2026-10-06T23:06:00Z", limitations: ["Not every full history is saved."],
  findings: [{key: "etsy:4192583968:artwork-account-linkage", customer: "Harrison Winn / Donn Winn",
    status: "unresolved", evidence: ["Tan palette agreement exists; receipt linkage is unverified."],
    action: "Verify the actual buyer history before production.", observedOn: "2026-10-06",
    sources: [{label: "Etsy conversation 1701319028", href: "https://www.etsy.com/messages/1701319028"}],
    uncertainty: ["Account linkage unverified."],
  }], conversations: [],
};
const snapshot = (overrides: Partial<TuesdaySnapshot> = {}): TuesdaySnapshot => ({
  orders: [order()], activities: [], knowledge,
  ordersCheckedAt: now, activitiesCheckedAt: now,
  ordersTruncated: false, activitiesTruncated: false, limitations: [], ...overrides,
});

test("a natural customer question retrieves actual records without inventing Etsy checks", () => {
  const response = searchTuesdayRecords({question: "What changes did Harrison request?", page: "/orders"}, snapshot(), now);
  assert.equal(response.mode, "record-search");
  assert.equal(response.results.length, 2);
  assert.equal(response.results.find(r => r.kind === "order")?.orderId, "tuesday-harrison");
  assert.match(response.results.find(r => r.kind === "finding")?.facts.join(" ") ?? "", /linkage is unverified/);
  assert.equal(response.capabilities.liveEtsy, "unavailable");
  assert.equal(response.capabilities.inference, "unavailable");
  assert.equal(response.freshness.reviewObservedOn, "2026-10-06");
  assert.equal(response.results.find(r => r.kind === "finding")?.observedPrecision, "date");
});

test("attention ignores held, completed, hidden, deleted and discontinued framed work", () => {
  const response = searchTuesdayRecords({question: "Which orders need attention?", page: "/orders"}, snapshot({knowledge: null,
    orders: [order({id: "overdue", dueDate: "2026-10-05"}),
      order({id: "held", dueDate: "2026-10-01", onHold: true}),
      order({id: "done", dueDate: "2026-10-01", status: ItemStatus.Done}),
      order({id: "hidden", dueDate: "2026-10-01", visible: false}),
      order({id: "deleted", dueDate: "2026-10-01", deleted: true}),
      order({id: "framed", design: "Small framed geometric", dueDate: "2026-10-01"})],
  }), now);
  assert.deepEqual(response.results.map(r => r.orderId), ["overdue"]);
  assert.match(response.results[0]?.detail ?? "", /Overdue/);
});

test("the attention shortcut retains actionable findings whose resolution is unknown", () => {
  const response = searchTuesdayRecords({question: "What needs attention?", page: "/orders"}, snapshot({orders: [],
    knowledge: {...knowledge, findings: [{...knowledge.findings[0]!, status: "unknown"}]},
  }), now);
  assert.equal(response.results.length, 1);
  assert.equal(response.results[0]?.kind, "finding");
  assert.match(response.results[0]?.uncertainty.join(" ") ?? "", /unknown/i);
});

test("due tomorrow uses Pacific calendar dates and distinguishes due from arrival", () => {
  const response = searchTuesdayRecords({question: "Which orders are due tomorrow?", page: "/orders"}, snapshot({knowledge: null,
    orders: [order({id: "tomorrow", dueDate: "2026-10-07"}), order({id: "today", dueDate: "2026-10-06"})],
  }), now);
  assert.deepEqual(response.results.map(r => r.orderId), ["tomorrow"]);
  assert.match(response.limitations.join(" "), /arrival|promise/i);
});

test("page questions preserve the existing order search without claiming unseen chart data", () => {
  const response = searchTuesdayRecords({question: "What is on this page?", page: "/orders", orderSearch: "Harrison"}, snapshot({orders: [order(), order({id: "barbara", customerName: "Barbara", notes: ""})]}), now);
  assert.equal(response.results.filter(r => r.kind === "order").length, 1);
  assert.match(response.summary, /Orders/);
  const stats = searchTuesdayRecords({question: "What is on this page?", page: "/stats/overview"}, snapshot(), now);
  assert.match(stats.limitations.join(" "), /chart|filter|page/i);
});

test("recent activity is cited without declaring ordinary staff changes unusual", () => {
  const response = searchTuesdayRecords({question: "Any unusual activity?", page: "/orders"}, snapshot({activities: [{
    id: "activity-1", itemId: "tuesday-harrison", timestamp: Date.parse(now), type: "status_change",
    changes: [{field: "status", oldValue: "New", newValue: "On Deck"}], metadata: {customerName: "Harrison Winn"},
  }]}), now);
  assert.equal(response.results.filter(r => r.kind === "activity").length, 1);
  assert.match(response.results.find(r => r.kind === "activity")?.facts.join(" ") ?? "", /New.*On Deck/);
  assert.match(response.limitations.join(" "), /unusual|anomaly/i);
});

test("unknown terms and unavailable sources never become canned answers", () => {
  const response = searchTuesdayRecords({question: "What did ZzNonexistent request?", page: "/orders"}, snapshot({ordersCheckedAt: null}), now);
  assert.equal(response.results.length, 0);
  assert.match(response.summary, /No matching/i);
  assert.equal(response.freshness.ordersCheckedAt, null);
  assert.match(response.limitations.join(" "), /Etsy|conversation/i);
});

test("message snapshots preserve final, proposal and superseded agreements with original quotes", () => {
  const response = searchTuesdayRecords({question: "What did Harrison agree?", page: "/orders"}, snapshot({knowledge: {
    ...knowledge, conversations: [{threadId: "1701319028", buyerName: "Harrison Winn", checkedAt: now, historyComplete: true,
      orderIds: [], messages: [{id: "m1", sentAt: "2026-10-03T14:00:00Z", sender: "buyer", text: "Light tan, no dark brown."}],
      agreements: [{status: "final", text: "Light tan, no dark brown.", messageIds: ["m1"]},
        {status: "proposal", text: "Try a darker render?", messageIds: ["m1"]}],
    }],
  }}), now);
  const conversation = response.results.find(r => r.kind === "conversation");
  assert.deepEqual(conversation?.agreements?.map(a => a.status), ["final", "proposal"]);
  assert.equal(conversation?.messages?.[0]?.text, "Light tan, no dark brown.");
  assert.equal(conversation?.observedAt, now);
});

test("search terms are literal, bounded, and customer words survive question boilerplate", () => {
  assert.deepEqual(planTuesdaySearch({question: "What changes did Harrison request?", page: "/orders"}).terms, ["harrison"]);
  assert.equal(planTuesdaySearch({question: "[.*]", page: "/orders"}).intent, "search");
});

test("generic due-order matches cannot bury saved customer issues beyond the response limit", () => {
  const response = searchTuesdayRecords({question: "What needs attention?", page: "/orders"}, snapshot({orders:
    Array.from({length: ASK_TUESDAY.maxResults + 1}, (_, index) => order({id: `overdue-${index}`, dueDate: "2026-10-01"})),
  }), now);
  assert.equal(response.results[0]?.kind, "finding");
  assert.equal(response.results.length, ASK_TUESDAY.maxResults);
  assert.equal(response.totalMatches, ASK_TUESDAY.maxResults + 2);
  assert.match(response.limitations.join(" "), /Refine/);
});

test("explicit audit exclusions identify only the recorded framed customer row", () => {
  const response = searchTuesdayRecords({question: "Which orders need attention?", page: "/orders"}, snapshot({
    knowledge: {...knowledge, findings: [], excludedAuditCustomers: ["Nirrit Ishaaya (2/3)"]},
    orders: [order({id: "small-frame", customerName: "[EW] Nirrit Ishaaya (2/3)", dueDate: "2026-10-01"}),
      order({id: "large-art", customerName: "[EW] Nirrit Ishaaya (1/3)", dueDate: "2026-10-01"})],
  }), now);
  assert.deepEqual(response.results.map(r => r.orderId), ["large-art"]);
});

test("an external reference can find its saved issue without treating its key as a Tuesday order", () => {
  const response = searchTuesdayRecords({question: "Show 4192583968", page: "/orders"}, snapshot(), now);
  assert.equal(response.results.length, 1);
  assert.equal(response.results[0]?.kind, "finding");
  assert.equal(response.results[0]?.orderId, undefined);
  assert.equal(response.results[0]?.sources[0]?.href, "https://www.etsy.com/messages/1701319028");
});

test("agreement status questions find explicitly labeled final evidence even if its quote omits that word", () => {
  const response = searchTuesdayRecords({question: "What is Harrison's final agreement?", page: "/orders"}, snapshot({knowledge: {
    ...knowledge, conversations: [{threadId: "1701319028", buyerName: "Harrison Winn", checkedAt: now, historyComplete: true,
      orderIds: [], messages: [{id: "m1", sentAt: "2026-10-03T14:00:00Z", sender: "buyer", text: "Mint palette confirmed"}],
      agreements: [{status: "final", text: "Mint palette confirmed", messageIds: ["m1"]}],
    }],
  }}), now);
  assert.equal(response.results.find(r => r.kind === "conversation")?.agreements?.[0]?.status, "final");
});
