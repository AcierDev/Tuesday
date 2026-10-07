import { ASK_TUESDAY } from "../../config/ask-tuesday";
import type {
  ConversationSnapshot, SavedAgreement, SavedFinding, SourceReference,
  TuesdayKnowledge, VerifiedMessage,
} from "./types";

const KNOWLEDGE_SCHEMA_VERSION = 1 as const;
const START_INDEX = 0;
const DATE_TEXT_LENGTH = 10;
const STATUS_CONFLICT = "Conflicting saved statuses; resolution remains unknown.";
const ALLOWED_SOURCE_DOMAINS = ["etsy.com", "everwoodpanel.com", "fedex.com", "ups.com", "usps.com"];
const SUMMARY_LIMITATION = "Saved operational findings are review summaries, not complete conversation transcripts or final artwork agreements.";
const FINDINGS_TRUNCATED = "Saved findings exceed the configured limit; results may be truncated.";
const CONVERSATIONS_TRUNCATED = "Saved conversations exceed the configured limit; results may be truncated.";
const FINDING_RETENTION_PRIORITY = {unresolved: 0, unknown: 1, resolved: 2} as const;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function list(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }

function text(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().slice(START_INDEX, ASK_TUESDAY.maxTextLength);
}

function strings(value: unknown, limit: number = ASK_TUESDAY.maxMessagesPerConversation): string[] {
  const values = typeof value === "string" ? [value] : list(value);
  return [...new Set(values.map(text).filter((entry): entry is string => entry !== null))].slice(START_INDEX, limit);
}

function date(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(START_INDEX, DATE_TEXT_LENGTH) === value ? value : null;
}

function timestamp(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)) return null;
  return date(value.slice(START_INDEX, DATE_TEXT_LENGTH)) && Number.isFinite(Date.parse(value)) ? value : null;
}

function timestampBefore(value: unknown, latest: string): string | null {
  const parsed = timestamp(value);
  return parsed && Date.parse(parsed) <= Date.parse(latest) ? parsed : null;
}

function observation(value: unknown, latest: string): string | null {
  const parsed = date(value);
  return parsed && parsed <= new Date(latest).toISOString().slice(START_INDEX, DATE_TEXT_LENGTH) ? parsed : null;
}

function safeSource(value: unknown): SourceReference | null {
  const source = record(value);
  const href = text(source ? source.href : value);
  if (!href) return null;
  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase();
    const domain = ALLOWED_SOURCE_DOMAINS.find(candidate => host === candidate || host.endsWith(`.${candidate}`));
    if (url.protocol !== "https:" || url.username || url.password || url.port || !domain) return null;
    const label = domain === "etsy.com" ? (url.pathname.startsWith("/messages") ? "Etsy conversation" : "Etsy order")
      : domain === "everwoodpanel.com" ? "Tuesday orders"
      : domain === "fedex.com" ? "FedEx tracking" : domain === "ups.com" ? "UPS tracking" : "USPS tracking";
    return { label, href: url.href };
  } catch { return null; }
}

function sources(value: unknown): SourceReference[] {
  const result = new Map<string, SourceReference>();
  for (const entry of list(value)) {
    const source = safeSource(entry);
    if (source) result.set(source.href, source);
    if (result.size >= ASK_TUESDAY.maxSourcesPerRecord) break;
  }
  return [...result.values()];
}

function status(value: unknown): SavedFinding["status"] {
  return value === "resolved" || value === "unresolved" ? value : "unknown";
}

export function savedFindingNeedsReview(finding: SavedFinding): boolean {
  return finding.status === "unresolved" || (finding.status === "unknown"
    && !!(finding.action || finding.evidence.length || finding.uncertainty.length));
}

function finding(value: unknown, observedOn: string | null, importedAt: string, persisted: boolean): SavedFinding | null {
  const input = record(value);
  if (!input) return null;
  const key = text(persisted ? input.key : input.issueKey ?? input.issue_key);
  if (!key) return null;
  const observationField = persisted ? "observedOn" : "lastObserved";
  return {
    key, customer: text(input.customer) ?? "", status: status(input.status),
    evidence: strings(input.evidence ?? input.facts),
    action: text(input.action ?? input.neededAction ?? input.needed_action),
    observedOn: Object.prototype.hasOwnProperty.call(input, observationField)
      ? observation(input[observationField], importedAt) : observedOn,
    sources: sources(input.sources),
    uncertainty: strings(persisted ? input.uncertainty : [
      ...strings(input.limits), ...strings(input.resolutionScope), ...strings(input.inference),
    ]),
  };
}

