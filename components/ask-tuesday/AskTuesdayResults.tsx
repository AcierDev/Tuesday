"use client";

import React from "react";
import { ASK_TUESDAY } from "@/config/ask-tuesday";
import { messageLinkFor } from "@/lib/ask-tuesday/message-link";
import type { AskTuesdayResponse, TuesdayIssue } from "@/lib/ask-tuesday/types";

const EMPTY_COUNT = 0;
const FIRST_NUMBER = 1;
const CALENDAR_DATE_TIME_ZONE = "UTC";
const INCOMPLETE_INFORMATION = /incomplete|truncated|(?:exceed|reached).*limit|(?:orders|activity|review|messages?|snapshots?).*unavailable/i;
const AGREEMENT_LABELS = {
  final: "Final agreement",
  proposal: "Proposal",
  superseded: "Superseded agreement",
} as const;
const ISSUE_RULE_LABELS: Record<TuesdayIssue["rule"], string> = {
  overdue: "Overdue",
  "requirements-check": "Check requirements",
  "saved-review": "Review",
};

export function DateEvidence({ label, value, dateOnly = false }: { label: string; value: string | null; dateOnly?: boolean }) {
  const parsed = value ? new Date(value) : null;
  const display = value && parsed && !Number.isNaN(parsed.getTime())
    ? new Intl.DateTimeFormat("en-US", {
      timeZone: dateOnly ? CALENDAR_DATE_TIME_ZONE : ASK_TUESDAY.timeZone,
      month: "short", day: "numeric", year: "numeric",
      ...(dateOnly ? {} : { hour: "numeric", minute: "2-digit", timeZoneName: "short" } as const),
    }).format(parsed)
    : value;
  return <p>{label}: {value ? <time dateTime={value}>{display}</time> : "Unavailable"}</p>;
}

