"use client";

import React from "react";
import { ASK_TUESDAY } from "@/config/ask-tuesday";
import type { AskTuesdayResponse, TuesdayIssue } from "@/lib/ask-tuesday/types";

const FIRST_NUMBER = 1;
const AGREEMENT_LABELS = {
  final: "Final agreement",
  proposal: "Proposal",
  superseded: "Superseded agreement",
} as const;
const ISSUE_RULE_LABELS: Record<TuesdayIssue["rule"], string> = {
  overdue: "Dashboard deadline passed",
  "requirements-check": "Requirements need checking",
  "saved-review": "Saved Etsy review",
};

export function DateEvidence({ label, value, dateOnly = false }: { label: string; value: string | null; dateOnly?: boolean }) {
  const parsed = value ? new Date(value) : null;
  const display = value && parsed && !Number.isNaN(parsed.getTime())
    ? dateOnly ? value : new Intl.DateTimeFormat("en-US", {
      timeZone: ASK_TUESDAY.timeZone, month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit", timeZoneName: "short",
    }).format(parsed)
    : value;
  return <p>{label}: {value ? <time dateTime={value}>{display}</time> : "Unavailable"}</p>;
}

export function AskTuesdayResults({ response, referencePrefix, onOpenOrder, issueMode = false }: {
  response: AskTuesdayResponse;
  referencePrefix: string;
  onOpenOrder: (id: string) => void;
  issueMode?: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-slate-100">{response.summary}</p>
      <div aria-label="Source availability" className="space-y-1 border-l-2 border-sky-400/50 pl-3 text-xs text-slate-400">
        <DateEvidence label="Live orders checked" value={response.freshness.ordersCheckedAt} />
        <DateEvidence label="Activity checked" value={response.freshness.activitiesCheckedAt} />
        <DateEvidence label="Saved review observed" value={response.freshness.reviewObservedOn} dateOnly />
      </div>
      <details aria-label="All coverage limits" className="rounded-xl border border-amber-300/15 bg-amber-300/5 p-3 text-xs leading-relaxed text-amber-100/85">
        <summary className="cursor-pointer font-medium">Coverage limits · saved evidence may be incomplete</summary>
        {response.limitations.length ? (
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {response.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
          </ul>
        ) : <p className="mt-1">No additional coverage limits reported.</p>}
      </details>
      {response.results.map((result) => {
        const issue = issueMode ? result as TuesdayIssue : null;
        const messageAnchor = (id: string) => `${referencePrefix}-${encodeURIComponent(result.key)}-message-${encodeURIComponent(id)}`;
        const messages = result.messages ?? [];
        return (
          <article key={result.key} className="space-y-2 rounded-xl border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="mb-1 text-[0.65rem] font-medium uppercase tracking-wider text-sky-300">{issue ? ISSUE_RULE_LABELS[issue.rule] : result.kind === "conversation" ? "Saved conversation" : result.kind}</p>
                {issue && <p className="mb-1 text-xs text-amber-100">{issue.severity === "attention" ? "Needs attention" : "Needs review"}</p>}
                <h4 className="break-words text-sm font-medium text-slate-100">{result.title}</h4>
              </div>
              {result.orderId && <button type="button" aria-label={`Open order ${result.orderId}`}
                onClick={() => onOpenOrder(result.orderId!)}
                className="shrink-0 rounded-lg border border-white/15 px-2 py-1 text-xs text-sky-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
                Open order
              </button>}
            </div>
            <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300">{result.detail}</p>
            {result.facts.length > 0 && <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-300">
              {result.facts.map((fact) => <li key={fact}>{fact}</li>)}
            </ul>}
            <div className="space-y-1 text-[0.7rem] text-slate-400">
              <DateEvidence label={result.kind === "conversation" ? "Conversation checked" : "Observed"}
                value={result.observedAt} dateOnly={result.observedPrecision === "date"} />
              {result.kind === "order" && <DateEvidence label="Live order checked" value={response.freshness.ordersCheckedAt} />}
              {result.kind === "activity" && <DateEvidence label="Activity checked" value={response.freshness.activitiesCheckedAt} />}
            </div>
            {result.agreements?.map((agreement, agreementIndex) => (
              <div key={`${agreement.status}-${agreementIndex}`} className="border-l-2 border-slate-500/50 pl-3 text-xs leading-relaxed">
                <p className={agreement.status === "final" ? "font-medium text-emerald-300" : "font-medium text-amber-200"}>{AGREEMENT_LABELS[agreement.status]}</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-300">{agreement.text}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {agreement.messageIds.map((id) => {
                    const quoteIndex = messages.findIndex((message) => message.id === id);
                    return quoteIndex >= 0 ? (
                      <a key={id} href={`#${messageAnchor(id)}`} className="text-sky-300 underline underline-offset-2">Quote {quoteIndex + FIRST_NUMBER}</a>
                    ) : <span key={id} className="text-amber-200">Referenced quote unavailable</span>;
                  })}
                </div>
              </div>
            ))}
            {messages.map((message, messageIndex) => (
              <div key={message.id} id={messageAnchor(message.id)} className="scroll-mt-3 rounded-lg bg-black/15 p-2 text-xs">
                <p className="mb-1 text-slate-400">Quote {messageIndex + FIRST_NUMBER} · {message.sender === "buyer" ? "Buyer" : "Seller"}</p>
                <blockquote className="whitespace-pre-wrap break-words border-l border-slate-500 pl-2 leading-relaxed text-slate-200">{message.text}</blockquote>
                <div className="mt-1 text-[0.65rem] text-slate-500"><DateEvidence label="Sent" value={message.sentAt} /></div>
              </div>
            ))}
            <div className="text-xs leading-relaxed text-amber-100/80">
              <p className="font-medium">Evidence gaps</p>
              {result.uncertainty.length ? <ul className="mt-1 list-disc space-y-1 pl-4">
                {result.uncertainty.map((uncertainty) => <li key={uncertainty}>{uncertainty}</li>)}
              </ul> : <p className="mt-1">No additional gaps reported for this record.</p>}
            </div>
            {result.sources.length > 0 && <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {result.sources.map((source) => <a key={`${source.href}-${source.label}`} href={source.href}
                target="_blank" rel="noopener noreferrer" className="break-words text-sky-300 underline underline-offset-2">{source.label} ↗</a>)}
            </div>}
          </article>
        );
      })}
      <details className="text-[0.7rem] text-slate-500">
        <summary className="cursor-pointer py-1 text-slate-400">Saved source dates</summary>
        <div className="mt-1 space-y-1">
          <DateEvidence label="Saved source updated" value={response.freshness.sourceUpdatedAt} />
          <DateEvidence label="Imported" value={response.freshness.importedAt} />
        </div>
      </details>
    </div>
  );
}
