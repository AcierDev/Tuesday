"use client";

import React from "react";
import type { AskTuesdayResponse, TuesdayScanResponse } from "@/lib/ask-tuesday/types";
import { AskTuesdayResults, DateEvidence } from "./AskTuesdayResults";

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
  const summary = !scan ? "Issue status is unknown until a check completes."
    : error ? "Last successful findings are shown below. Current issue status is unknown."
    : scan.status === "unavailable" ? "Automatic checks are unavailable. Current issue status is unknown."
    : scan.totalIssues === EMPTY_COUNT ? "No issues detected in checked sources."
    : `${scan.totalIssues} issue${scan.totalIssues === SINGLE_ISSUE_COUNT ? "" : "s"} detected in checked sources.`;
  const results: AskTuesdayResponse | null = scan ? {
    mode: "record-search", page: "/orders", summary, results: scan.issues, totalMatches: scan.totalIssues,
    freshness: scan.freshness, capabilities: scan.capabilities, limitations: scan.limitations,
  } : null;

  return <div aria-label="Automatic issues" className="space-y-3">
    <div>
      <h3 className="text-sm font-semibold text-slate-100">Detected issues</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">Tuesday checks current orders and saved Etsy reviews while this dashboard is open.</p>
      {scan && <div className="mt-2 text-xs text-slate-400">
        <DateEvidence label={error ? "Last successful check" : "Checked"} value={scan.checkedAt} />
      </div>}
    </div>
    {pending && <p role="status" className="text-xs text-sky-300">{scan ? "Updating automatic checks…" : "Checking for issues…"}</p>}
    {error && <div className="space-y-2 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3">
      <p className="text-xs leading-relaxed text-amber-100">{error}</p>
      <button type="button" aria-label="Retry automatic checks" disabled={pending} onClick={onRetry}
        className="rounded-lg border border-amber-300/20 px-2 py-1 text-xs text-amber-100 hover:bg-white/10 disabled:opacity-50">Retry checks</button>
    </div>}
    {scan?.status === "partial" && <p className="text-xs leading-relaxed text-amber-100">Coverage is incomplete. The issue count covers only the checked sources.</p>}
    {scan?.status === "unavailable" && <p className="text-xs leading-relaxed text-amber-100">Sources are unavailable. Current issue state is unknown.</p>}
    {results ? <AskTuesdayResults response={results} referencePrefix={referencePrefix} onOpenOrder={onOpenOrder} issueMode />
      : <p className="text-xs leading-relaxed text-slate-400">{summary}</p>}
    <p className="text-[0.7rem] leading-relaxed text-slate-500">Saved review observation dates show when Etsy evidence was checked. Later messages may exist.</p>
  </div>;
}