export function AskTuesdayResults({ response, referencePrefix, onOpenOrder, issueMode = false, incomplete = false, showOrderAction = true }: {
  response: AskTuesdayResponse;
  referencePrefix: string;
  onOpenOrder: (id: string) => void;
  issueMode?: boolean;
  incomplete?: boolean;
  showOrderAction?: boolean;
}) {
  const informationNotice = !response.freshness.ordersCheckedAt ? "Current orders could not be checked."
    : incomplete || response.limitations.some((limitation) => INCOMPLETE_INFORMATION.test(limitation))
      ? "Some orders or messages could not be checked." : null;
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium leading-relaxed text-slate-200">{response.summary}</p>
      {informationNotice && <p role="status" className="text-xs leading-relaxed text-amber-200/85">{informationNotice}</p>}
      {response.totalMatches > response.results.length && <p className="text-xs text-slate-400">Showing {response.results.length} of {response.totalMatches} items.</p>}
      <div className="space-y-2">
        {response.results.map((result) => {
          const issue = issueMode ? result as TuesdayIssue : null;
          const messageLink = messageLinkFor(result);
          const messageAnchor = (id: string) => `${referencePrefix}-${encodeURIComponent(result.key)}-message-${encodeURIComponent(id)}`;
          const messages = result.messages ?? [];
          const otherSources = result.sources.filter((source) => source.href !== messageLink?.href
            && !(result.orderId && source.href === "/orders"));
          return (
            <details key={result.key} data-tuesday-result={true}
              className="group overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 open:border-sky-300/25 open:bg-slate-900">
              <summary className="flex cursor-pointer list-none items-start gap-3 p-3 hover:bg-white/[0.035] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-300 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="break-words text-sm font-semibold text-slate-100">{result.title}</span>
                    {issue && <span className={`rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium ${issue.severity === "attention" ? "bg-amber-300/10 text-amber-200" : "bg-slate-700/60 text-slate-300"}`}>{ISSUE_RULE_LABELS[issue.rule]}</span>}
                  </span>
                  <span className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-400">{result.detail}</span>
                </span>
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"
                  className="mt-1 h-4 w-4 shrink-0 text-slate-500 group-open:rotate-180">
                  <path d="m5 7 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="space-y-4 border-t border-white/10 px-3 pb-3 pt-3">
                {((showOrderAction && result.orderId) || messageLink) && <div className="flex flex-wrap gap-2">
                  {showOrderAction && result.orderId && <button type="button" aria-label={`Open order ${result.orderId}`}
                    onClick={() => onOpenOrder(result.orderId!)}
                    className="rounded-lg bg-sky-300/10 px-3 py-2 text-xs font-medium text-sky-200 hover:bg-sky-300/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
                    Open order
                  </button>}
                  {messageLink && <a href={messageLink.href} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-sky-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">{messageLink.label} ↗</a>}
                </div>}
                <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300">{result.detail}</p>
                {result.facts.length > EMPTY_COUNT && <div>
                  <h4 className="mb-2 text-xs font-semibold text-slate-200">{result.kind === "finding" ? "Order and message details" : "Order details"}</h4>
                  <ul className="space-y-2 text-xs leading-relaxed text-slate-300">
                    {result.facts.map((fact) => <li key={fact} className="whitespace-pre-wrap break-words">{fact}</li>)}
                  </ul>
                </div>}
                {result.kind !== "order" && <div className="text-[0.7rem] text-slate-500">
                  <DateEvidence label={result.kind === "activity" ? "Changed" : "Reviewed"}
                    value={result.observedAt} dateOnly={result.observedPrecision === "date"} />
                </div>}
                {result.agreements?.map((agreement, agreementIndex) => (
                  <div key={`${agreement.status}-${agreementIndex}`} className="border-l-2 border-slate-600 pl-3 text-xs leading-relaxed">
                    <p className={agreement.status === "final" ? "font-medium text-emerald-300" : "font-medium text-slate-400"}>{AGREEMENT_LABELS[agreement.status]}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-slate-300">{agreement.text}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {agreement.messageIds.map((id) => {
                        const quoteIndex = messages.findIndex((message) => message.id === id);
                        return quoteIndex >= EMPTY_COUNT ? (
                          <a key={id} href={`#${messageAnchor(id)}`} className="text-sky-300 underline underline-offset-2">Quote {quoteIndex + FIRST_NUMBER}</a>
                        ) : <span key={id} className="text-amber-200">Message unavailable</span>;
                      })}
                    </div>
                  </div>
                ))}
                {messages.length > EMPTY_COUNT && <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-200">Messages</h4>
                  {messages.map((message, messageIndex) => (
                    <div key={message.id} id={messageAnchor(message.id)} className="scroll-mt-3 rounded-lg bg-black/15 p-2 text-xs">
                      <p className="mb-1 text-slate-400">Quote {messageIndex + FIRST_NUMBER} · {message.sender === "buyer" ? "Buyer" : "Seller"}</p>
                      <blockquote className="whitespace-pre-wrap break-words border-l border-slate-600 pl-2 leading-relaxed text-slate-200">{message.text}</blockquote>
                      <div className="mt-1 text-[0.65rem] text-slate-500"><DateEvidence label="Sent" value={message.sentAt} /></div>
                    </div>
                  ))}
                </div>}
                {result.uncertainty.length > EMPTY_COUNT && <details className="text-xs leading-relaxed text-slate-400">
                  <summary className="cursor-pointer py-1 text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">Things to confirm</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {result.uncertainty.map((uncertainty) => <li key={uncertainty}>{uncertainty}</li>)}
                  </ul>
                </details>}
                {otherSources.length > EMPTY_COUNT && <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {otherSources.map((source) => <a key={`${source.href}-${source.label}`} href={source.href}
                    target="_blank" rel="noopener noreferrer" className="break-words text-sky-300 underline underline-offset-2">{source.label} ↗</a>)}
                </div>}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
