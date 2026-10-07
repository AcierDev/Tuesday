"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ASK_TUESDAY, ASK_TUESDAY_HTTP } from "@/config/ask-tuesday";
import type { TuesdayScanResponse } from "@/lib/ask-tuesday/types";

const EMPTY_COUNT = 0;
const SCAN_STATUSES = new Set(["checked", "partial", "unavailable"]);
const ISSUE_RULES = new Set(["overdue", "requirements-check", "saved-review"]);
const ISSUE_SEVERITIES = new Set(["attention", "review"]);
const MESSAGE_SENDERS = new Set(["buyer", "seller"]);
const ETSY_THREAD_ID = /^\d+$/;

function isCustomerChat(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const chat = value as Record<string, unknown>;
  const validText = (text: unknown, maxLength: number = ASK_TUESDAY.maxSummaryLength) =>
    typeof text === "string" && text.trim().length > EMPTY_COUNT && text.length <= maxLength;
  if (typeof chat.threadId !== "string" || !ETSY_THREAD_ID.test(chat.threadId)
    || !validText(chat.buyerName, ASK_TUESDAY.maxTextLength)
    || !Array.isArray(chat.orderIds) || chat.orderIds.length === EMPTY_COUNT
    || !chat.orderIds.every(id => validText(id, ASK_TUESDAY.maxTextLength))
    || typeof chat.checkedAt !== "string" || !Number.isFinite(Date.parse(chat.checkedAt))
    || typeof chat.historyComplete !== "boolean") return false;
  if (chat.summary === null) return true;
  if (!chat.summary || typeof chat.summary !== "object") return false;
  const summary = chat.summary as Record<string, unknown>;
  return validText(summary.text)
    && Array.isArray(summary.highlights) && summary.highlights.length <= ASK_TUESDAY.maxSummaryHighlights
    && summary.highlights.every(highlight => validText(highlight))
    && (summary.nextAction === null || validText(summary.nextAction))
    && Array.isArray(summary.evidence) && summary.evidence.length <= ASK_TUESDAY.maxSummaryEvidence
    && summary.evidence.every(quote => !!quote && typeof quote === "object"
      && MESSAGE_SENDERS.has(quote.sender) && validText(quote.text, ASK_TUESDAY.maxSummaryQuoteLength));
}

function isIssue(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const issue = value as Record<string, unknown>;
  const validId = (id: unknown) => typeof id === "string" && id.trim().length > EMPTY_COUNT;
  return typeof issue.key === "string" && typeof issue.title === "string" && typeof issue.detail === "string"
    && ISSUE_RULES.has(issue.rule as string) && ISSUE_SEVERITIES.has(issue.severity as string)
    && (issue.orderId === undefined || validId(issue.orderId))
    && (issue.orderIds === undefined || Array.isArray(issue.orderIds) && issue.orderIds.every(validId))
    && Array.isArray(issue.facts) && Array.isArray(issue.sources) && Array.isArray(issue.uncertainty);
}

function isScanResponse(value: unknown): value is TuesdayScanResponse {
  if (!value || typeof value !== "object") return false;
  const scan = value as Record<string, unknown>;
  return scan.mode === "issue-scan" && typeof scan.checkedAt === "string"
    && Number.isFinite(Date.parse(scan.checkedAt)) && typeof scan.status === "string" && SCAN_STATUSES.has(scan.status)
    && typeof scan.totalIssues === "number" && Number.isInteger(scan.totalIssues) && scan.totalIssues >= EMPTY_COUNT
    && !!scan.freshness && typeof scan.freshness === "object" && !!scan.capabilities && typeof scan.capabilities === "object"
    && Array.isArray(scan.limitations) && scan.limitations.every(limit => typeof limit === "string")
    && Array.isArray(scan.issues) && scan.totalIssues >= scan.issues.length
    && scan.issues.every(isIssue)
    && (scan.orderIssues === undefined || Array.isArray(scan.orderIssues) && scan.orderIssues.every(isIssue))
    && (scan.customerChats === undefined || Array.isArray(scan.customerChats)
      && scan.customerChats.length <= ASK_TUESDAY.maxConversations && scan.customerChats.every(isCustomerChat));
}

export function useTuesdayScanPolling() {
  const [state, setState] = useState<{ response: TuesdayScanResponse | null; pending: boolean; error: string | null }>({
    response: null, pending: false, error: null,
  });
  const refreshRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    let alive = true;
    let busy = false;
    let activeRequest: AbortController | null = null;
    let requestTimeout: ReturnType<typeof setTimeout> | undefined;
    const available = () => alive && document.visibilityState === "visible";
    const check = async () => {
      if (busy || !available()) return;
      busy = true;
      const request = new AbortController();
      activeRequest = request;
      setState(current => ({ ...current, pending: true }));
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        request.abort();
      }, ASK_TUESDAY.requestTimeoutMs);
      requestTimeout = timeout;
      try {
        const response = await fetch(ASK_TUESDAY.scanEndpoint, {
          method: "GET", credentials: "same-origin", cache: "no-store", signal: request.signal,
        });
        if (!response.ok) throw new Error(response.status === ASK_TUESDAY_HTTP.unauthorized
          ? "Site password required. Reload Tuesday to sign in." : "Automatic checks could not be refreshed.");
        const payload: unknown = await response.json();
        if (!isScanResponse(payload)) throw new Error("Automatic check results were incomplete. Try again.");
        if (request.signal.aborted) throw new DOMException("Aborted", "AbortError");
        if (alive) setState({ response: payload, pending: false, error: null });
      } catch (error) {
        if (alive) setState(current => ({ ...current, pending: false,
          error: timedOut ? "Automatic check timed out. Current issue status is unknown."
            : error instanceof Error ? error.message : "Automatic checks could not be refreshed.",
        }));
      } finally {
        clearTimeout(timeout);
        requestTimeout = undefined;
        activeRequest = null;
        busy = false;
      }
    };
    const refresh = () => { void check(); };
    refreshRef.current = refresh;
    refresh();
    const interval = setInterval(refresh, ASK_TUESDAY.scanIntervalMs);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false;
      activeRequest?.abort();
      clearTimeout(requestTimeout);
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      if (refreshRef.current === refresh) refreshRef.current = () => undefined;
    };
  }, []);

  const refresh = useCallback(() => refreshRef.current(), []);
  return { ...state, refresh };
}
