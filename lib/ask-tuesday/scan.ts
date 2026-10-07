import { ASK_TUESDAY, ASK_TUESDAY_HTTP, ASK_TUESDAY_NO_STORE } from "../../config/ask-tuesday";
import { ItemStatus } from "../../typings/types";
import { laDayKey } from "../debt-metrics";
import { auditName, excludedFromAudit, validDueKey } from "./search";
import { savedFindingNeedsReview } from "./knowledge";
import type { AskTuesdayRequest, TuesdayIssue, TuesdayScanResponse, TuesdaySnapshot } from "./types";

const EMPTY_COUNT = 0;
const SCAN_REQUEST: AskTuesdayRequest = {question: "What needs attention?", page: "/orders"};
const boundedText = (value: string) => value.slice(EMPTY_COUNT, ASK_TUESDAY.maxTextLength);
const NOT_LIVE_ETSY = "Saved findings describe the state when reviewed; this is not a live Etsy check.";
const DEADLINE_LIMIT = "A dashboard due date is not a verified arrival promise. Customer holds and actual agreements take precedence.";

export function scanTuesdaySnapshot(snapshot: TuesdaySnapshot, now: string): TuesdayScanResponse {
  const today = laDayKey(new Date(now));
  const issues: TuesdayIssue[] = [];
  if (snapshot.ordersCheckedAt) for (const order of snapshot.orders) {
    if (order.visible === false || order.deleted || order.status === ItemStatus.Done || order.status === ItemStatus.Hidden
      || excludedFromAudit(order, snapshot)) continue;
    const due = validDueKey(order, today);
    const rules: {rule: TuesdayIssue["rule"]; detail: string; severity: TuesdayIssue["severity"]}[] = [];
    if (!order.onHold && due && due < today) rules.push({rule: "overdue", detail: `Dashboard due date has passed: ${due}`, severity: "attention"});
    if (/AI needs double check/i.test([order.customerName, order.notes, order.labels].join(" "))) {
      rules.push({rule: "requirements-check", detail: "Saved artwork requirements are marked for double check.", severity: "review"});
    }
    for (const rule of rules) issues.push({
      kind: "order", key: `issue:${rule.rule}:${order.id}`, title: boundedText(order.customerName || order.id),
      detail: rule.detail, rule: rule.rule, severity: rule.severity,
      facts: [order.design && `Design: ${order.design}`, order.size && `Size: ${order.size}`,
        order.notes && `Saved notes: ${order.notes}`, order.labels && `Saved labels: ${order.labels}`,
      ].filter((value): value is string => typeof value === "string" && !!value).map(boundedText),
      sources: [{label: `Tuesday order ${order.id}`, href: "/orders"}], orderId: order.id,
      observedAt: snapshot.ordersCheckedAt, observedPrecision: "time",
      uncertainty: [DEADLINE_LIMIT, "Saved fields alone do not establish the latest buyer agreement.",
        ...(order.onHold ? ["On hold; routine deadline alerts are suppressed."] : [])],
    });
  }
  for (const finding of snapshot.knowledge?.findings ?? []) {
    if (!savedFindingNeedsReview(finding) || (snapshot.knowledge?.excludedAuditCustomers ?? [])
      .some(customer => auditName(customer) === auditName(finding.customer))) continue;
    issues.push({kind: "finding", key: `issue:saved:${finding.key}`, rule: "saved-review", severity: "review",
      title: finding.customer || finding.key,
      detail: finding.action || (finding.status === "unknown" ? "Resolution is unknown in the saved review." : "Unresolved in the saved review."), facts: finding.evidence,
      sources: finding.sources, observedAt: finding.observedOn, observedPrecision: "date",
      uncertainty: [...finding.uncertainty, NOT_LIVE_ETSY,
        ...(finding.status === "unknown" ? ["Saved issue resolution is unknown; it cannot be treated as resolved."] : [])],
    });
  }
  issues.sort((left, right) => ASK_TUESDAY.resultPriority[left.kind] - ASK_TUESDAY.resultPriority[right.kind]);
  const totalIssues = issues.length;
  const status = !snapshot.ordersCheckedAt && !snapshot.knowledge ? "unavailable"
    : !snapshot.ordersCheckedAt || !snapshot.knowledge || snapshot.ordersTruncated || snapshot.knowledge.evidenceTruncated
      || snapshot.knowledge.conversations.some(conversation => !conversation.historyComplete) ? "partial" : "checked";
  return {
    mode: "issue-scan", checkedAt: now, status, totalIssues, issues: issues.slice(EMPTY_COUNT, ASK_TUESDAY.maxScanIssues),
    freshness: {ordersCheckedAt: snapshot.ordersCheckedAt, activitiesCheckedAt: snapshot.activitiesCheckedAt,
      reviewObservedOn: snapshot.knowledge?.reviewObservedOn ?? null, sourceUpdatedAt: snapshot.knowledge?.sourceUpdatedAt ?? null,
      importedAt: snapshot.knowledge?.importedAt ?? null},
    capabilities: {inference: "unavailable", liveEtsy: "unavailable", savedConversations: snapshot.knowledge?.conversations.length ? "available" : "unavailable"},
    limitations: [...new Set([
      "Automatic checks flag recorded risks for review; they do not prove an artwork error or missed arrival promise.",
      "Live Etsy messages are not connected to this website; the scheduled reviewer must supply fresh, cited evidence.",
      ...(snapshot.knowledge?.limitations ?? []), ...snapshot.limitations,
      ...(!snapshot.ordersCheckedAt ? ["Live orders could not be checked."] : []),
      ...(!snapshot.knowledge ? ["Saved Etsy review evidence is unavailable."] : []),
      ...(snapshot.ordersTruncated ? ["The order limit was reached; board coverage is incomplete."] : []),
      ...(snapshot.knowledge?.evidenceTruncated ? ["Saved evidence reached its limit; issue coverage is incomplete."] : []),
      ...(snapshot.knowledge?.conversations.some(conversation => !conversation.historyComplete) ? ["Some saved message histories are incomplete; final requirements remain unverified."] : []),
      ...(totalIssues > ASK_TUESDAY.maxScanIssues ? [`Showing the first ${ASK_TUESDAY.maxScanIssues} recorded issues.`] : []),
    ])],
  };
}

type Dependencies = {
  authorize: (request: Request) => Promise<boolean>;
  load: (request: AskTuesdayRequest) => Promise<TuesdaySnapshot>;
  now: () => string;
};

export async function handleTuesdayScan(request: Request, dependencies: Dependencies): Promise<Response> {
  const json = (data: unknown, status: number) => Response.json(data, {status, headers: ASK_TUESDAY_NO_STORE});
  if (!await dependencies.authorize(request)) return json({error: "Site password required."}, ASK_TUESDAY_HTTP.unauthorized);
  try {
    const snapshot = await dependencies.load(SCAN_REQUEST);
    return json(scanTuesdaySnapshot(snapshot, dependencies.now()), ASK_TUESDAY_HTTP.ok);
  } catch {
    return json({error: "Automatic checks are unavailable. Try again shortly."}, ASK_TUESDAY_HTTP.failure);
  }
}
