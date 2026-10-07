import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Db, Filter } from "mongodb";
import { ASK_TUESDAY } from "../../config/ask-tuesday";
import { ItemStatus } from "../../typings/types";
import { planTuesdaySearch } from "./search";
import { parseTuesdayKnowledge } from "./knowledge";
import { readTuesdaySummaryCache } from "../server/tuesday-summaries";
import type { AskActivity, AskOrder, AskOrderState, AskTuesdayRequest, TuesdayKnowledge, TuesdaySnapshot } from "./types";

type Dependencies = {getDb: () => Promise<Db>; readKnowledge: () => Promise<string>; now: () => string; mode: string};
const EMPTY_COUNT = 0;
const LOOKAHEAD_RECORDS = 1;
const SORT_DESCENDING = -1;
const ORDER_FIELDS = ["id", "customerName", "design", "size", "notes", "labels", "status", "dueDate", "visible", "deleted", "onHold", "dueDatePauseOffsetDays", "tags.hasCustomerMessage"];
const ACTIVITY_FIELDS = ["id", "itemId", "timestamp", "type", "changes", "metadata.customerName", "metadata.design", "metadata.size"];
const ORDER_STATE_FIELDS = ["id", "customerName", "status"];
const projection = (fields: string[]) => Object.fromEntries([...fields.map(field => [field, LOOKAHEAD_RECORDS]), ["_id", EMPTY_COUNT]]);
const LATIN_SEARCH_CODE_POINT_RANGES = [[0x00c0, 0x024f], [0x1e00, 0x1eff]] as const;
const SINGLE_CHARACTER_LENGTH = 1;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const latinVariants = new Map<string, Set<string>>();
for (const [start, end] of LATIN_SEARCH_CODE_POINT_RANGES) {
  for (let point = start; point <= end; point += LOOKAHEAD_RECORDS) {
    const character = String.fromCodePoint(point).toLowerCase();
    const base = character.normalize("NFKD").replace(/\p{M}/gu, "");
    if (base.length !== SINGLE_CHARACTER_LENGTH || !/^[a-z]$/.test(base)) continue;
    const variants = latinVariants.get(base) ?? new Set([base]);
    variants.add(character);
    latinVariants.set(base, variants);
  }
}
// Mongo regex does not use accent-insensitive collation. Match canonical Latin
// equivalents and optional combining marks without interpreting search text as regex.
const literalRegex = (term: string) => ({$regex: [...term].map(character => {
  const variants = latinVariants.get(character);
  return `${variants ? `[${[...variants].map(escapeRegex).join("")}]` : escapeRegex(character)}\\p{M}*`;
}).join(""), $options: "i"});

async function knowledgeFromFile(dependencies: Dependencies): Promise<TuesdayKnowledge | null> {
  try {return parseTuesdayKnowledge(JSON.parse(await dependencies.readKnowledge()), dependencies.now());}
  catch {return null;}
}

