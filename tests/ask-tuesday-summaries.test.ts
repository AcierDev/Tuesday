import assert from "node:assert/strict";
import test from "node:test";
import { MongoServerError, type Db } from "mongodb";
import { ASK_TUESDAY } from "../config/ask-tuesday";
import { TUESDAY_SUMMARIES } from "../config/tuesday-summaries";
import {
  cachedConversationSummary, conversationSourceFingerprint, runTuesdaySummaries, summaryGenerationCandidates,
  type SummaryCacheStore, type SummaryDependencies,
} from "../lib/ask-tuesday/summaries";
import { createTuesdaySummaryStore, readTuesdaySummaryCache, summarizeTuesdaySnapshot } from "../lib/server/tuesday-summaries";
import { ItemStatus } from "../typings/types";
import type { AskOrder, ConversationSnapshot, ConversationSummary, TuesdaySnapshot } from "../lib/ask-tuesday/types";

const NOW = "2026-10-07T01:00:00.000Z";
const CHECKED_AT = "2026-10-06T23:00:00.000Z";
const EMPTY_COUNT = 0;
const ONE = 1;
const LATER = "2026-10-07T01:01:00.000Z";
const summary: ConversationSummary = {text: "The buyer requested a white palette.", highlights: ["Use white."], nextAction: "Prepare the render.",
  evidence: [{sender: "buyer", text: "Use the white palette."}]};
const conversation = (overrides: Partial<ConversationSnapshot> = {}): ConversationSnapshot => ({
  threadId: "1700000001", buyerName: "Example Buyer", checkedAt: CHECKED_AT, historyComplete: true, orderIds: ["active"],
  messages: [{id: "buyer-1", sentAt: CHECKED_AT, sender: "buyer", text: "Use the white palette."},
    {id: "seller-1", sentAt: CHECKED_AT, sender: "seller", text: "I will prepare a render."}],
  agreements: [{status: "proposal", text: "White palette", messageIds: ["buyer-1"]}], ...overrides,
});
const order = (id: string, overrides: Partial<AskOrder> = {}): AskOrder => ({
  id, customerName: "Example Buyer", status: ItemStatus.New, visible: true, deleted: false, ...overrides,
});
const snapshot = (conversations: ConversationSnapshot[] = [conversation()], orders: AskOrder[] = [order("active")]): TuesdaySnapshot => ({
  orders, activities: [], ordersCheckedAt: NOW, activitiesCheckedAt: NOW, ordersTruncated: false, activitiesTruncated: false, limitations: [],
  orderScope: {orders, checkedAt: NOW, truncated: false},
  knowledge: {schemaVersion: ONE, importedAt: NOW, reviewObservedOn: "2026-10-06", sourceUpdatedAt: CHECKED_AT, limitations: [], findings: [], conversations},
});
const cached = (source = conversation(), extra: Record<string, unknown> = {}) => ({
  _id: source.threadId, fingerprint: conversationSourceFingerprint(source), generatedAt: NOW, summary, ...extra,
});

