import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { ASK_TUESDAY } from "../config/ask-tuesday";
import {
  normalizeOperationalReview,
  parseConversationSnapshots,
  parseTuesdayKnowledge,
} from "../lib/ask-tuesday/knowledge";

const IMPORTED_AT = "2026-10-07T00:00:00.000Z";
const CHECKED_AT = "2026-10-06T21:00:00.000Z";
const EMPTY_COUNT = 0;
const ONE_RECORD = 1;
const PROCESS_SUCCESS = 0;
const SAFE_SOURCE_COUNT = 5;

function conversation(overrides: Record<string, unknown> = {}) {
  return {
    threadId: "1700000001", buyerName: "Example Buyer", checkedAt: CHECKED_AT,
    historyComplete: true, orderIds: ["4180000001"],
    messages: [
      { id: "buyer-1", sentAt: "2026-10-06T19:00:00.000Z", sender: "buyer", text: "Use the white palette." },
      { id: "seller-1", sentAt: "2026-10-06T20:00:00.000Z", sender: "seller", text: "Confirmed white." },
    ],
    agreements: [
      { status: "final", text: "White palette confirmed", messageIds: ["buyer-1", "seller-1"] },
      { status: "proposal", text: "Earlier blue suggestion", messageIds: ["buyer-1"] },
      { status: "superseded", text: "Earlier palette", messageIds: ["seller-1"] },
    ],
    ...overrides,
  };
}

function summary(overrides: Record<string, unknown> = {}) {
  return {
    text: "The buyer requested the white palette, and the seller confirmed it.",
    highlights: ["Use the white palette."], nextAction: null,
    evidence: [
      { sender: "buyer", text: "Use the white palette." },
      { sender: "seller", text: "Confirmed white." },
    ],
    ...overrides,
  };
}

test("verified conversation summaries survive normalization with only employee-facing fields", () => {
  const result = parseConversationSnapshots({ conversations: [conversation({ summary: summary({
    text: "  The buyer requested white.  ", nextAction: "  Prepare the white render.  ",
    evidence: [{ sender: "buyer", text: "  Use the white palette.  ", messageToken: "ignore" }],
    accessToken: "ignore",
  }) })] }, IMPORTED_AT);
  assert.deepEqual(result[EMPTY_COUNT]?.summary, {
    text: "The buyer requested white.", highlights: ["Use the white palette."],
    nextAction: "Prepare the white render.", evidence: [{ sender: "buyer", text: "Use the white palette." }],
  });
  assert.ok(!JSON.stringify(result).includes("accessToken"));
});

test("a summary with observed buyer quotes needs no invented per-message timestamps", () => {
  const result = parseConversationSnapshots({ conversations: [conversation({
    messages: [], agreements: [], historyComplete: true, summary: summary(),
  })] }, IMPORTED_AT);
  assert.deepEqual(result[EMPTY_COUNT]?.summary, summary());
  assert.deepEqual(result[EMPTY_COUNT]?.messages, []);
  assert.equal(result[EMPTY_COUNT]?.checkedAt, CHECKED_AT);
  assert.equal(result[EMPTY_COUNT]?.historyComplete, false);
});

test("summaries reject missing buyer evidence, invalid senders, and unbounded authoritative text", () => {
  const extraEntry = 1;
  const invalid = [
    summary({ text: " " }),
    summary({ text: "a".repeat(ASK_TUESDAY.maxSummaryLength + extraEntry) }),
    summary({ highlights: ["a".repeat(ASK_TUESDAY.maxSummaryLength + extraEntry)] }),
    summary({ highlights: Array.from({ length: ASK_TUESDAY.maxSummaryHighlights + extraEntry }, () => "Highlight") }),
    summary({ nextAction: "a".repeat(ASK_TUESDAY.maxSummaryLength + extraEntry) }),
    summary({ evidence: [] }),
    summary({ evidence: [{ sender: "seller", text: "Confirmed white." }] }),
    summary({ evidence: [{ sender: "customer", text: "Use the white palette." }] }),
    summary({ evidence: [{ sender: "buyer", text: " " }] }),
    summary({ evidence: [{ sender: "buyer", text: "a".repeat(ASK_TUESDAY.maxSummaryQuoteLength + extraEntry) }] }),
    summary({ evidence: Array.from({ length: ASK_TUESDAY.maxSummaryEvidence + extraEntry }, () => ({ sender: "buyer", text: "Use the white palette." })) }),
  ];
  for (const value of invalid) {
    const result = parseConversationSnapshots({ conversations: [conversation({ summary: value })] }, IMPORTED_AT);
    assert.equal(result[EMPTY_COUNT]?.summary, undefined);
    assert.equal(result.length, ONE_RECORD);
  }
});

