import assert from "node:assert/strict";
import test from "node:test";
import type { Db } from "mongodb";
import { loadTuesdaySnapshot } from "../lib/ask-tuesday/server";
import { ASK_TUESDAY } from "../config/ask-tuesday";
import { searchTuesdayRecords } from "../lib/ask-tuesday/search";
import { scanTuesdaySnapshot } from "../lib/ask-tuesday/scan";
import { conversationSourceFingerprint } from "../lib/ask-tuesday/summaries";
import { TUESDAY_SUMMARIES } from "../config/tuesday-summaries";

const now = "2026-10-06T23:30:00.000Z";
const input = {question: "What did Harrison request?", page: "/orders"};
const localKnowledge = JSON.stringify({schemaVersion: 1, importedAt: now, reviewObservedOn: "2026-10-06",
  sourceUpdatedAt: now, limitations: [], findings: [], conversations: []});

test("hosted summaries enrich matching active messages without refreshing the source date", async () => {
  const sourceCheckedAt = "2026-10-06T20:00:00.000Z";
  const conversation = {threadId: "1700000001", buyerName: "Active Buyer", checkedAt: sourceCheckedAt,
    historyComplete: true, orderIds: ["active"], agreements: [],
    messages: [{id: "buyer-1", sentAt: "2026-10-06T19:00:00.000Z", sender: "buyer" as const, text: "Please use white."}]};
  const summary = {text: "The buyer requests white.", highlights: ["Use white."], nextAction: null,
    evidence: [{sender: "buyer" as const, text: "Please use white."}]};
  const saved = {schemaVersion: 1, importedAt: now, reviewObservedOn: "2026-10-06",
    sourceUpdatedAt: sourceCheckedAt, limitations: [], findings: [], conversations: [conversation]};
  const cache = {_id: conversation.threadId, fingerprint: conversationSourceFingerprint(conversation), generatedAt: now, summary};
  const db = {collection(name: string) {return {
    find() {return {sort() {return this;}, limit() {return this;}, async toArray() {
      if (name.startsWith("items-")) return [{id: "active", customerName: "Active Buyer", status: "New", visible: true, deleted: false}];
      return name.startsWith(TUESDAY_SUMMARIES.collection) ? [cache] : [];
    }};}, async findOne() {return name.startsWith(ASK_TUESDAY.knowledgeCollection) ? saved : null;},
  };}} as unknown as Db;
  const snapshot = await loadTuesdaySnapshot({question: "What needs attention?", page: "/orders"}, {
    getDb: async () => db, readKnowledge: async () => localKnowledge, now: () => now, mode: "test",
  });
  assert.deepEqual(snapshot.knowledge?.conversations[0]?.summary, summary);
  assert.equal(snapshot.knowledge?.conversations[0]?.checkedAt, sourceCheckedAt);
  assert.equal(snapshot.knowledge?.sourceUpdatedAt, sourceCheckedAt);
  assert.equal(Object.hasOwn(saved.conversations[0]!, "summary"), false);
  assert.deepEqual(scanTuesdaySnapshot(snapshot, now).customerChats?.[0]?.summary, summary);
});

test("summary cache outages leave active checks and original messages available", async () => {
  const saved = {schemaVersion: 1, importedAt: now, limitations: [], findings: [], conversations: [{
    threadId: "1700000001", buyerName: "Active Buyer", checkedAt: now, historyComplete: true,
    orderIds: ["active"], agreements: [], messages: [{id: "buyer-1", sentAt: now, sender: "buyer", text: "Please use white."}],
  }]};
  const db = {collection(name: string) {return {
    find() {return {sort() {return this;}, limit() {return this;}, async toArray() {
      if (name.startsWith(TUESDAY_SUMMARIES.collection)) throw new Error("Summary cache unavailable");
      return name.startsWith("items-") ? [{id: "active", customerName: "Active Buyer", status: "New", visible: true, deleted: false, dueDate: "2026-10-01"}] : [];
    }};}, async findOne() {return name.startsWith(ASK_TUESDAY.knowledgeCollection) ? saved : null;},
  };}} as unknown as Db;
  const snapshot = await loadTuesdaySnapshot({question: "What needs attention?", page: "/orders"}, {
    getDb: async () => db, readKnowledge: async () => localKnowledge, now: () => now, mode: "test",
  });
  assert.equal(snapshot.ordersCheckedAt, now);
  assert.equal(snapshot.knowledge?.conversations[0]?.messages[0]?.text, "Please use white.");
  assert.equal(snapshot.knowledge?.conversations[0]?.summary, undefined);
  assert.equal(scanTuesdaySnapshot(snapshot, now).totalIssues, 1);
});

