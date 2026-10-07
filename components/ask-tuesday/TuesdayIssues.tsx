"use client";

import React from "react";
import type { AskTuesdayResponse, TuesdayScanResponse } from "@/lib/ask-tuesday/types";
import { AskTuesdayResults } from "./AskTuesdayResults";

const EMPTY_COUNT = 0;
const SINGLE_ISSUE_COUNT = 1;

export function TuesdayIssues({ scan, pending, error, onRetry, onOpenOrder, referencePrefix }: {
  scan: TuesdayScanResponse | null;
  pending: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenOrder: (id: string) => void;
  referencePrefix: string;
}) {
  const summary = !scan ? "Orders have not been checked yet."
    : error ? "Last findings — current checks are unavailable."
    : scan.status === "unavailable" ? "Orders could not be checked."
    : scan.totalIssues === EMPTY_COUNT ? "No issues found in the available information."
    : `${scan.totalIssues} item${scan.totalIssues === SINGLE_ISSUE_COUNT ? "" : "s"} to review`;
  const results: AskTuesdayResponse | null = scan ? {
    mode: "record-search", page: "/orders", summary, results: scan.issues, totalMatches: scan.totalIssues,
    freshness: scan.freshness, capabilities: scan.capabilities, limitations: scan.limitations,
  } : null;

  return <div aria-label="Automatic issues" className="space-y-3">
    {pending && <p role="status" className="text-xs text-sky-300">{scan ? "Updating automatic checks…" : "Checking for issues…"}</p>}
    {error && <div className="space-y-2 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3">
      <p role="alert" className="text-xs leading-relaxed text-amber-100">{error}</p>
      <button type="button" aria-label="Retry automatic checks" disabled={pending} onClick={onRetry}
        className="rounded-lg border border-amber-300/20 px-2 py-1 text-xs text-amber-100 hover:bg-white/10 disabled:opacity-50">Retry checks</button>
    </div>}
    {results ? <AskTuesdayResults response={results} referencePrefix={referencePrefix} onOpenOrder={onOpenOrder} issueMode incomplete={scan?.status === "partial"} />
      : <p className="text-xs leading-relaxed text-slate-400">{summary}</p>}
  </div>;
}