function harness(output: string = JSON.stringify(summary)) {
  const cache = new Map<string, Record<string, unknown>>();
  const prompts: string[] = [];
  let token = EMPTY_COUNT;
  const store: SummaryCacheStore = {
    read: async id => cache.get(id) ?? null,
    claim: async (id, fingerprint, attemptedAt, attemptToken, observedCache) => {
      const current = cache.get(id);
      const observed = observedCache as {revision?: string} | null;
      if (current?.revision !== observed?.revision) return false;
      if (typeof current?.attemptUntil === "number" && current.attemptUntil > Date.parse(attemptedAt)) return false;
      if (current?.fingerprint === fingerprint && typeof current.retryAfter === "string" && Date.parse(current.retryAfter) > Date.parse(attemptedAt)) return false;
      cache.set(id, {fingerprint, _id: id, attemptedAt, attemptToken, revision: attemptToken, attemptUntil: Date.parse(attemptedAt) + TUESDAY_SUMMARIES.attemptLeaseMs,
        retryAfter: new Date(Date.parse(attemptedAt) + TUESDAY_SUMMARIES.failureCooldownMs).toISOString()});
      return true;
    },
    save: async (id, fingerprint, attemptToken, generatedAt, savedSummary) => {
      const current = cache.get(id);
      if (current?.fingerprint !== fingerprint || current.attemptToken !== attemptToken) return false;
      cache.set(id, {_id: id, fingerprint, generatedAt, summary: savedSummary, revision: current.revision});
      return true;
    },
    fail: async (id, fingerprint, attemptToken, failedAt) => {
      const current = cache.get(id);
      if (current?.fingerprint === fingerprint && current.attemptToken === attemptToken) cache.set(id, {_id: id, fingerprint,
        attemptedAt: current.attemptedAt, revision: current.revision, retryAfter: new Date(Date.parse(failedAt) + TUESDAY_SUMMARIES.failureCooldownMs).toISOString()});
    },
  };
  const dependencies: SummaryDependencies = {enabled: true, store, now: () => NOW, newToken: () => `attempt-${++token}`,
    generate: async prompt => {prompts.push(prompt); return output;}};
  return {cache, prompts, dependencies};
}

test("the source fingerprint changes for every message, identity, linkage, date and evidence change", () => {
  const source = conversation();
  const fingerprint = conversationSourceFingerprint(source);
  assert.match(fingerprint, /^[a-f0-9]+$/);
  const edits: Partial<ConversationSnapshot>[] = [
    {threadId: "1700000002"}, {buyerName: "Different Buyer"}, {orderIds: ["different"]},
    {checkedAt: NOW}, {historyComplete: false}, {evidenceTruncated: true},
    {messages: source.messages.map(message => ({...message, text: `${message.text} Updated.`}))},
    {messages: source.messages.map(message => ({...message, sentAt: NOW}))},
    {messages: source.messages.map(message => ({...message, id: `${message.id}-edited`}))},
    {messages: source.messages.map(message => ({...message, sender: "seller"}))},
    {agreements: [{status: "superseded", text: "White palette", messageIds: ["buyer-1"]}]},
  ];
  for (const edit of edits) assert.notEqual(conversationSourceFingerprint({...source, ...edit}), fingerprint);
  assert.equal(conversationSourceFingerprint({...source, summary}), fingerprint);
  assert.equal(conversationSourceFingerprint(conversation({orderIds: ["active", "other"]})),
    conversationSourceFingerprint(conversation({orderIds: ["other", "active"]})));
});

test("cached summaries require the exact complete source hash and faithful buyer quotes", () => {
  const source = conversation();
  assert.deepEqual(cachedConversationSummary(cached(source), source, NOW), summary);
  for (const change of [
    {_id: "other"}, {fingerprint: "wrong"}, {generatedAt: "2030-01-01T00:00:00.000Z"}, {generatedAt: "not-a-date"},
    {generatedAt: "2026-10-06T20:00:00.000Z"}, {summary: {...summary, evidence: [{sender: "buyer", text: "Use blue instead."}]}},
  ]) assert.equal(cachedConversationSummary(cached(source, change), source, NOW), null);
  assert.equal(cachedConversationSummary(cached(source), conversation({messages: [...source.messages,
    {id: "buyer-2", sender: "buyer", text: "Actually, make it blue.", sentAt: CHECKED_AT}]}), NOW), null);
});

test("Done, unknown, inferred, disputed and seller-only conversations do not generate summaries", async () => {
  const rejected = [
    snapshot([conversation()], [order("active", {status: ItemStatus.Done})]),
    snapshot([conversation({orderIds: []})]), snapshot([conversation({orderIds: ["unknown"]})]),
    snapshot([conversation({buyerName: "", orderIds: []})]),
    snapshot([conversation({messages: conversation().messages.filter(message => message.sender === "seller")})]),
    {...snapshot(), ordersCheckedAt: null},
    {...snapshot(), orderScope: {orders: [order("active")], checkedAt: NOW, truncated: true}},
    {...snapshot(), orderScope: {orders: [order("active", {status: ItemStatus.Done})], checkedAt: NOW, truncated: false}},
    snapshot([conversation({orderIds: ["active", "done"]})], [order("active"), order("done", {status: ItemStatus.Done})]),
  ];
  for (const data of rejected) {
    const h = harness();
    assert.deepEqual(await runTuesdaySummaries(data, NOW, h.dependencies), {generated: EMPTY_COUNT, failed: EMPTY_COUNT});
    assert.equal(h.prompts.length, EMPTY_COUNT);
    assert.deepEqual(summaryGenerationCandidates(data), []);
  }
});

