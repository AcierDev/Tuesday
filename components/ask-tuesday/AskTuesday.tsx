"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ASK_TUESDAY, ASK_TUESDAY_HTTP } from "@/config/ask-tuesday";
import type { AskTuesdayResponse } from "@/lib/ask-tuesday/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { AskTuesdayResults } from "./AskTuesdayResults";
import { TuesdayIssues } from "./TuesdayIssues";
import { useTuesdayScan } from "./useTuesdayScan";

const TEXTAREA_ROWS = 2;
const LAST_TURN_OFFSET = 1;
const EMPTY_COUNT = 0;
const PANEL_HEIGHT = "min(40rem, calc(100dvh - 9rem - env(safe-area-inset-bottom)))";
const PANEL_WIDTH = "min(28rem, calc(100vw - 1.5rem))";
const SUGGESTIONS = [
  { label: "Needs attention", ariaLabel: "Search attention", question: "What needs attention?" },
  { label: "This page", ariaLabel: "Search current page", question: "What matters on this page?" },
  { label: "Recent activity", ariaLabel: "Search recent activity", question: "Show unusual or recent activity" },
] as const;

type SearchTurn = {
  id: string;
  question: string;
  response?: AskTuesdayResponse;
  error?: string;
  pending: boolean;
};

export function AskTuesday() {
  const pathname = usePathname();
  const router = useRouter();
  const orderSearch = useOrderStore((state) => state.searchQuery);
  const setOrderSearch = useOrderStore((state) => state.setSearchQuery);
  const popupId = useId();
  const inputId = `${popupId}-question`;
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"issues" | "search">("issues");
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<SearchTurn[]>([]);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const latestRef = useRef<HTMLElement>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const isMounted = useRef(true);
  const scan = useTuesdayScan();
  const scanUnknown = !!scan.error || !scan.response || scan.response.status === "unavailable";
  const scanBadge = scanUnknown ? scan.pending && !scan.response ? "…" : "?"
    : scan.response!.status === "partial" && scan.response!.totalIssues === EMPTY_COUNT ? "?" : String(scan.response!.totalIssues);
  const scanDescription = scanUnknown ? scan.pending && !scan.response ? "Checking for issues" : "Current issue status is unknown"
    : scan.response!.status === "partial" ? `${scan.response!.totalIssues} issues in checked sources; coverage is incomplete`
      : `${scan.response!.totalIssues} issues detected in checked sources`;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      activeRequest.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && view === "search" && turns.length) latestRef.current?.scrollIntoView({ block: "start" });
  }, [isOpen, view, turns]);

  const closePopup = () => {
    activeRequest.current?.abort();
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const runSearch = async (rawQuestion: string, retryId?: string) => {
    const searched = rawQuestion.trim();
    if (!searched || searched.length > ASK_TUESDAY.maxQuestionLength || activeRequest.current) return;
    setView("search");
    const controller = new AbortController();
    activeRequest.current = controller;
    const id = retryId ?? crypto.randomUUID();
    const turn: SearchTurn = { id, question: searched, pending: true };
    setTurns((current) => retryId
      ? current.map((entry) => entry.id === retryId ? turn : entry)
      : [...current, turn].slice(-ASK_TUESDAY.maxChatTurns));
    setQuestion("");
    setPending(true);
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, ASK_TUESDAY.requestTimeoutMs);

    try {
      const result = await fetch("/api/ask-tuesday", {
        method: "POST", credentials: "same-origin", signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: searched, page: pathname,
          ...(pathname === "/orders" ? { orderSearch } : {}),
        }),
      });
      const payload = await result.json().catch(() => null);
      if (!result.ok) {
        const error = result.status === ASK_TUESDAY_HTTP.unauthorized
          ? "Site password required. Reload Tuesday to sign in."
          : typeof payload?.error === "string" ? payload.error : "Records could not be checked. Try again.";
        throw new Error(error);
      }
      if (payload?.mode !== "record-search" || !Array.isArray(payload.results) || !payload.freshness || !Array.isArray(payload.limitations)) {
        throw new Error("The records response was incomplete. Try again.");
      }
      if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
      if (isMounted.current) setTurns((current) => current.map((entry) => entry.id === id
        ? { ...entry, response: payload as AskTuesdayResponse, pending: false } : entry));
    } catch (error) {
      const message = controller.signal.aborted
        ? timedOut ? "Search timed out. Try again." : "Search canceled. Try again when ready."
        : error instanceof Error ? error.message : "Records could not be checked. Try again.";
      if (isMounted.current) setTurns((current) => current.map((entry) => entry.id === id
        ? { ...entry, error: message, pending: false } : entry));
    } finally {
      clearTimeout(timeout);
      if (activeRequest.current === controller) activeRequest.current = null;
      if (isMounted.current) setPending(false);
    }
  };

  const openOrder = (id: string) => {
    setOrderSearch(id);
    router.push("/orders");
  };

  return (
    <div className="pointer-events-none fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-[60] flex flex-col items-end gap-3 lg:bottom-6 lg:right-6">
      {isOpen && (
        <section id={popupId} role="region" aria-label="Ask Tuesday"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              closePopup();
            }
          }}
          style={{ width: PANEL_WIDTH, height: PANEL_HEIGHT }}
          className="pointer-events-auto flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-slate-100">Ask Tuesday</h2>
              <p className="mt-0.5 text-xs text-sky-300">Automatic issue checks</p>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">Current orders and saved Etsy reviews. Live Etsy messages aren’t connected to this popup.</p>
            </div>
            <button type="button" aria-label="Close Ask Tuesday" onClick={closePopup}
              className="rounded-lg px-2 py-1 text-xl leading-none text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">×</button>
          </header>
          <div role="group" aria-label="Tuesday view" className="flex shrink-0 gap-2 border-b border-white/10 px-4 py-2">
            <button type="button" aria-pressed={view === "issues"} aria-label="Show automatic issues"
              onClick={() => setView("issues")} className={`rounded-lg px-3 py-1.5 text-xs ${view === "issues" ? "bg-sky-300/15 text-sky-200" : "text-slate-400 hover:bg-white/5"}`}>Issues</button>
            <button type="button" aria-pressed={view === "search"} aria-label="Show record search"
              onClick={() => setView("search")} className={`rounded-lg px-3 py-1.5 text-xs ${view === "search" ? "bg-sky-300/15 text-sky-200" : "text-slate-400 hover:bg-white/5"}`}>Ask / search</button>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
            {view === "issues" ? <TuesdayIssues scan={scan.response} pending={scan.pending} error={scan.error}
              onRetry={scan.refresh} onOpenOrder={openOrder} referencePrefix={`${popupId}-issues`} /> : <>
            {!turns.length && <div className="space-y-3">
              <p className="text-sm leading-relaxed text-slate-300">Search current orders, saved reviews, and verified conversation quotes.</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => <button key={suggestion.label} type="button" aria-label={suggestion.ariaLabel}
                  onClick={() => { void runSearch(suggestion.question); }} disabled={pending}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">{suggestion.label}</button>)}
              </div>
              <p className="text-xs leading-relaxed text-slate-500">Saved evidence may be incomplete. Every result shows its source dates and evidence gaps.</p>
            </div>}
            {turns.map((turn, index) => <article key={turn.id} ref={index === turns.length - LAST_TURN_OFFSET ? latestRef : undefined}
              data-search-turn={true} className="space-y-3 border-b border-white/10 pb-4 last:border-0">
              <div>
                <p className="mb-1 text-[0.65rem] font-medium uppercase tracking-wider text-slate-500">You searched</p>
                <h3 className="whitespace-pre-wrap break-words text-sm font-medium text-slate-200">{turn.question}</h3>
              </div>
              {turn.pending && <p role="status" className="text-sm text-sky-300">Checking records…</p>}
              {turn.error && <div className="space-y-2 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3">
                <p role="alert" className="text-xs leading-relaxed text-amber-100">{turn.error}</p>
                <button type="button" aria-label="Retry search" disabled={pending}
                  onClick={() => { void runSearch(turn.question, turn.id); }}
                  className="rounded-lg border border-amber-300/20 px-2 py-1 text-xs text-amber-100 hover:bg-white/10 disabled:opacity-50">Retry</button>
              </div>}
              {turn.response && <AskTuesdayResults response={turn.response} referencePrefix={turn.id} onOpenOrder={openOrder} />}
            </article>)}
            </>}
          </div>
          <form className="shrink-0 space-y-2 border-t border-white/10 p-3" onSubmit={(event) => {
            event.preventDefault();
            void runSearch(question);
          }}>
            <label htmlFor={inputId} className="block text-xs text-slate-400">Customer, order, or question</label>
            <div className="flex items-end gap-2">
              <textarea ref={inputRef} id={inputId} rows={TEXTAREA_ROWS} value={question}
                maxLength={ASK_TUESDAY.maxQuestionLength} placeholder="Search Tuesday records…"
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void runSearch(question);
                  }
                }}
                className="min-w-0 flex-1 resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-400/70 focus:outline-none" />
              <button type="submit" aria-label="Search records" disabled={pending || !question.trim()}
                className="rounded-xl bg-sky-300 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-200 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">Search</button>
            </div>
            <p className="text-[0.65rem] text-slate-500">{view === "issues" ? "Automatic checks cover the active board, independent of your filter."
              : <>Uses this page{pathname === "/orders" && orderSearch ? " and your order filter" : ""}. Searches do not change orders.</>}</p>
          </form>
        </section>
      )}
      <button ref={triggerRef} type="button" aria-label={isOpen ? "Hide Ask Tuesday" : "Open Ask Tuesday"}
        aria-expanded={isOpen} aria-controls={popupId} onClick={() => { if (isOpen) closePopup(); else setIsOpen(true); }}
        className="pointer-events-auto rounded-full border border-sky-200/25 bg-slate-950/95 px-4 py-3 text-sm font-medium text-sky-100 shadow-lg shadow-black/40 backdrop-blur-md hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
        Ask Tuesday
        <span aria-label="Automatic check status" title={scanDescription}
          className={`ml-2 inline-flex min-w-[1.5rem] justify-center rounded-full px-1.5 py-0.5 text-xs ${scanUnknown || scan.response?.status === "partial" ? "bg-amber-300/15 text-amber-100" : "bg-sky-300/15 text-sky-100"}`}>{scanBadge}</span>
      </button>
    </div>
  );
}