test("bounded cited summaries remain available when persisted knowledge is read again", () => {
  const savedSummary = summary({
    text: "a".repeat(ASK_TUESDAY.maxSummaryLength),
    highlights: Array.from({ length: ASK_TUESDAY.maxSummaryHighlights }, (_, index) => `Observed choice ${index}`),
    nextAction: "a".repeat(ASK_TUESDAY.maxSummaryLength),
    evidence: Array.from({ length: ASK_TUESDAY.maxSummaryEvidence }, () => ({
      sender: "buyer", text: "a".repeat(ASK_TUESDAY.maxSummaryQuoteLength),
    })),
  });
  const result = parseTuesdayKnowledge({ ...normalizeOperationalReview({ findings: [] }, IMPORTED_AT),
    conversations: [conversation({ messages: [], agreements: [], historyComplete: false, summary: savedSummary })],
  }, IMPORTED_AT);
  assert.deepEqual(result.conversations[EMPTY_COUNT]?.summary, savedSummary);
  assert.equal(result.conversations[EMPTY_COUNT]?.historyComplete, false);
});

test("summary quotes must match the retained message and sender when messages are supplied", () => {
  for (const evidence of [
    [{ sender: "buyer", text: "Use the blue palette." }],
    [{ sender: "buyer", text: "Confirmed white." }],
    [{ sender: "buyer", text: "Use the white palette." }, { sender: "seller", text: "Made-up confirmation." }],
  ]) {
    const result = parseConversationSnapshots({ conversations: [conversation({ summary: summary({ evidence }) })] }, IMPORTED_AT);
    assert.equal(result[EMPTY_COUNT]?.summary, undefined);
  }
  const partial = parseConversationSnapshots({ conversations: [conversation({ historyComplete: false, summary: summary() })] }, IMPORTED_AT);
  assert.deepEqual(partial[EMPTY_COUNT]?.summary, summary());
  assert.equal(partial[EMPTY_COUNT]?.historyComplete, false);
  assert.ok(partial[EMPTY_COUNT]?.agreements.every(agreement => agreement.status !== "final"));
});

test("summary evidence cannot cite an invalid message discarded from the imported history", () => {
  const result = parseConversationSnapshots({ conversations: [conversation({ summary: summary(), messages: [
    { id: "buyer-1", sentAt: "not-observed", sender: "buyer", text: "Use the white palette." },
  ] })] }, IMPORTED_AT);
  assert.equal(result[EMPTY_COUNT]?.summary, undefined);
  assert.equal(result[EMPTY_COUNT]?.historyComplete, false);
});

test("a newer incomplete conversation snapshot removes the older summary", () => {
  const result = parseConversationSnapshots({ conversations: [conversation({ summary: summary() }), conversation({
    checkedAt: "2026-10-06T22:00:00Z", historyComplete: false, messages: [], agreements: [],
  })] }, IMPORTED_AT);
  assert.equal(result.length, ONE_RECORD);
  assert.equal(result[EMPTY_COUNT]?.summary, undefined);
});

test("equal-time conflicting summaries cannot preserve an arbitrary earlier AI claim", () => {
  const left = conversation({ summary: summary() });
  const right = conversation({ summary: summary({ text: "The buyer still needs a render." }) });
  for (const records of [[left, right], [right, left]]) {
    const result = parseConversationSnapshots({ conversations: records }, IMPORTED_AT);
    assert.equal(result[EMPTY_COUNT]?.summary, undefined);
    assert.equal(result[EMPTY_COUNT]?.historyComplete, false);
  }
});

