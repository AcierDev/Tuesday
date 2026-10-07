import assert from "node:assert/strict";
import test from "node:test";
import type { Db } from "mongodb";
import { loadTuesdaySnapshot } from "../lib/ask-tuesday/server";
import { ASK_TUESDAY } from "../config/ask-tuesday";

const now = "2026-10-06T23:30:00.000Z";
const input = {question: "What did Harrison request?", page: "/orders"};
const localKnowledge = JSON.stringify({schemaVersion: 1, importedAt: now, reviewObservedOn: "2026-10-06",
  sourceUpdatedAt: now, limitations: [], findings: [], conversations: []});

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
      if (name.startsWith("items-")) pattern = filter.$and?.[0]?.$or.find(field => field.customerName)?.customerName?.$regex ?? "";
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
