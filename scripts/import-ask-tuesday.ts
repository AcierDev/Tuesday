import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { ASK_TUESDAY } from "../config/ask-tuesday";
import { normalizeOperationalReview, parseConversationSnapshots } from "../lib/ask-tuesday/knowledge";
import type { TuesdayKnowledge } from "../lib/ask-tuesday/types";

const MAX_IMPORT_BYTES = ASK_TUESDAY.maxTextLength * ASK_TUESDAY.maxFindings;
const PRIVATE_FILE_MODE = 0o600;
const JSON_INDENT = 2;
const FAILURE_EXIT_CODE = 1;

async function readJson(filename: string): Promise<unknown> {
  const metadata = await stat(filename);
  if (!metadata.isFile() || metadata.size > MAX_IMPORT_BYTES) throw new Error("Invalid or oversized import file.");
  return JSON.parse(await readFile(filename, "utf8")) as unknown;
}

async function publish(knowledge: TuesdayKnowledge): Promise<void> {
  const mode = process.env.NEXT_PUBLIC_MODE;
  if (!mode || !/^[a-zA-Z0-9_-]+$/.test(mode)) throw new Error("Publishing requires a valid NEXT_PUBLIC_MODE.");
  // The existing connector starts a connection at import time. Local imports must never load it.
  const { getDb, closeConnection } = await import("../app/api/db/connect");
  try {
    const db = await getDb();
    await db.collection(`${ASK_TUESDAY.knowledgeCollection}-${mode}`).updateOne(
      { id: ASK_TUESDAY.knowledgeDocumentId },
      { $set: { id: ASK_TUESDAY.knowledgeDocumentId, ...knowledge } },
      { upsert: true },
    );
  } finally { await closeConnection(); }
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: {
    review: { type: "string" }, messages: { type: "string" }, out: { type: "string" }, publish: { type: "boolean", default: false },
  }, strict: true, allowPositionals: false });
  if (!values.review?.trim()) throw new Error("Specify --review with a local review JSON file.");
  const importedAt = new Date().toISOString();
  const knowledge = normalizeOperationalReview(await readJson(values.review), importedAt);
  if (values.messages) {
    const messages = await readJson(values.messages);
    knowledge.conversations = parseConversationSnapshots(messages, importedAt);
    const raw = messages !== null && typeof messages === "object" ? (messages as Record<string, unknown>).conversations : null;
    if (!Array.isArray(raw)) throw new Error("Message file must contain a conversations array.");
    if (raw.length !== knowledge.conversations.length || knowledge.conversations.some(conversation => conversation.evidenceTruncated)) {
      knowledge.evidenceTruncated = true;
      knowledge.limitations.push("Some conversation snapshots were rejected, deduplicated, or truncated; saved histories may be incomplete.");
    }
  }
  const outputFile = path.resolve(values.out ?? ASK_TUESDAY.localKnowledgeFile);
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(knowledge, null, JSON_INDENT)}\n`, { mode: PRIVATE_FILE_MODE });
  if (values.publish) await publish(knowledge);
  console.log(`Saved ${knowledge.findings.length} findings and ${knowledge.conversations.length} conversation snapshots locally.${values.publish ? " Published to the dedicated knowledge collection." : " No remote changes."}`);
}

main().catch(() => {
  console.error("Ask Tuesday import failed. Check arguments, JSON schema, file size, and date provenance; publishing also requires configured Mongo access and NEXT_PUBLIC_MODE.");
  process.exitCode = FAILURE_EXIT_CODE;
});