test("equal-time disputed buyers or order links clear the association and AI summary in either input order", () => {
  const left = conversation({ summary: summary() });
  for (const override of [
    { buyerName: "Different Buyer" },
    { orderIds: ["4180000002"] },
    { buyerName: "Different Buyer", orderIds: ["4180000002"] },
  ]) {
    const right = conversation({ ...override, summary: summary() });
    for (const records of [[left, right], [right, left]]) {
      const result = parseConversationSnapshots({ conversations: records }, IMPORTED_AT);
      assert.equal(result[EMPTY_COUNT]?.buyerName, "");
      assert.deepEqual(result[EMPTY_COUNT]?.orderIds, []);
      assert.equal(result[EMPTY_COUNT]?.summary, undefined);
      assert.equal(result[EMPTY_COUNT]?.historyComplete, false);
      assert.deepEqual(result[EMPTY_COUNT]?.messages, left.messages);
      assert.ok(result[EMPTY_COUNT]?.agreements.every(agreement => agreement.status !== "final"));
    }
  }
});

test("a third duplicate cannot restore a disputed equal-time customer association or summary", () => {
  const left = conversation({ summary: summary() });
  const right = conversation({ buyerName: "Different Buyer", orderIds: ["4180000002"], summary: summary() });
  const unlinked = conversation({ buyerName: "", orderIds: [], summary: summary() });
  for (const records of [[left, right, left], [right, left, right], [left, right, unlinked]]) {
    const result = parseConversationSnapshots({ conversations: records }, IMPORTED_AT);
    assert.equal(result[EMPTY_COUNT]?.buyerName, "");
    assert.deepEqual(result[EMPTY_COUNT]?.orderIds, []);
    assert.equal(result[EMPTY_COUNT]?.summary, undefined);
    assert.equal(result[EMPTY_COUNT]?.historyComplete, false);
  }
});

test("reordering identical order links does not dispute the customer or downgrade the saved history", () => {
  const left = conversation({ orderIds: ["4180000001", "4180000002"], summary: summary() });
  const right = conversation({ orderIds: ["4180000002", "4180000001"], summary: summary() });
  for (const records of [[left, right], [right, left]]) {
    const result = parseConversationSnapshots({ conversations: records }, IMPORTED_AT);
    assert.equal(result[EMPTY_COUNT]?.buyerName, "Example Buyer");
    assert.deepEqual([...result[EMPTY_COUNT]!.orderIds].sort(), ["4180000001", "4180000002"]);
    assert.deepEqual(result[EMPTY_COUNT]?.summary, summary());
    assert.equal(result[EMPTY_COUNT]?.historyComplete, true);
    assert.ok(result[EMPTY_COUNT]?.agreements.some(agreement => agreement.status === "final"));
  }
});

test("equal-time partial histories with identical customer links retain their shared cited summary", () => {
  const result = parseConversationSnapshots({ conversations: [conversation({ summary: summary() }),
    conversation({ historyComplete: false, summary: summary() })] }, IMPORTED_AT);
  assert.equal(result[EMPTY_COUNT]?.buyerName, "Example Buyer");
  assert.deepEqual(result[EMPTY_COUNT]?.orderIds, ["4180000001"]);
  assert.deepEqual(result[EMPTY_COUNT]?.summary, summary());
  assert.equal(result[EMPTY_COUNT]?.historyComplete, false);
});

test("normalizes daily findings without substituting save or import time for observation", () => {
  const result = normalizeOperationalReview({
    schemaVersion: 1, latestReviewDate: "2026-10-06", updatedAt: "2026-10-06T16:06:07-07:00",
    latestRun: { limits: ["Historical messages only triaged."] },
    issues: [{ issueKey: "etsy:1700000001:render", customer: "Example", status: "unresolved",
      evidence: ["Seller promised a render."], action: "Review follow-up.", lastObserved: "2026-10-06",
      sources: ["https://www.etsy.com/messages/1700000001"], secret: "must not escape" }],
    accessToken: "must not escape",
  }, IMPORTED_AT);
  assert.equal(result.reviewObservedOn, "2026-10-06");
  assert.equal(result.sourceUpdatedAt, "2026-10-06T16:06:07-07:00");
  assert.equal(result.importedAt, IMPORTED_AT);
  assert.equal(result.findings[EMPTY_COUNT]?.observedOn, "2026-10-06");
  assert.deepEqual(result.findings[EMPTY_COUNT]?.sources, [{ label: "Etsy conversation", href: "https://www.etsy.com/messages/1700000001" }]);
  assert.equal(result.conversations.length, EMPTY_COUNT);
  assert.ok(!JSON.stringify(result).includes("must not escape"));
  assert.ok(!("orderId" in result.findings[EMPTY_COUNT]!));
});

