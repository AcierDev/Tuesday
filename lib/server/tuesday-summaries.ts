import { randomUUID } from "node:crypto";
import { MongoServerError, type Db } from "mongodb";
import { ASK_TUESDAY } from "../../config/ask-tuesday";
import { TUESDAY_SUMMARIES } from "../../config/tuesday-summaries";
import { cachedConversationSummary, runTuesdaySummaries, summaryCacheCandidates, summaryGenerationCandidates, type SummaryCacheStore } from "../ask-tuesday/summaries";
import type { ConversationSummary, TuesdayKnowledge, TuesdaySnapshot } from "../ask-tuesday/types";

const EMPTY_COUNT = 0;
type SummaryDocument = {
  _id: string; fingerprint?: string; generatedAt?: string; summary?: ConversationSummary;
  attemptedAt?: string; retryAfter?: string; attemptToken?: string; attemptUntil?: number; revision?: string;
};
const validMode = (mode: string) => /^[a-zA-Z0-9_-]+$/.test(mode);

export async function readTuesdaySummaryCache(snapshot: TuesdaySnapshot, db: Db, mode: string, now: string): Promise<TuesdayKnowledge | null> {
  const knowledge = snapshot.knowledge;
  if (!knowledge || !validMode(mode)) return knowledge;
  const eligible = summaryCacheCandidates(snapshot, now);
  if (!eligible.length) return knowledge;
  try {
    const values = await db.collection<SummaryDocument>(`${TUESDAY_SUMMARIES.collection}-${mode}`)
      .find({_id: {$in: eligible.map(conversation => conversation.threadId)}}).limit(ASK_TUESDAY.maxConversations).toArray();
    const cache = new Map(values.map(value => [value._id, value]));
    const summaries = new Map(eligible.flatMap(conversation => {
      const summary = cachedConversationSummary(cache.get(conversation.threadId), conversation, now);
      return summary ? [[conversation.threadId, summary] as const] : [];
    }));
    if (!summaries.size) return knowledge;
    return {...knowledge, conversations: knowledge.conversations.map(conversation => {
      const summary = summaries.get(conversation.threadId);
      return summary ? {...conversation, summary} : conversation;
    })};
  } catch {return knowledge;}
}

export function createTuesdaySummaryStore(db: Db, mode: string): SummaryCacheStore {
  if (!validMode(mode)) throw new Error("Invalid Tuesday summary board mode.");
  const collection = db.collection<SummaryDocument>(`${TUESDAY_SUMMARIES.collection}-${mode}`);
  return {
    read: threadId => collection.findOne({_id: threadId}),
    claim: async (threadId, fingerprint, attemptedAt, token, observedCache) => {
      const revision = observedCache !== null && typeof observedCache === "object" && "revision" in observedCache
        && typeof observedCache.revision === "string" ? observedCache.revision : null;
      try {
        const attempt = await collection.findOneAndUpdate({_id: threadId, revision: revision ?? {$exists: false}, $and: [
          {$or: [{attemptUntil: {$exists: false}}, {attemptUntil: {$lte: Date.parse(attemptedAt)}}]},
          {$or: [{fingerprint: {$ne: fingerprint}}, {retryAfter: {$exists: false}}, {retryAfter: {$lte: attemptedAt}}]},
        ]}, {$set: {fingerprint, attemptedAt, attemptToken: token, revision: token,
          attemptUntil: Date.parse(attemptedAt) + TUESDAY_SUMMARIES.attemptLeaseMs,
          retryAfter: new Date(Date.parse(attemptedAt) + TUESDAY_SUMMARIES.failureCooldownMs).toISOString()},
          $unset: {summary: "", generatedAt: ""}}, {upsert: true, returnDocument: "after"});
        return attempt?.attemptToken === token;
      } catch (error) {
        if (error instanceof MongoServerError && error.code === TUESDAY_SUMMARIES.duplicateKeyError) return false;
        throw error;
      }
    },
    save: async (threadId, fingerprint, token, generatedAt, summary) => {
      const saved = await collection.updateOne({_id: threadId, fingerprint, attemptToken: token, attemptUntil: {$gt: Date.parse(generatedAt)}},
        {$set: {generatedAt, summary}, $unset: {attemptToken: "", attemptUntil: "", retryAfter: ""}});
      return saved.matchedCount > EMPTY_COUNT;
    },
    fail: async (threadId, fingerprint, token, failedAt) => {
      await collection.updateOne({_id: threadId, fingerprint, attemptToken: token},
        {$set: {retryAfter: new Date(Date.parse(failedAt) + TUESDAY_SUMMARIES.failureCooldownMs).toISOString()},
          $unset: {attemptToken: "", attemptUntil: "", summary: "", generatedAt: ""}});
    },
  };
}

async function generateSummary(prompt: string, options: {timeoutMs: number; signal: AbortSignal}): Promise<string> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("Summary inference is unavailable.");
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const model = new GoogleGenerativeAI(key).getGenerativeModel({
    model: process.env.GEMINI_TUESDAY_SUMMARY_MODEL?.trim() || TUESDAY_SUMMARIES.defaultModel,
    generationConfig: {temperature: TUESDAY_SUMMARIES.modelTemperature, maxOutputTokens: TUESDAY_SUMMARIES.maxOutputTokens,
      responseMimeType: "application/json"},
  });
  const response = await model.generateContent(prompt, {timeout: options.timeoutMs, signal: options.signal});
  return response.response.text();
}

export async function summarizeTuesdaySnapshot(snapshot: TuesdaySnapshot, db: Db, now: string): Promise<{generated: number; failed: number}> {
  const mode = process.env.NEXT_PUBLIC_MODE ?? "";
  if (!summaryGenerationCandidates(snapshot, now).length) return {generated: EMPTY_COUNT, failed: EMPTY_COUNT};
  if (!process.env.GEMINI_API_KEY?.trim() || !validMode(mode)
    || process.env.ASK_TUESDAY_MONITOR_SUMMARIES_ENABLED?.trim().toLowerCase() === "false") {
    const knowledge = await readTuesdaySummaryCache(snapshot, db, mode, now);
    return {generated: EMPTY_COUNT, failed: summaryGenerationCandidates({...snapshot, knowledge}, now).length};
  }
  return runTuesdaySummaries(snapshot, now, {enabled: true, store: createTuesdaySummaryStore(db, mode),
    generate: generateSummary, now: () => new Date().toISOString(), newToken: randomUUID});
}
