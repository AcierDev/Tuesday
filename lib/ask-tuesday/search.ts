import { ASK_TUESDAY } from "../../config/ask-tuesday";
import { dayDiffKeys, laDayKey, shiftDayKey } from "../debt-metrics";
import { getEffectiveDueDateKey } from "../due-date-pause";
import { ItemStatus } from "../../typings/types";
import { savedFindingNeedsReview } from "./knowledge";
import { auditName, tuesdayOrderScope } from "./order-scope";
import type { AskOrder, AskTuesdayRequest, AskTuesdayResponse, AskTuesdayResult, TuesdaySnapshot } from "./types";

type SearchIntent = "attention" | "activity" | "page" | "search";
type DueScope = "today" | "tomorrow" | "overdue" | "soon" | null;
export type TuesdaySearchPlan = { intent: SearchIntent; terms: string[]; dueScope: DueScope };

const STOP_WORDS = new Set((
  "a an and any are as at be been by can changes change changed customer customers did do does for from " +
  "find get give had has have he her him his how i in individual is it latest me my need needs of on " +
  "or order orders our page please recent request requested requests requirement requirements said " +
  "show should tell that the their them there these they this to us was were what whats which who " +
  "why will with would you your agree agreed agreement agreements current matters attention unusual " +
  "activity activities due overdue today tomorrow soon checked anything about"
).split(/\s+/));
const INACTIVE_STATUSES = new Set([ItemStatus.Done, ItemStatus.Hidden]);
const PAGE_LABELS: Record<string, string> = {
  "/orders": "Orders", "/production-planning": "Production planning", "/quick-label": "Quick labels",
  "/setup-utility": "Setup utility", "/calculator": "Calculator", "/deleted": "Deleted orders",
};
const DAY_KEY_LENGTH = "YYYY-MM-DD".length;
const NEXT_DAY_OFFSET = 1;
const CURRENT_DAY_OFFSET = 0;
const EMPTY_COUNT = 0;

const normalized = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
const words = (value: string) => normalized(value).match(/[\p{L}\p{N}]+/gu) ?? [];
const textMatches = (text: string, terms: string[]) => terms.every(term => normalized(text).includes(term));
const text = (value: unknown) => typeof value === "string" ? value.slice(EMPTY_COUNT, ASK_TUESDAY.maxTextLength) : "";

export function planTuesdaySearch(request: AskTuesdayRequest): TuesdaySearchPlan {
  const question = normalized(request.question);
  const dueScope: DueScope = /\bdue\b/.test(question) && /\btomorrow\b/.test(question) ? "tomorrow"
    : /\bdue\b/.test(question) && /\btoday\b/.test(question) ? "today"
    : /\boverdue\b/.test(question) ? "overdue"
    : /\bdue\b/.test(question) ? "soon" : null;
  const intent: SearchIntent = /\b(activity|activities|unusual|recent changes)\b/.test(question) ? "activity"
    : /\b(this|current) page\b/.test(question) ? "page"
    : dueScope || /\b(attention|need help|at risk)\b/.test(question) ? "attention" : "search";
  const searchText = intent === "page" ? request.orderSearch ?? "" : request.question;
  const terms = [...new Set(words(searchText).filter(word => !STOP_WORDS.has(word) && word.length >= ASK_TUESDAY.minSearchTermLength))]
    .slice(EMPTY_COUNT, ASK_TUESDAY.maxSearchTerms);
  return { intent, terms, dueScope };
}

export function excludedFromAudit(order: AskOrder, snapshot: TuesdaySnapshot): boolean {
  return /\bframed\b/i.test([order.design, order.size, order.labels].join(" ")) ||
    (snapshot.knowledge?.excludedAuditCustomers ?? []).some(customer => auditName(customer) === auditName(order.customerName ?? ""));
}