test("coalesces report aliases and deduplicates stable issue keys while unknown stays unknown", () => {
  const result = normalizeOperationalReview({ reviewDate: "2026-10-06", findings: [
    { issue_key: "etsy:1700000001:render", customer: "Example", evidence: ["Promise outstanding"], needed_action: "Check render", sources: [] },
    { issueKey: "etsy:1700000001:render", customer: "Example", facts: ["No newer attachment"], sources: [] },
  ] }, IMPORTED_AT);
  assert.equal(result.findings.length, ONE_RECORD);
  assert.equal(result.findings[EMPTY_COUNT]?.status, "unknown");
  assert.deepEqual(result.findings[EMPTY_COUNT]?.evidence, ["Promise outstanding", "No newer attachment"]);
  assert.equal(result.findings[EMPTY_COUNT]?.action, "Check render");
  assert.equal(result.findings[EMPTY_COUNT]?.observedOn, "2026-10-06");
});

test("rejects unsafe source URLs and keeps authorized HTTPS domain variants", () => {
  const sources = [
    "javascript:alert(1)", "http://etsy.com/messages/1", "https://etsy.com.evil.test/1",
    "https://user:secret@etsy.com/messages/1", "https://evil-etsy.com/messages/1",
    "https://www.etsy.com/messages/1", "https://everwoodpanel.com/orders",
    "https://www.fedex.com/wtrk/track/?trknbr=123", "https://www.ups.com/track?tracknum=123",
    "https://tools.usps.com/go/TrackConfirmAction?tLabels=123",
  ];
  const result = normalizeOperationalReview({ findings: [{ issue_key: "links", sources }] }, IMPORTED_AT);
  assert.deepEqual(result.findings[EMPTY_COUNT]?.sources.map(source => source.href), sources.slice(-SAFE_SOURCE_COUNT));
});

test("invalid observation dates remain unknown rather than rolling into a different date", () => {
  const result = normalizeOperationalReview({ reviewDate: "2026-02-30", updatedAt: "tomorrow", findings: [
    { issue_key: "unknown", lastObserved: "2026-02-30", status: "closed" },
  ] }, IMPORTED_AT);
  assert.equal(result.reviewObservedOn, null);
  assert.equal(result.sourceUpdatedAt, null);
  assert.equal(result.findings[EMPTY_COUNT]?.observedOn, null);
  assert.equal(result.findings[EMPTY_COUNT]?.status, "unknown");
  assert.throws(() => normalizeOperationalReview({ issues: [] }, "not-a-date"));
});

test("conflicting duplicated statuses become unknown and carry explicit uncertainty", () => {
  const result = normalizeOperationalReview({ issues: [
    { issueKey: "conflict", status: "resolved", evidence: ["Delivered."] },
    { issueKey: "conflict", status: "unresolved", evidence: ["Later repair pending."] },
  ] }, IMPORTED_AT);
  assert.equal(result.findings[EMPTY_COUNT]?.status, "unknown");
  assert.ok(result.findings[EMPTY_COUNT]?.uncertainty.some(text => /conflict/i.test(text)));
});

test("keeps limits and scope disclosures while bounding findings and evidence text", () => {
  const extraRecord = 1;
  const result = normalizeOperationalReview({ latestRun: { limits: ["Images not reconstructed."] }, issues:
    Array.from({ length: ASK_TUESDAY.maxFindings + extraRecord }, (_, index) => ({
      issueKey: `issue-${index}`, evidence: ["a".repeat(ASK_TUESDAY.maxTextLength + extraRecord)],
      limits: "Off-platform fulfillment unknown", resolutionScope: "Original delivery only",
    })),
  }, IMPORTED_AT);
  assert.equal(result.findings.length, ASK_TUESDAY.maxFindings);
  assert.ok(result.limitations.some(text => /limit|truncat/i.test(text)));
  assert.ok(result.findings[EMPTY_COUNT]?.uncertainty.includes("Original delivery only"));
  assert.ok(result.findings[EMPTY_COUNT]?.evidence.every(text => text.length <= ASK_TUESDAY.maxTextLength));
});