test("valid summaries, missing credentials and oversized source histories never invoke the model", async () => {
  const h = harness();
  assert.deepEqual(await runTuesdaySummaries(snapshot([conversation({summary})]), NOW, h.dependencies), {generated: EMPTY_COUNT, failed: EMPTY_COUNT});
  assert.deepEqual(await runTuesdaySummaries(snapshot(), NOW, {...h.dependencies, enabled: false}), {generated: EMPTY_COUNT, failed: EMPTY_COUNT});
  const text = "a".repeat(TUESDAY_SUMMARIES.maxPromptBytes);
  await runTuesdaySummaries(snapshot([conversation({messages: [{id: "large", sentAt: CHECKED_AT, sender: "buyer", text}]})]), NOW, h.dependencies);
  assert.equal(h.prompts.length, EMPTY_COUNT);
});

test("successful generation is bounded, cached separately, and never refreshes source timestamps", async () => {
  const conversations = Array.from({length: TUESDAY_SUMMARIES.maxGenerationsPerRun + ONE}, (_, index) => conversation({threadId: `17000000${index}`}));
  const data = snapshot(conversations);
  const original = JSON.stringify(data);
  const h = harness();
  const result = await runTuesdaySummaries(data, NOW, h.dependencies);
  assert.equal(result.generated, TUESDAY_SUMMARIES.maxGenerationsPerRun);
  assert.equal(h.prompts.length, TUESDAY_SUMMARIES.maxGenerationsPerRun);
  assert.equal(JSON.stringify(data), original);
  assert.deepEqual(cachedConversationSummary(h.cache.get(conversations[EMPTY_COUNT]!.threadId), conversations[EMPTY_COUNT]!, NOW), summary);
  await runTuesdaySummaries(snapshot([conversations[EMPTY_COUNT]!]), NOW, h.dependencies);
  assert.equal(h.prompts.length, TUESDAY_SUMMARIES.maxGenerationsPerRun);
});

test("fabricated quotes and invalid or oversized model JSON fail without caching a summary", async () => {
  const outputs = ["not JSON", JSON.stringify({...summary, evidence: [{sender: "buyer", text: "Invented promise."}]}),
    JSON.stringify({...summary, text: "a".repeat(ASK_TUESDAY.maxSummaryLength + ONE)}), "a".repeat(TUESDAY_SUMMARIES.maxOutputBytes + ONE)];
  for (const output of outputs) {
    const h = harness(output);
    assert.deepEqual(await runTuesdaySummaries(snapshot(), NOW, h.dependencies), {generated: EMPTY_COUNT, failed: ONE});
    assert.equal(h.cache.get(conversation().threadId)?.summary, undefined);
    await runTuesdaySummaries(snapshot(), LATER, {...h.dependencies, now: () => LATER});
    assert.equal(h.prompts.length, ONE);
  }
});

test("model timeouts abort generation and retain a source-specific retry cooldown", async () => {
  const h = harness();
  let signal: AbortSignal | undefined;
  const result = await runTuesdaySummaries(snapshot(), NOW, {...h.dependencies,
    generate: async (_prompt, options) => {signal = options.signal; return new Promise<string>(() => {});},
    scheduleTimeout: handler => {queueMicrotask(handler); return () => {};},
  });
  assert.deepEqual(result, {generated: EMPTY_COUNT, failed: ONE});
  assert.equal(signal?.aborted, true);
  assert.equal(h.cache.get(conversation().threadId)?.summary, undefined);
  assert.ok(Date.parse(String(h.cache.get(conversation().threadId)?.retryAfter)) > Date.parse(LATER));
});

