"use client";

import React from "react";
import { ASK_TUESDAY } from "@/config/ask-tuesday";
import type { OrderCustomerChat } from "@/lib/ask-tuesday/types";

const EMPTY_COUNT = 0;
const ETSY_MESSAGES_URL = "https://www.etsy.com/messages";
const LINK_CLASS = "inline-flex items-center rounded-lg border border-sky-400/25 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300";

function MessagesLink({ threadId }: { threadId?: string }) {
  return <a href={threadId ? `${ETSY_MESSAGES_URL}/${threadId}` : ETSY_MESSAGES_URL}
    target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
    {threadId ? "View messages" : "Open Etsy inbox"}
  </a>;
}

export function CustomerChatSummary({ chats, stale, partial }: { chats: OrderCustomerChat[]; stale: boolean; partial: boolean }) {
  return <div className="space-y-4">
    {stale && <p role="status" className="text-xs text-amber-200">Saved summary — current checks are unavailable.</p>}
    {partial && !stale && <p role="status" className="text-xs text-amber-200">Some messages could not be checked.</p>}
    {chats.length === EMPTY_COUNT && <div className="space-y-3">
      <p className="text-sm text-slate-300">Summary not available yet.</p>
      <MessagesLink />
    </div>}
    {chats.map(chat => <article key={chat.threadId} data-customer-chat={chat.threadId} className="space-y-3">
      {chat.summary ? <>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-300">AI summary</h3>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">{chat.summary.text}</p>
        </div>
        {chat.summary.highlights.length > EMPTY_COUNT && <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-300">
          {chat.summary.highlights.map((highlight, index) => <li key={index} className="break-words">{highlight}</li>)}
        </ul>}
        {chat.summary.nextAction && <p className="break-words text-sm text-slate-200"><span className="font-semibold text-sky-200">Next: </span>{chat.summary.nextAction}</p>}
      </> : <p className="text-sm text-slate-300">Summary not available yet.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <MessagesLink threadId={chat.threadId} />
        <span className="text-xs text-slate-500">Saved {new Date(chat.checkedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: ASK_TUESDAY.timeZone })}</span>
      </div>
      {!chat.historyComplete && <p className="text-xs text-amber-200">Earlier messages may be missing.</p>}
      {!!chat.summary?.evidence.length && <details className="rounded-lg border border-white/10 px-3 py-2">
        <summary className="cursor-pointer text-xs text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">Message excerpts</summary>
        <div className="mt-3 space-y-3">
          {chat.summary.evidence.map((quote, index) => <blockquote key={index} className="border-l border-sky-400/25 pl-3 text-xs leading-relaxed text-slate-300">
            <p className="mb-1 font-medium text-slate-400">{quote.sender === "buyer" ? "Buyer" : "You"}</p>
            <p className="whitespace-pre-wrap break-words">{quote.text}</p>
          </blockquote>)}
        </div>
      </details>}
    </article>)}
  </div>;
}