test("accepts verified complete conversations without combining agreement statuses", () => {
  const result = parseConversationSnapshots({ conversations: [conversation({ accessToken: "ignore" })] }, IMPORTED_AT);
  assert.equal(result.length, ONE_RECORD);
  assert.deepEqual(result[EMPTY_COUNT]?.agreements.map(agreement => agreement.status), ["final", "proposal", "superseded"]);
  assert.deepEqual(result[EMPTY_COUNT]?.orderIds, ["4180000001"]);
  assert.ok(!JSON.stringify(result).includes("accessToken"));
});

test("incomplete histories cannot establish a final agreement", () => {
  const result = parseConversationSnapshots({ conversations: [conversation({ historyComplete: false })] }, IMPORTED_AT);
  assert.deepEqual(result[EMPTY_COUNT]?.agreements.map(agreement => agreement.status), ["proposal", "superseded"]);
});

test("final agreements need nonempty references to actual messages", () => {
  const agreements = [
    { status: "final", text: "No references", messageIds: [] },
    { status: "final", text: "Invented reference", messageIds: ["missing"] },
    { status: "proposal", text: "Buyer idea", messageIds: ["buyer-1"] },
  ];
  const result = parseConversationSnapshots({ conversations: [conversation({ agreements })] }, IMPORTED_AT);
  assert.deepEqual(result[EMPTY_COUNT]?.agreements.map(agreement => agreement.text), ["Buyer idea"]);
});

test("rejects future checked times and malformed Etsy identities without guessing order IDs", () => {
  const invalid = [
    conversation({ checkedAt: "2026-10-08T00:00:00Z" }),
    conversation({ checkedAt: "2026-02-30T00:00:00Z" }),
    conversation({ checkedAt: "2026-10-06" }),
    conversation({ threadId: "wrong" }),
    conversation({ threadId: 1700000001 }),
  ];
  assert.equal(parseConversationSnapshots({ conversations: invalid }, IMPORTED_AT).length, EMPTY_COUNT);
  const result = parseConversationSnapshots({ conversations: [conversation({ orderIds: [4180000001, "explicit"] })] }, IMPORTED_AT);
  assert.deepEqual(result[EMPTY_COUNT]?.orderIds, ["explicit"]);
});

test("invalid or future messages remove complete-history certification and final agreements", () => {
  const result = parseConversationSnapshots({ conversations: [conversation({ messages: [
    { id: "buyer-1", sentAt: "2026-10-06T19:00:00Z", sender: "buyer", text: "White" },
    { id: "seller-1", sentAt: "2026-10-06T22:00:00Z", sender: "seller", text: "Confirmed" },
  ] })] }, IMPORTED_AT);
  assert.equal(result[EMPTY_COUNT]?.historyComplete, false);
  assert.deepEqual(result[EMPTY_COUNT]?.messages.map(message => message.id), ["buyer-1"]);
  assert.ok(result[EMPTY_COUNT]?.agreements.every(agreement => agreement.status !== "final"));
});

test("duplicate message identities do not certify complete history", () => {
  const duplicate = { id: "buyer-1", sentAt: "2026-10-06T19:00:00Z", sender: "buyer", text: "White" };
  const result = parseConversationSnapshots({ conversations: [conversation({ messages: [duplicate, duplicate] })] }, IMPORTED_AT);
  assert.equal(result[EMPTY_COUNT]?.historyComplete, false);
  assert.ok(result[EMPTY_COUNT]?.agreements.every(agreement => agreement.status !== "final"));
});

test("bounded conversation imports cannot falsely claim complete histories", () => {
  const extraMessage = 1;
  const messages = Array.from({ length: ASK_TUESDAY.maxMessagesPerConversation + extraMessage }, (_, index) => ({
    id: `message-${index}`, sentAt: "2026-10-06T19:00:00Z", sender: "buyer", text: "History",
  }));
  const result = parseConversationSnapshots({ conversations: [conversation({ messages })] }, IMPORTED_AT);
  assert.equal(result[EMPTY_COUNT]?.messages.length, ASK_TUESDAY.maxMessagesPerConversation);
  assert.equal(result[EMPTY_COUNT]?.historyComplete, false);
});