test("a changed source can retry after a failure while the old source stays cooling down", async () => {
  const h = harness("invalid JSON");
  await runTuesdaySummaries(snapshot(), NOW, h.dependencies);
  const edited = conversation({messages: [...conversation().messages, {id: "buyer-new", sender: "buyer", sentAt: CHECKED_AT, text: "Please send the render."}]});
  const result = await runTuesdaySummaries(snapshot([edited]), LATER, {...h.dependencies, now: () => LATER,
    generate: async prompt => {h.prompts.push(prompt); return JSON.stringify(summary);}});
  assert.deepEqual(result, {generated: ONE, failed: EMPTY_COUNT});
  assert.equal(h.prompts.length, TUESDAY_SUMMARIES.maxGenerationsPerRun);
  assert.deepEqual(cachedConversationSummary(h.cache.get(edited.threadId), edited, LATER), summary);
});

test("overlapping workers share one source attempt instead of duplicating paid generation", async () => {
  const h = harness();
  let release!: (value: string) => void;
  const pending = new Promise<string>(resolve => {release = resolve;});
  const dependencies = {...h.dependencies, generate: async (prompt: string) => {h.prompts.push(prompt); return pending;}};
  const first = runTuesdaySummaries(snapshot(), NOW, dependencies);
  const second = runTuesdaySummaries(snapshot(), NOW, dependencies);
  await new Promise<void>(resolve => setImmediate(resolve));
  release(JSON.stringify(summary));
  const results = await Promise.all([first, second]);
  assert.equal(results.reduce((total, result) => total + result.generated, EMPTY_COUNT), ONE);
  assert.equal(results.reduce((total, result) => total + result.failed, EMPTY_COUNT), EMPTY_COUNT);
  assert.equal(h.prompts.length, ONE);
});

test("lost attempt ownership prevents success and leaves no authoritative cached summary", async () => {
  const h = harness();
  const result = await runTuesdaySummaries(snapshot(), NOW, {...h.dependencies, store: {...h.dependencies.store, save: async () => false}});
  assert.deepEqual(result, {generated: EMPTY_COUNT, failed: ONE});
  assert.equal(h.cache.get(conversation().threadId)?.summary, undefined);
});

test("failed model calls also consume the generation budget and preserve complete source history in the prompt", async () => {
  const conversations = Array.from({length: TUESDAY_SUMMARIES.maxGenerationsPerRun + ONE}, (_, index) => conversation({threadId: `18000000${index}`}));
  const h = harness();
  const result = await runTuesdaySummaries(snapshot(conversations), NOW, {...h.dependencies,
    generate: async prompt => {h.prompts.push(prompt); throw new Error("Synthetic provider failure");}});
  assert.equal(result.failed, TUESDAY_SUMMARIES.maxGenerationsPerRun);
  assert.equal(h.prompts.length, TUESDAY_SUMMARIES.maxGenerationsPerRun);
  for (const message of conversations[EMPTY_COUNT]!.messages) assert.ok(h.prompts[EMPTY_COUNT]!.includes(message.text));
});