test("direct database reads use projections and literal bounded customer queries without writes", async () => {
  const queries: {name: string; filter: unknown; projection: unknown; limit?: number}[] = [];
  const db = {collection(name: string) {
    return {
      find(filter: unknown, options: {projection: unknown}) {
        const entry = {name, filter, projection: options.projection, limit: 0};
        queries.push(entry);
        return {sort() {return this;}, limit(count: number) {entry.limit = count; return this;},
          async toArray() {return name.startsWith("items-") ? [{id: "local-order", customerName: "Harrison", status: "New", visible: true, deleted: false}] : [];}};
      }, async findOne() {return null;},
    };
  }} as unknown as Db;
  const result = await loadTuesdaySnapshot(input, {getDb: async () => db, readKnowledge: async () => localKnowledge, now: () => now, mode: "test"});
  assert.equal(result.orders[0]?.id, "local-order");
  assert.equal(result.ordersCheckedAt, now);
  assert.equal(result.knowledge?.reviewObservedOn, "2026-10-06");
  assert.equal(queries[0]?.name, "items-test");
  const filter = queries[0]?.filter as {$and: {$or: {customerName?: {$regex: string}}[]}[]};
  const pattern = filter.$and[0]?.$or.find(field => field.customerName)?.customerName?.$regex ?? "";
  assert.equal(new RegExp(pattern, "iu").test("Harrison Winn"), true);
  assert.equal(new RegExp(pattern, "iu").test("Different Buyer"), false);
  assert.equal((queries[0]?.projection as Record<string, unknown>).shippingDetails, undefined);
  assert.equal(queries[0]?.limit, ASK_TUESDAY.maxLoadedOrders + 1);
});

test("a separate status-only read excludes Done findings even when the active query has no matches", async () => {
  const itemQueries: {filter: Record<string, unknown>; projection: Record<string, unknown>}[] = [];
  const db = {collection(name: string) {return {
    find(filter: Record<string, unknown>, options: {projection: Record<string, unknown>}) {
      if (name.startsWith("items-")) itemQueries.push({filter, projection: options.projection});
      const isStatusRead = name.startsWith("items-") && !options.projection.notes;
      return {sort() {return this;}, limit() {return this;}, async toArray() {
        return isStatusRead ? [{id: "completed-order", customerName: "[EW] Harrison Winn", status: "Done"}] : [];
      }};
    }, async findOne() {return null;},
  };}} as unknown as Db;
  const saved = JSON.stringify({schemaVersion: 1, importedAt: now, reviewObservedOn: "2026-10-06", limitations: [],
    findings: [{key: "saved-issue", customer: "Harrison Winn", status: "unresolved", evidence: ["Check palette"],
      action: null, observedOn: "2026-10-06", sources: [], uncertainty: []}], conversations: []});
  const result = await loadTuesdaySnapshot(input, {getDb: async () => db, readKnowledge: async () => saved, now: () => now, mode: "test"});
  assert.equal(searchTuesdayRecords(input, result, now).totalMatches, 0);
  assert.equal(scanTuesdaySnapshot(result, now).totalIssues, 0);
  assert.deepEqual(itemQueries[0]?.filter.status, {$nin: ["Done", "Hidden"]});
  assert.equal(itemQueries.length, 2);
  const statusRead = itemQueries.find(query => !query.projection.notes)!;
  assert.equal(statusRead.filter.$and, undefined);
  assert.deepEqual(Object.keys(statusRead.projection).sort(), ["_id", "customerName", "id", "status"]);
});