function findings(values: unknown[], observedOn: string | null, importedAt: string, persisted: boolean): SavedFinding[] {
  const result = new Map<string, SavedFinding>();
  const prioritized = [...values].sort((left, right) =>
    FINDING_RETENTION_PRIORITY[status(record(left)?.status)] - FINDING_RETENTION_PRIORITY[status(record(right)?.status)]);
  for (const value of prioritized) {
    const next = finding(value, observedOn, importedAt, persisted);
    if (!next) continue;
    const existing = result.get(next.key);
    if (existing) {
      const conflicts = existing.uncertainty.includes(STATUS_CONFLICT)
        || (existing.status !== "unknown" && next.status !== "unknown" && existing.status !== next.status);
      result.set(next.key, {
        ...existing, customer: existing.customer || next.customer,
        status: conflicts ? "unknown" : existing.status === "unknown" ? next.status : existing.status,
        evidence: strings([...existing.evidence, ...next.evidence]), action: existing.action ?? next.action,
        observedOn: existing.observedOn && next.observedOn
          ? (existing.observedOn > next.observedOn ? existing.observedOn : next.observedOn)
          : existing.observedOn ?? next.observedOn,
        sources: sources([...existing.sources, ...next.sources]),
        uncertainty: strings([...existing.uncertainty, ...next.uncertainty, ...(conflicts ? [STATUS_CONFLICT] : [])]),
      });
    } else if (result.size < ASK_TUESDAY.maxFindings) result.set(next.key, next);
  }
  return [...result.values()];
}

export function normalizeOperationalReview(value: unknown, importedAt: string): TuesdayKnowledge {
  const input = record(value);
  if (!input || !timestamp(importedAt) || (input.schemaVersion !== undefined && input.schemaVersion !== KNOWLEDGE_SCHEMA_VERSION)
    || (!Array.isArray(input.issues) && !Array.isArray(input.findings))) throw new Error("Invalid operational review or import timestamp.");
  const run = record(input.latestRun);
  const coverage = record(input.coverage) ?? record(run?.tuesdayCoverage);
  const observedOn = observation(input.latestReviewDate ?? input.reviewDate, importedAt);
  const values = [...list(input.issues), ...list(input.findings)];
  const limitations = strings([
    ...strings(run?.limits), ...strings(coverage?.limitations), ...strings(input.limitations), SUMMARY_LIMITATION,
    ...(values.length > ASK_TUESDAY.maxFindings ? [FINDINGS_TRUNCATED] : []),
  ]);
  return {
    schemaVersion: KNOWLEDGE_SCHEMA_VERSION, importedAt, reviewObservedOn: observedOn,
    sourceUpdatedAt: timestampBefore(input.updatedAt, importedAt), limitations,
    evidenceTruncated: values.length > ASK_TUESDAY.maxFindings,
    findings: findings(values, observedOn, importedAt, false), conversations: [],
    excludedAuditCustomers: strings(coverage?.framedRowsExcludedFromAudit, ASK_TUESDAY.maxFindings),
  };
}

function conversation(value: unknown, now: string): ConversationSnapshot | null {
  const input = record(value);
  const threadId = text(input?.threadId);
  const checkedAt = timestampBefore(input?.checkedAt, now);
  if (!input || !threadId || !/^\d+$/.test(threadId) || !checkedAt || !Array.isArray(input.messages)) return null;
  const rawMessages = input.messages;
  const rawAgreements = list(input.agreements);
  const oversizedText = (value: unknown) => typeof value === "string" && value.trim().length > ASK_TUESDAY.maxTextLength;
  const evidenceTruncated = input.evidenceTruncated === true || rawMessages.length > ASK_TUESDAY.maxMessagesPerConversation
    || rawAgreements.length > ASK_TUESDAY.maxMessagesPerConversation
    || rawMessages.some(value => oversizedText(record(value)?.text))
    || rawAgreements.some(value => oversizedText(record(value)?.text)
      || list(record(value)?.messageIds).length > ASK_TUESDAY.maxMessagesPerConversation);
  const messageIds = new Set<string>();
  const messages: VerifiedMessage[] = [];
  let historyComplete = input.historyComplete === true && rawMessages.length <= ASK_TUESDAY.maxMessagesPerConversation;
  for (const value of rawMessages.slice(START_INDEX, ASK_TUESDAY.maxMessagesPerConversation)) {
    const message = record(value);
    const id = text(message?.id);
    const sentAt = timestampBefore(message?.sentAt, checkedAt);
    const body = text(message?.text);
    if (!message || !id || !sentAt || !body || (message.sender !== "buyer" && message.sender !== "seller")
      || messageIds.has(id) || (typeof message.text === "string" && message.text.trim().length > ASK_TUESDAY.maxTextLength)) {
      historyComplete = false;
      continue;
    }
    messageIds.add(id);
    messages.push({ id, sentAt, sender: message.sender, text: body });
  }
  const agreements: SavedAgreement[] = [];
  for (const value of rawAgreements.slice(START_INDEX, ASK_TUESDAY.maxMessagesPerConversation)) {
    const agreement = record(value);
    const body = text(agreement?.text);
    const refs = strings(agreement?.messageIds);
    if (!agreement || !body || oversizedText(agreement.text) || !Array.isArray(agreement.messageIds) || agreement.messageIds.length !== refs.length
      || !refs.length || refs.some(id => !messageIds.has(id))
      || (agreement.status !== "final" && agreement.status !== "proposal" && agreement.status !== "superseded")
      || (agreement.status === "final" && !historyComplete)) continue;
    agreements.push({ status: agreement.status, text: body, messageIds: refs });
  }
  return { threadId, buyerName: text(input.buyerName) ?? "", checkedAt, historyComplete, evidenceTruncated,
    orderIds: strings(input.orderIds, ASK_TUESDAY.maxFindings), messages, agreements };
}