test("persisted knowledge is revalidated and strips Mongo and unknown fields", () => {
  const result = parseTuesdayKnowledge({
    _id: "mongo-id", id: "latest", schemaVersion: 1, importedAt: IMPORTED_AT,
    reviewObservedOn: "2026-10-06", sourceUpdatedAt: "2026-10-06T23:00:00Z",
    limitations: ["Summaries only"], findings: [{ key: "saved", customer: "Example", status: "resolved",
      evidence: ["Buyer confirmed delivery"], action: null, observedOn: "2026-10-06",
      sources: [{ label: "Unsafe", href: "https://evil.test/" }], uncertainty: ["Repair status separate"],
      orderId: "must not infer" }],
    conversations: [conversation({ historyComplete: false })], secret: "ignore",
  });
  assert.equal(result.findings[EMPTY_COUNT]?.key, "saved");
  assert.equal(result.findings[EMPTY_COUNT]?.status, "resolved");
  assert.deepEqual(result.findings[EMPTY_COUNT]?.sources, []);
  assert.deepEqual(result.findings[EMPTY_COUNT]?.uncertainty, ["Repair status separate"]);
  assert.ok(result.conversations[EMPTY_COUNT]?.agreements.every(agreement => agreement.status !== "final"));
  assert.ok(!("_id" in result));
  assert.ok(!("orderId" in result.findings[EMPTY_COUNT]!));
});

test("persisted knowledge requires a supported schema and an import timestamp", () => {
  assert.throws(() => parseTuesdayKnowledge({ schemaVersion: 2, importedAt: IMPORTED_AT }));
  assert.throws(() => parseTuesdayKnowledge({ schemaVersion: 1, importedAt: "invalid" }));
  assert.throws(() => parseTuesdayKnowledge(null));
});

test("preserves only explicitly recorded framed-art audit exclusions", () => {
  const result = normalizeOperationalReview({ issues: [], latestRun: { tuesdayCoverage: {
    framedRowsExcludedFromAudit: ["Example Buyer (1/2)", "Example Buyer (2/2)", 44],
  } } }, IMPORTED_AT);
  assert.deepEqual(result.excludedAuditCustomers, ["Example Buyer (1/2)", "Example Buyer (2/2)"]);
  const persisted = parseTuesdayKnowledge({ ...result, excludedAuditCustomers: ["Example", { customer: "invented" }] });
  assert.deepEqual(persisted.excludedAuditCustomers, ["Example"]);
});

test("partially malformed message citations cannot certify a final agreement", () => {
  const agreements = [
    { status: "final", text: "Numeric citation silently omitted", messageIds: ["buyer-1", 9] },
    { status: "final", text: "Scalar citation", messageIds: "buyer-1" },
  ];
  const result = parseConversationSnapshots({ conversations: [conversation({ agreements })] }, IMPORTED_AT);
  assert.deepEqual(result[EMPTY_COUNT]?.agreements, []);
});

test("a newer incomplete snapshot removes stale final agreements from the same thread", () => {
  const result = parseConversationSnapshots({ conversations: [conversation(), conversation({
    checkedAt: "2026-10-06T22:00:00Z", historyComplete: false,
  })] }, IMPORTED_AT);
  assert.equal(result.length, ONE_RECORD);
  assert.equal(result[EMPTY_COUNT]?.historyComplete, false);
  assert.ok(result[EMPTY_COUNT]?.agreements.every(agreement => agreement.status !== "final"));
});

test("equal-time conflicting histories cannot keep a certified final agreement", () => {
  const result = parseConversationSnapshots({ conversations: [conversation(), conversation({ historyComplete: false })] }, IMPORTED_AT);
  assert.equal(result[EMPTY_COUNT]?.historyComplete, false);
  assert.ok(result[EMPTY_COUNT]?.agreements.every(agreement => agreement.status !== "final"));
});