export async function loadTuesdaySnapshot(request: AskTuesdayRequest, dependencies: Dependencies): Promise<TuesdaySnapshot> {
  const snapshot: TuesdaySnapshot = {orders: [], activities: [], knowledge: null,
    ordersCheckedAt: null, activitiesCheckedAt: null, ordersTruncated: false, activitiesTruncated: false, limitations: [],
    orderScope: {orders: [], checkedAt: null, truncated: false}};
  const plan = planTuesdaySearch(request);
  let db: Db;
  try {
    if (!dependencies.mode) throw new Error("Missing board mode.");
    db = await dependencies.getDb();
  } catch {
    snapshot.knowledge = await knowledgeFromFile(dependencies);
    snapshot.limitations.push("Live orders and activity are unavailable; the database could not be checked.");
    if (!snapshot.knowledge) snapshot.limitations.push("Saved review findings and message snapshots are unavailable.");
    return snapshot;
  }

  const orderFilter: Filter<AskOrder> = {visible: true, deleted: false, status: {$nin: [ItemStatus.Done, ItemStatus.Hidden]}};
  if (plan.terms.length) orderFilter.$and = plan.terms.map(term => ({$or: ["id", "customerName", "design", "size", "notes", "labels"].map(field => ({[field]: literalRegex(term)}))}));

  const timestamp = Date.parse(dependencies.now());
  const HOURS_PER_DAY = 24;
  const MINUTES_PER_HOUR = 60;
  const SECONDS_PER_MINUTE = 60;
  const MILLISECONDS_PER_SECOND = 1000;
  const activityWindowMs = ASK_TUESDAY.activityWindowDays * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
  const activityFilter: Filter<AskActivity> = {timestamp: {$gte: timestamp - activityWindowMs, $lte: timestamp}};
  if (plan.terms.length) activityFilter.$and = plan.terms.map(term => ({$or: ["itemId", "metadata.customerName", "changes.oldValue", "changes.newValue"].map(field => ({[field]: literalRegex(term)}))}));

  const reads = await Promise.allSettled([
    db.collection<AskOrder>(`items-${dependencies.mode}`).find(orderFilter, {projection: projection(ORDER_FIELDS)})
      .sort({dueDate: LOOKAHEAD_RECORDS, index: LOOKAHEAD_RECORDS}).limit(ASK_TUESDAY.maxLoadedOrders + LOOKAHEAD_RECORDS).toArray(),
    db.collection<AskActivity>(`activities-${dependencies.mode}`).find(activityFilter, {projection: projection(ACTIVITY_FIELDS)})
      .sort({timestamp: SORT_DESCENDING}).limit(ASK_TUESDAY.maxLoadedActivities + LOOKAHEAD_RECORDS).toArray(),
    db.collection(`${ASK_TUESDAY.knowledgeCollection}-${dependencies.mode}`).findOne({id: ASK_TUESDAY.knowledgeDocumentId}),
    db.collection<AskOrderState>(`items-${dependencies.mode}`).find({deleted: {$ne: true},
      $or: [{visible: {$ne: false}}, {status: ItemStatus.Done}]}, {projection: projection(ORDER_STATE_FIELDS)})
      .sort({id: LOOKAHEAD_RECORDS}).limit(ASK_TUESDAY.maxLoadedOrderStates + LOOKAHEAD_RECORDS).toArray(),
  ]);
  const [orders, activities, knowledge, orderStates] = reads;
  if (orderStates?.status === "fulfilled") snapshot.orderScope = {
    orders: orderStates.value.slice(EMPTY_COUNT, ASK_TUESDAY.maxLoadedOrderStates),
    checkedAt: dependencies.now(), truncated: orderStates.value.length > ASK_TUESDAY.maxLoadedOrderStates,
  };
  if (orders?.status === "fulfilled") {
    snapshot.orders = orders.value.slice(EMPTY_COUNT, ASK_TUESDAY.maxLoadedOrders);
    snapshot.ordersTruncated = orders.value.length > ASK_TUESDAY.maxLoadedOrders;
    snapshot.ordersCheckedAt = dependencies.now();
  } else snapshot.limitations.push("Live orders are unavailable; their current state could not be checked.");
  if (activities?.status === "fulfilled") {
    snapshot.activities = activities.value.slice(EMPTY_COUNT, ASK_TUESDAY.maxLoadedActivities);
    snapshot.activitiesTruncated = activities.value.length > ASK_TUESDAY.maxLoadedActivities;
    snapshot.activitiesCheckedAt = dependencies.now();
  } else snapshot.limitations.push("Live activity is unavailable; recent changes could not be checked.");
  if (knowledge?.status === "fulfilled" && knowledge.value) {
    try {snapshot.knowledge = parseTuesdayKnowledge(knowledge.value, dependencies.now());} catch { /* Invalid imported evidence is unavailable. */ }
  }
  if (!snapshot.knowledge) snapshot.knowledge = await knowledgeFromFile(dependencies);
  snapshot.knowledge = await readTuesdaySummaryCache(snapshot, db, dependencies.mode, dependencies.now());
  if (!snapshot.knowledge) snapshot.limitations.push("Saved review findings and message snapshots are unavailable.");
  return snapshot;
}

export const readTuesdaySnapshot = (request: AskTuesdayRequest) => loadTuesdaySnapshot(request, {
  getDb: async () => (await import("../../app/api/db/connect")).getDb(),
  readKnowledge: () => readFile(resolve(process.cwd(), process.env.ASK_TUESDAY_KNOWLEDGE_FILE || ASK_TUESDAY.localKnowledgeFile), "utf8"),
  now: () => new Date().toISOString(), mode: process.env.NEXT_PUBLIC_MODE || "",
});