test("summary storage publishes only with matching source, owner token and unexpired attempt", async () => {
  const writes: {name: string; filter: Record<string, unknown>; update: Record<string, unknown>}[] = [];
  const db = {collection(name: string) {return {
    async findOne() {return null;},
    async findOneAndUpdate(filter: Record<string, unknown>, update: {$set: {attemptToken: string}}) {
      writes.push({name, filter, update}); return {attemptToken: update.$set.attemptToken};
    },
    async updateOne(filter: Record<string, unknown>, update: Record<string, unknown>) {
      writes.push({name, filter, update});
      const until = filter.attemptUntil as {$gt?: number} | undefined;
      return {matchedCount: filter._id === conversation().threadId && filter.fingerprint === "source-hash"
        && filter.attemptToken === "owner" && until?.$gt === Date.parse(NOW) ? ONE : EMPTY_COUNT};
    },
  };}} as unknown as Db;
  const store = createTuesdaySummaryStore(db, "test");
  assert.equal(await store.claim(conversation().threadId, "source-hash", NOW, "owner"), true);
  assert.equal(await store.save(conversation().threadId, "source-hash", "owner", NOW, summary), true);
  assert.equal(await store.save(conversation().threadId, "source-hash", "old-owner", NOW, summary), false);
  assert.ok(writes.every(write => write.name === "ask-tuesday-summaries-test"));
  const claim = writes[EMPTY_COUNT]!;
  assert.deepEqual(claim.filter._id, conversation().threadId);
  assert.ok(Array.isArray(claim.filter.$and));
  const claimSet = claim.update.$set as Record<string, unknown>;
  assert.ok(Number(claimSet.attemptUntil) > Date.parse(NOW));
  assert.ok(Date.parse(String(claimSet.retryAfter)) > Date.parse(LATER));
  const save = writes[ONE]!;
  assert.deepEqual(save.filter, {_id: conversation().threadId, fingerprint: "source-hash", attemptToken: "owner", attemptUntil: {$gt: Date.parse(NOW)}});
  assert.equal((save.update.$set as Record<string, unknown>).checkedAt, undefined);
  assert.equal((save.update.$set as Record<string, unknown>).importedAt, undefined);
});

test("a competing Mongo attempt cannot bypass the unique thread claim", async () => {
  const db = {collection() {return {async findOneAndUpdate() {
    throw new MongoServerError({message: "Synthetic competing claim", code: TUESDAY_SUMMARIES.duplicateKeyError});
  }};}} as unknown as Db;
  assert.equal(await createTuesdaySummaryStore(db, "test").claim(conversation().threadId, "source", NOW, "owner"), false);
});

test("a stale cache read cannot claim a thread after another worker finishes generation", async () => {
  const currentRevision = "completed-worker";
  const db = {collection() {return {async findOneAndUpdate(filter: Record<string, unknown>, update: {$set: {attemptToken: string}}) {
    const expected = filter.revision;
    const matches = expected === undefined || expected === currentRevision;
    if (!matches) throw new MongoServerError({message: "Synthetic stale cache claim", code: TUESDAY_SUMMARIES.duplicateKeyError});
    return {attemptToken: update.$set.attemptToken};
  }};}} as unknown as Db;
  assert.equal(await createTuesdaySummaryStore(db, "test").claim(conversation().threadId, "source", NOW, "stale-worker", {revision: "earlier-worker"}), false);
});

test("missing model credentials report pending summaries honestly without model calls or writes", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousMode = process.env.NEXT_PUBLIC_MODE;
  try {
    process.env.GEMINI_API_KEY = "";
    process.env.NEXT_PUBLIC_MODE = "test";
    const db = {collection() {return {find() {return {limit() {return this;}, async toArray() {return [];}};}};}} as unknown as Db;
    assert.deepEqual(await summarizeTuesdaySnapshot(snapshot(), db, NOW), {generated: EMPTY_COUNT, failed: ONE});
    assert.deepEqual(await summarizeTuesdaySnapshot(snapshot([]), db, NOW), {generated: EMPTY_COUNT, failed: EMPTY_COUNT});
    const cachedDb = {collection() {return {find() {return {limit() {return this;}, async toArray() {return [cached()];}};}};}} as unknown as Db;
    assert.deepEqual(await summarizeTuesdaySnapshot(snapshot(), cachedDb, NOW), {generated: EMPTY_COUNT, failed: EMPTY_COUNT});
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey;
    if (previousMode === undefined) delete process.env.NEXT_PUBLIC_MODE; else process.env.NEXT_PUBLIC_MODE = previousMode;
  }
});