test("CLI defaults to local output without initializing Mongo and imports only verified messages", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ask-tuesday-import-"));
  try {
    const reviewFile = path.join(directory, "review.json");
    const messageFile = path.join(directory, "messages.json");
    const outputFile = path.join(directory, "normalized.json");
    await writeFile(reviewFile, JSON.stringify({ reviewDate: "2026-10-06", findings: [
      { issue_key: "etsy:1700000001:render", evidence: ["No approved palette"], needed_action: "Review" },
    ] }));
    await writeFile(messageFile, JSON.stringify({ conversations: [conversation({ historyComplete: false })] }));
    const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/import-ask-tuesday.ts",
      "--review", reviewFile, "--messages", messageFile, "--out", outputFile], {
      cwd: process.cwd(), env: { ...process.env, MONGODB_URI: "", NEXT_PUBLIC_MODE: "" }, encoding: "utf8",
    });
    assert.equal(result.status, PROCESS_SUCCESS, result.stderr);
    const output = JSON.parse(await readFile(outputFile, "utf8"));
    assert.equal(output.findings[EMPTY_COUNT].key, "etsy:1700000001:render");
    assert.equal(output.conversations[EMPTY_COUNT].historyComplete, false);
    assert.ok(output.conversations[EMPTY_COUNT].agreements.every((agreement: { status: string }) => agreement.status !== "final"));
    assert.ok(!result.stdout.includes("No approved palette"));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("CLI saves cited AI summaries locally without publishing or inventing transcript messages", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ask-tuesday-summary-import-"));
  try {
    const reviewFile = path.join(directory, "review.json");
    const messageFile = path.join(directory, "messages.json");
    const outputFile = path.join(directory, "normalized.json");
    await writeFile(reviewFile, JSON.stringify({ reviewDate: "2026-10-06", findings: [] }));
    await writeFile(messageFile, JSON.stringify({ conversations: [conversation({
      messages: [], agreements: [], historyComplete: false, summary: summary(),
    })] }));
    const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/import-ask-tuesday.ts",
      "--review", reviewFile, "--messages", messageFile, "--out", outputFile], {
      cwd: process.cwd(), env: { ...process.env, MONGODB_URI: "", NEXT_PUBLIC_MODE: "" }, encoding: "utf8",
    });
    assert.equal(result.status, PROCESS_SUCCESS, result.stderr);
    const output = JSON.parse(await readFile(outputFile, "utf8"));
    assert.deepEqual(output.conversations[EMPTY_COUNT].summary, summary());
    assert.deepEqual(output.conversations[EMPTY_COUNT].messages, []);
    assert.equal(output.conversations[EMPTY_COUNT].historyComplete, false);
    assert.match(result.stdout, /No remote changes/);
    assert.ok(!result.stdout.includes("Use the white palette"));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("CLI rejects invalid arguments before producing an output file", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ask-tuesday-invalid-"));
  try {
    const outputFile = path.join(directory, "normalized.json");
    const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/import-ask-tuesday.ts", "--out", outputFile], {
      cwd: process.cwd(), env: { ...process.env, MONGODB_URI: "" }, encoding: "utf8",
    });
    assert.notEqual(result.status, PROCESS_SUCCESS);
    await assert.rejects(readFile(outputFile));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("an explicitly invalid record date cannot inherit a newer global review date", () => {
  for (const lastObserved of ["2026-02-30", "2030-01-01", null]) {
    const result = normalizeOperationalReview({reviewDate: "2026-10-06", findings: [{issue_key: "bad-date", lastObserved}]}, IMPORTED_AT);
    assert.equal(result.findings[0]?.observedOn, null);
  }
  const valid = normalizeOperationalReview({reviewDate: "2026-10-06", findings: [{issue_key: "undated"}]}, IMPORTED_AT);
  assert.equal(valid.findings[0]?.observedOn, "2026-10-06");
});

test("record-level array limitations and resolution scope remain visible", () => {
  const result = normalizeOperationalReview({findings: [{issue_key: "scope", limits: ["Full history missing"],
    resolutionScope: ["Original delivery only"], inference: ["Carrier acceptance is uncertain"]}]}, IMPORTED_AT);
  assert.deepEqual(result.findings[0]?.uncertainty, ["Full history missing", "Original delivery only", "Carrier acceptance is uncertain"]);
});

test("persisted knowledge cannot authorize future provenance beyond the actual read time", () => {
  assert.throws(() => parseTuesdayKnowledge({schemaVersion: 1, importedAt: "2030-01-01T00:00:00Z",
    limitations: [], findings: [], conversations: [conversation({checkedAt: "2029-12-31T22:00:00Z"})]}, IMPORTED_AT));
});

test("corrupt persisted arrays cannot masquerade as valid empty knowledge", () => {
  const knowledge = normalizeOperationalReview({findings: []}, IMPORTED_AT);
  assert.throws(() => parseTuesdayKnowledge({...knowledge, findings: "corrupt"}, IMPORTED_AT));
  assert.throws(() => parseTuesdayKnowledge({...knowledge, conversations: "corrupt"}, IMPORTED_AT));
});