test("failed or capped status reads cannot expose saved issues or crowd out active alerts", async () => {
  for (const fail of [true, false]) {
    const db = {collection(name: string) {return {
      find(_filter: unknown, options: {projection: Record<string, unknown>}) {
        const isStatusRead = name.startsWith("items-") && !options.projection.notes;
        return {sort() {return this;}, limit() {return this;}, async toArray() {
          if (isStatusRead) {
            if (fail) throw new Error("Status source unavailable");
            return Array.from({length: ASK_TUESDAY.maxLoadedOrderStates + 1}, (_, index) => ({id: `done-${index}`, customerName: "Buyer", status: "Done"}));
          }
          return name.startsWith("items-") ? [{id: "active", customerName: "Active Buyer", status: "New", visible: true, deleted: false, dueDate: "2026-10-01"}] : [];
        }};
      }, async findOne() {return null;},
    };}} as unknown as Db;
    const saved = JSON.stringify({schemaVersion: 1, importedAt: now, limitations: [], conversations: [],
      findings: [{key: "saved", customer: "Buyer", status: "unresolved", evidence: ["Old problem"],
        action: null, observedOn: "2026-10-06", sources: [], uncertainty: []}]});
    const result = await loadTuesdaySnapshot({question: "What needs attention?", page: "/orders"}, {
      getDb: async () => db, readKnowledge: async () => saved, now: () => now, mode: "test",
    });
    const scan = scanTuesdaySnapshot(result, now);
    assert.equal(scan.status, "partial");
    assert.deepEqual(scan.issues.map(issue => issue.orderId), ["active"]);
    assert.match(scan.limitations.join(" "), /order status.*(?:unavailable|incomplete)/i);
  }
});

test("missing database does not turn a local saved review into a live order check", async () => {
  const result = await loadTuesdaySnapshot(input, {getDb: async () => {throw new Error("offline");}, readKnowledge: async () => localKnowledge, now: () => now, mode: "test"});
  assert.equal(result.ordersCheckedAt, null);
  assert.equal(result.activitiesCheckedAt, null);
  assert.equal(result.knowledge?.reviewObservedOn, "2026-10-06");
  assert.match(result.limitations.join(" "), /Live orders.*unavailable/i);
});

test("invalid saved knowledge stays unavailable rather than supplying unverified facts", async () => {
  const result = await loadTuesdaySnapshot(input, {getDb: async () => {throw new Error("offline");}, readKnowledge: async () => '{"findings":"fake"}', now: () => now, mode: "test"});
  assert.equal(result.knowledge, null);
  assert.match(result.limitations.join(" "), /saved.*unavailable/i);
});

test("record limits are reported and never silently imply complete coverage", async () => {
  const db = {collection(name: string) {return {
    find() {return {sort() {return this;}, limit() {return this;}, async toArray() {
      return name.startsWith("items-") ? Array.from({length: ASK_TUESDAY.maxLoadedOrders + 1}, (_, id) => ({id: String(id)})) : [];
    }};}, async findOne() {return null;},
  };}} as unknown as Db;
  const result = await loadTuesdaySnapshot({question: "What needs attention?", page: "/orders"}, {
    getDb: async () => db, readKnowledge: async () => localKnowledge, now: () => now, mode: "test",
  });
  assert.equal(result.orders.length, ASK_TUESDAY.maxLoadedOrders);
  assert.equal(result.ordersTruncated, true);
});

test("a corrupt dedicated database document falls back to valid local evidence", async () => {
  const db = {collection() {return {
    find() {return {sort() {return this;}, limit() {return this;}, async toArray() {return [];}};},
    async findOne() {return {schemaVersion: 1, importedAt: now, findings: "corrupt", conversations: "corrupt", limitations: []};},
  };}} as unknown as Db;
  const result = await loadTuesdaySnapshot(input, {getDb: async () => db, readKnowledge: async () => localKnowledge, now: () => now, mode: "test"});
  assert.equal(result.knowledge?.reviewObservedOn, "2026-10-06");
});

test("database name searches match both accented and decomposed customer spellings literally", async () => {
  let pattern = "";
  const db = {collection(name: string) {return {
    find(filter: { $and?: { $or: { customerName?: {$regex: string} }[] }[] }) {
      if (name.startsWith("items-") && filter.$and) pattern = filter.$and[0]?.$or.find(field => field.customerName)?.customerName?.$regex ?? "";
      return {sort() {return this;}, limit() {return this;}, async toArray() {return [];}};
    }, async findOne() {return null;},
  };}} as unknown as Db;
  await loadTuesdaySnapshot({question: "What did José request?", page: "/orders"}, {
    getDb: async () => db, readKnowledge: async () => localKnowledge, now: () => now, mode: "test",
  });
  const regex = new RegExp(pattern, "iu");
  assert.equal(regex.test("José"), true);
  assert.equal(regex.test("Jose\u0301"), true);
  assert.equal(regex.test("Different buyer"), false);
});