test("intentionally disabled summary generation exposes pending work without provider calls", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousMode = process.env.NEXT_PUBLIC_MODE;
  const previousEnabled = process.env.ASK_TUESDAY_MONITOR_SUMMARIES_ENABLED;
  try {
    process.env.GEMINI_API_KEY = "synthetic-unused-test-key";
    process.env.NEXT_PUBLIC_MODE = "test";
    process.env.ASK_TUESDAY_MONITOR_SUMMARIES_ENABLED = "false";
    const db = {collection() {return {find() {return {limit() {return this;}, async toArray() {return [];}};}};}} as unknown as Db;
    assert.deepEqual(await summarizeTuesdaySnapshot(snapshot(), db, NOW), {generated: EMPTY_COUNT, failed: ONE});
    const cachedDb = {collection() {return {find() {return {limit() {return this;}, async toArray() {return [cached()];}};}};}} as unknown as Db;
    assert.deepEqual(await summarizeTuesdaySnapshot(snapshot(), cachedDb, NOW), {generated: EMPTY_COUNT, failed: EMPTY_COUNT});
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey;
    if (previousMode === undefined) delete process.env.NEXT_PUBLIC_MODE; else process.env.NEXT_PUBLIC_MODE = previousMode;
    if (previousEnabled === undefined) delete process.env.ASK_TUESDAY_MONITOR_SUMMARIES_ENABLED; else process.env.ASK_TUESDAY_MONITOR_SUMMARIES_ENABLED = previousEnabled;
  }
});

test("cache reads enrich only eligible active source matches and leave imported knowledge unchanged", async () => {
  const data = snapshot();
  const original = JSON.stringify(data.knowledge);
  const calls: {name: string; filter: unknown; limit: number}[] = [];
  const db = {collection(name: string) {return {find(filter: unknown) {
    const call = {name, filter, limit: EMPTY_COUNT}; calls.push(call);
    return {limit(value: number) {call.limit = value; return this;}, async toArray() {return [cached()];}};
  }};}} as unknown as Db;
  const knowledge = await readTuesdaySummaryCache(data, db, "test", NOW);
  assert.deepEqual(knowledge?.conversations[EMPTY_COUNT]?.summary, summary);
  assert.equal(JSON.stringify(data.knowledge), original);
  assert.equal(knowledge?.conversations[EMPTY_COUNT]?.checkedAt, CHECKED_AT);
  assert.equal(knowledge?.importedAt, NOW);
  assert.equal(calls[EMPTY_COUNT]?.name, "ask-tuesday-summaries-test");
  assert.deepEqual(calls[EMPTY_COUNT]?.filter, {_id: {$in: [conversation().threadId]}});
  assert.ok(calls[EMPTY_COUNT]!.limit <= ASK_TUESDAY.maxConversations);
  await readTuesdaySummaryCache(snapshot([conversation()], [order("active", {status: ItemStatus.Done})]), db, "test", NOW);
  assert.equal(calls.length, ONE);
  const failedDb = {collection() {throw new Error("database unavailable");}} as unknown as Db;
  assert.equal(await readTuesdaySummaryCache(data, failedDb, "test", NOW), data.knowledge);
});

test("employee searches and capped active-order reads cannot hide a valid explicitly linked cached summary", async () => {
  const data = snapshot();
  const db = {collection() {return {find() {return {limit() {return this;}, async toArray() {return [cached()];}};}};}} as unknown as Db;
  for (const filtered of [
    {...data, orders: []},
    {...data, orders: Array.from({length: ASK_TUESDAY.maxLoadedOrders}, (_, index) => order(`other-${index}`)), ordersTruncated: true},
  ]) {
    const knowledge = await readTuesdaySummaryCache(filtered, db, "test", NOW);
    assert.deepEqual(knowledge?.conversations[EMPTY_COUNT]?.summary, summary);
    assert.equal(knowledge?.conversations[EMPTY_COUNT]?.checkedAt, CHECKED_AT);
  }
  const done = {...data, orders: [], orderScope: {orders: [order("active", {status: ItemStatus.Done})], checkedAt: NOW, truncated: false}};
  assert.equal((await readTuesdaySummaryCache(done, db, "test", NOW))?.conversations[EMPTY_COUNT]?.summary, undefined);
});