export function validDueKey(order: AskOrder, today: string): string | null {
  const due = getEffectiveDueDateKey(order, today);
  if (!due) return null;
  const parsed = new Date(`${due}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(EMPTY_COUNT, DAY_KEY_LENGTH) === due ? due : null;
}

function attentionReasons(order: AskOrder, today: string): string[] {
  if (order.onHold) return [];
  const reasons: string[] = [];
  const due = validDueKey(order, today);
  if (due) {
    const remaining = dayDiffKeys(today, due);
    if (remaining < CURRENT_DAY_OFFSET) reasons.push(`Overdue dashboard due date: ${due}`);
    else if (remaining <= ASK_TUESDAY.dueSoonDays) reasons.push(`Dashboard due date soon: ${due}`);
  }
  if (/AI needs double check/i.test([order.customerName, order.notes, order.labels].join(" "))) {
    reasons.push("Saved artwork requirements need double check.");
  }
  if (/\(rushed\)|\(semi-rushed\)/i.test(order.customerName ?? "")) reasons.push("Purchased production priority is marked in the saved name.");
  return reasons;
}

function orderResult(order: AskOrder, snapshot: TuesdaySnapshot, today: string, reasons: string[]): AskTuesdayResult {
  const due = validDueKey(order, today);
  return {
    kind: "order", key: `order:${order.id}`, title: text(order.customerName) || order.id,
    detail: reasons.join(" · ") || `${order.status}${order.onHold ? " · On hold" : ""}${due ? ` · Dashboard due ${due}` : ""}`,
    facts: [order.design && `Design: ${text(order.design)}`, order.size && `Size: ${text(order.size)}`,
      order.notes && `Saved notes: ${text(order.notes)}`, order.labels && `Saved labels: ${text(order.labels)}`,
      order.tags?.hasCustomerMessage && "Customer-message indicator is set; the message text is not stored on this order.",
    ].filter((fact): fact is string => typeof fact === "string" && !!fact),
    sources: [{label: `Tuesday order ${order.id}`, href: "/orders"}], orderId: order.id,
    observedAt: snapshot.ordersCheckedAt, observedPrecision: "time",
    uncertainty: ["Saved order fields do not prove the latest Etsy agreement.", ...(order.onHold ? ["On hold; the due date is paused, not an arrival promise."] : [])],
  };
}

export function searchTuesdayRecords(request: AskTuesdayRequest, snapshot: TuesdaySnapshot, now: string): AskTuesdayResponse {
  const plan = planTuesdaySearch(request);
  const today = laDayKey(new Date(now));
  const results: AskTuesdayResult[] = [];
  const scope = tuesdayOrderScope(snapshot);
  const isAttention = plan.intent === "attention" || (plan.intent === "page" && !plan.terms.length);
  const isActivity = plan.intent === "activity";
  const isSearch = plan.intent === "search" || (plan.intent === "page" && !!plan.terms.length);

  if (!isActivity && (isAttention || plan.terms.length)) {
    const orders = snapshot.orders.filter(order => order.visible !== false && !order.deleted && !INACTIVE_STATUSES.has(order.status) && !scope.orderIsDone(order.id));
    for (const order of orders) {
      const haystack = [order.id, order.customerName, order.design, order.size, order.notes, order.labels].join(" ");
      if (!textMatches(haystack, plan.terms)) continue;
      const reasons = attentionReasons(order, today);
      if (isAttention && (INACTIVE_STATUSES.has(order.status) || excludedFromAudit(order, snapshot))) continue;
      if (isAttention && plan.dueScope) {
        const due = !order.onHold && validDueKey(order, today);
        if (!due) continue;
        if (plan.dueScope === "today" && due !== today) continue;
        if (plan.dueScope === "tomorrow" && due !== shiftDayKey(today, NEXT_DAY_OFFSET)) continue;
        if (plan.dueScope === "overdue" && due >= today) continue;
        if (plan.dueScope === "soon" && (due < today || dayDiffKeys(today, due) > ASK_TUESDAY.dueSoonDays)) continue;
      } else if (isAttention && !reasons.length) continue;
      results.push(orderResult(order, snapshot, today, reasons));
    }
  }

  for (const finding of snapshot.knowledge?.findings ?? []) {
    if (scope.excludeFinding(finding)) continue;
    if (plan.dueScope) continue;
    if (isAttention || isActivity) {
      if (!savedFindingNeedsReview(finding)) continue;
    } else if (!plan.terms.length) continue;
    if (!textMatches([finding.key, finding.customer, ...finding.evidence, finding.action, ...finding.sources.map(source => source.href)].join(" "), plan.terms)) continue;
    if ((isAttention || isActivity) && (snapshot.knowledge?.excludedAuditCustomers ?? []).some(customer => auditName(customer) === auditName(finding.customer))) continue;
    results.push({kind: "finding", key: finding.key, title: finding.customer,
      detail: finding.action ?? `Saved finding: ${finding.status}`, facts: finding.evidence,
      sources: finding.sources, observedAt: finding.observedOn, observedPrecision: "date",
      orderIds: scope.findingOrderIds(finding),
      uncertainty: [...finding.uncertainty, `Status was ${finding.status} when reviewed; this is not a live Etsy check.`],
    });
  }

  if (isSearch && plan.terms.length) {
    for (const conversation of snapshot.knowledge?.conversations ?? []) {
      if (scope.excludeConversation(conversation)) continue;
      if (!textMatches([conversation.buyerName, ...conversation.orderIds, ...conversation.messages.map(message => message.text),
        ...conversation.agreements.map(agreement => `${agreement.status} ${agreement.text}`)].join(" "), plan.terms)) continue;
      results.push({kind: "conversation", key: `conversation:${conversation.threadId}`, title: conversation.buyerName,
        detail: conversation.historyComplete ? "Verified full-history snapshot; later messages may exist." : "Partial history; final requirements are unverified.",
        facts: [], sources: [{label: `Etsy conversation ${conversation.threadId}`, href: `https://www.etsy.com/messages/${conversation.threadId}`}],
        observedAt: conversation.checkedAt, observedPrecision: "time", agreements: conversation.agreements, messages: conversation.messages,
        orderIds: scope.conversationOrderIds(conversation),
        uncertainty: ["Saved message snapshot, not a fresh Etsy lookup.", ...(!conversation.orderIds.length ? ["Conversation-to-order linkage has not been supplied."] : [])],
      });
    }
  }

  if (isActivity || (isSearch && plan.terms.length)) {
    const windowStart = shiftDayKey(today, -ASK_TUESDAY.activityWindowDays);
    for (const activity of snapshot.activities) {
      if (scope.excludeActivity(activity.itemId)) continue;
      if (!Number.isFinite(activity.timestamp) || activity.timestamp > Date.parse(now) || laDayKey(new Date(activity.timestamp)) < windowStart) continue;
      const facts = activity.changes.map(change => `${change.field}: ${text(change.oldValue) || "(empty)"} → ${text(change.newValue) || "(empty)"}`);
      if (!textMatches([activity.itemId, activity.metadata?.customerName, ...facts].join(" "), plan.terms)) continue;
      if (/\bframed\b/i.test(activity.metadata?.design ?? "")) continue;
      results.push({kind: "activity", key: `activity:${activity.id}`, title: activity.metadata?.customerName ?? activity.itemId,
        detail: `Recorded ${activity.type}`, facts, sources: [{label: "Tuesday activity log", href: "/stats/activity"}],
        orderId: activity.itemId, observedAt: new Date(activity.timestamp).toISOString(), observedPrecision: "time",
        uncertainty: ["A recorded change alone does not establish unusual activity or a customer agreement."],
      });
    }
  }

  // Put customer evidence before generic due-date matches so it survives result limits.
  results.sort((left, right) => ASK_TUESDAY.resultPriority[left.kind] - ASK_TUESDAY.resultPriority[right.kind]);
  const pageLabel = PAGE_LABELS[request.page] ?? (request.page.startsWith("/stats") ? "Statistics" : request.page);
  const totalMatches = results.length;
  const summary = !totalMatches ? "No matching records in the available sources. Missing records do not mean there are no issues."
    : `${plan.intent === "page" ? `${pageLabel}: ` : ""}${totalMatches} matching record${totalMatches === NEXT_DAY_OFFSET ? "" : "s"} from the available sources.`;
  const limitations = [...new Set([
    "Fresh AI answers are unavailable; these are retrieved records, not an AI interpretation.",
    "Live Etsy messages are not connected. Saved findings cannot replace the full relevant buyer history and final agreements.",
    "Customer arrival windows, holds and actual promises override routine dashboard due dates; due dates shown are not verified arrival commitments.",
    ...snapshot.limitations, ...(snapshot.knowledge?.limitations ?? []),
    ...(scope.limitation ? [scope.limitation] : []),
    ...(snapshot.ordersTruncated ? ["Order lookup reached its record limit; results may be incomplete."] : []),
    ...(snapshot.activitiesTruncated ? ["Only the latest activity records were loaded; activity coverage is incomplete."] : []),
    ...(totalMatches > ASK_TUESDAY.maxResults ? [`Showing the first ${ASK_TUESDAY.maxResults} matches. Refine the customer or order search.`] : []),
    ...(plan.intent === "page" ? ["Page context includes its route and order search only; other visible filters and chart values are not captured."] : []),
    ...(isActivity ? ["Recent activity is not an anomaly detector. Ordinary staff progress is not automatically unusual."] : []),
  ])];
  return {mode: "record-search", summary, page: request.page, totalMatches,
    results: results.slice(EMPTY_COUNT, ASK_TUESDAY.maxResults), limitations,
    freshness: {ordersCheckedAt: snapshot.ordersCheckedAt, activitiesCheckedAt: snapshot.activitiesCheckedAt,
      reviewObservedOn: snapshot.knowledge?.reviewObservedOn ?? null, sourceUpdatedAt: snapshot.knowledge?.sourceUpdatedAt ?? null,
      importedAt: snapshot.knowledge?.importedAt ?? null},
    capabilities: {inference: "unavailable", liveEtsy: "unavailable", savedConversations: snapshot.knowledge?.conversations.length ? "available" : "unavailable"},
  };
}