export function parseConversationSnapshots(value: unknown, now: string): ConversationSnapshot[] {
  if (!timestamp(now)) throw new Error("Invalid conversation import timestamp.");
  const input = record(value);
  const result = new Map<string, ConversationSnapshot>();
  for (const value of list(input?.conversations).slice(START_INDEX, ASK_TUESDAY.maxConversations)) {
    const next = conversation(value, now);
    if (!next) continue;
    const existing = result.get(next.threadId);
    if (!existing || Date.parse(next.checkedAt) > Date.parse(existing.checkedAt)) result.set(next.threadId, next);
    else if (Date.parse(next.checkedAt) === Date.parse(existing.checkedAt) && JSON.stringify(next) !== JSON.stringify(existing)) {
      const messages = existing.messages.filter(message => next.messages.some(other => JSON.stringify(other) === JSON.stringify(message)));
      const ids = new Set(messages.map(message => message.id));
      result.set(next.threadId, { ...existing, historyComplete: false, messages,
        evidenceTruncated: existing.evidenceTruncated || next.evidenceTruncated,
        agreements: existing.agreements.filter(agreement => agreement.status !== "final" && agreement.messageIds.every(id => ids.has(id))) });
    }
  }
  return [...result.values()];
}

export function parseTuesdayKnowledge(value: unknown, now = new Date().toISOString()): TuesdayKnowledge {
  const input = record(value);
  const importedAt = timestamp(input?.importedAt);
  if (!input || input.schemaVersion !== KNOWLEDGE_SCHEMA_VERSION || !importedAt || !timestamp(now) || Date.parse(importedAt) > Date.parse(now)
    || !Array.isArray(input.findings) || !Array.isArray(input.conversations) || !Array.isArray(input.limitations)) {
    throw new Error("Invalid saved Tuesday knowledge.");
  }
  const values = list(input.findings);
  const observedOn = observation(input.reviewObservedOn, importedAt);
  const rawConversations = list(input.conversations);
  const conversations = parseConversationSnapshots(input, importedAt);
  return {
    schemaVersion: KNOWLEDGE_SCHEMA_VERSION, importedAt, reviewObservedOn: observedOn,
    sourceUpdatedAt: timestampBefore(input.sourceUpdatedAt, importedAt),
    evidenceTruncated: input.evidenceTruncated === true || values.length > ASK_TUESDAY.maxFindings
      || rawConversations.length > ASK_TUESDAY.maxConversations
      || conversations.some(conversation => conversation.evidenceTruncated)
      || input.limitations.includes(FINDINGS_TRUNCATED) || input.limitations.includes(CONVERSATIONS_TRUNCATED),
    limitations: strings([...strings(input.limitations),
      ...(values.length > ASK_TUESDAY.maxFindings ? [FINDINGS_TRUNCATED] : []),
      ...(rawConversations.length > ASK_TUESDAY.maxConversations ? [CONVERSATIONS_TRUNCATED] : []),
    ]),
    findings: findings(values, observedOn, importedAt, true), conversations,
    excludedAuditCustomers: strings(input.excludedAuditCustomers, ASK_TUESDAY.maxFindings),
  };
}
