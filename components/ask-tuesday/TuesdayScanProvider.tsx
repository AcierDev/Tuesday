"use client";

import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { ItemStatus, type Item } from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";
import type { AskTuesdayResponse, AskTuesdayResult, OrderCustomerChat, TuesdayIssue, TuesdayScanResponse } from "@/lib/ask-tuesday/types";
import { AskTuesdayResults } from "./AskTuesdayResults";
import { CustomerChatSummary } from "./CustomerChatSummary";
import type { CustomerChatOrderReference } from "./OrderCustomerChatIcon";
import { useTuesdayScanPolling } from "./useTuesdayScanPolling";

const EMPTY_COUNT = 0;
const SINGLE_ISSUE_COUNT = 1;
const PANEL_WIDTH = "min(28rem, calc(100vw - 1.5rem))";
const PANEL_HEIGHT = "min(34rem, calc(100dvh - 4rem))";
const EMPTY_ITEMS: Item[] = [];

type OrderReference = Pick<Item, "id" | "status" | "customerName">;
type ScanState = ReturnType<typeof useTuesdayScanPolling>;
type ScanContext = {
  scan: ScanState;
  issuesByOrder: Map<string, TuesdayIssue[]>;
  chatsByOrder: Map<string, OrderCustomerChat[]>;
  excludedOrderIds: Set<string>;
  showOrderIssues: (item: OrderReference, trigger: HTMLButtonElement) => void;
  dismissOrderIssues: (id: string) => void;
  showOrderChat: (item: CustomerChatOrderReference, trigger: HTMLButtonElement) => void;
  dismissOrderChat: (id: string) => void;
  filterSearchResponse: (response: AskTuesdayResponse) => AskTuesdayResponse;
};
const TuesdayScanContext = createContext<ScanContext | null>(null);

export function useTuesdayScanContext() { return useContext(TuesdayScanContext); }

function orderIds(issue: AskTuesdayResult): string[] {
  return [...new Set([...(issue.orderId ? [issue.orderId] : []), ...(issue.orderIds ?? [])])];
}

function activeResults<T extends AskTuesdayResult>(results: T[], completedIds: Set<string>, removedKeys: Set<string>): T[] {
  return results.flatMap((issue) => {
    const linked = orderIds(issue);
    if (!linked.length) return [issue];
    const remaining = linked.filter((id) => !completedIds.has(id));
    if (!remaining.length) { removedKeys.add(issue.key); return []; }
    if (remaining.length === linked.length) return [issue];
    return [{ ...issue, orderId: issue.orderId && remaining.includes(issue.orderId) ? issue.orderId : undefined,
      ...(issue.orderIds ? { orderIds: remaining } : {}),
    }];
  });
}

function withoutCompleted(scan: TuesdayScanResponse | null, completedIds: Set<string>): TuesdayScanResponse | null {
  if (!scan || !completedIds.size) return scan;
  const removedKeys = new Set<string>();
  const issues = activeResults(scan.issues, completedIds, removedKeys);
  const orderIssues = scan.orderIssues ? activeResults(scan.orderIssues, completedIds, removedKeys) : undefined;
  const customerChats = scan.customerChats?.flatMap(chat => {
    const remaining = chat.orderIds.filter(id => !completedIds.has(id));
    return remaining.length > EMPTY_COUNT ? [{ ...chat, orderIds: remaining }] : [];
  });
  return { ...scan, issues, ...(orderIssues ? { orderIssues } : {}), ...(customerChats ? { customerChats } : {}),
    totalIssues: Math.max(issues.length, scan.totalIssues - removedKeys.size),
  };
}

export function TuesdayScanProvider({ children }: { children: React.ReactNode }) {
  const polledScan = useTuesdayScanPolling();
  const items = useOrderStore((state) => state.items) ?? EMPTY_ITEMS;
  const doneItems = useOrderStore((state) => state.doneItems) ?? EMPTY_ITEMS;
  const rememberedCompletedIds = useRef(new Set<string>());
  const completedIds = useMemo(() => {
    const excluded = new Set(rememberedCompletedIds.current);
    // Done pages can be evicted or cleared while reloading. Only an explicit
    // current active record clears a previously observed completed status.
    for (const item of [...doneItems, ...items]) {
      if (item.status === ItemStatus.Done || item.status === ItemStatus.Hidden) excluded.add(item.id);
      else excluded.delete(item.id);
    }
    return excluded;
  }, [items, doneItems]);
  useEffect(() => { rememberedCompletedIds.current = completedIds; }, [completedIds]);
  const response = useMemo(() => withoutCompleted(polledScan.response, completedIds), [polledScan.response, completedIds]);
  const scan = useMemo(() => ({ response, pending: polledScan.pending, error: polledScan.error, refresh: polledScan.refresh }),
    [response, polledScan.pending, polledScan.error, polledScan.refresh]);
  const filterSearchResponse = useCallback((searched: AskTuesdayResponse): AskTuesdayResponse => {
    if (!completedIds.size) return searched;
    const removedKeys = new Set<string>();
    const results = activeResults(searched.results, completedIds, removedKeys);
    const changed = results.length !== searched.results.length || results.some((result, index) => result !== searched.results[index]);
    if (!changed) return searched;
    const totalMatches = Math.max(results.length, searched.totalMatches - removedKeys.size);
    return { ...searched, results, totalMatches,
      summary: totalMatches === EMPTY_COUNT ? "No active matches in these saved results." : "Matching orders and messages",
    };
  }, [completedIds]);
  const issuesByOrder = useMemo(() => {
    const index = new Map<string, TuesdayIssue[]>();
    for (const issue of response?.orderIssues ?? response?.issues ?? []) {
      for (const id of orderIds(issue)) {
        const existing = index.get(id) ?? [];
        existing.push(issue);
        index.set(id, existing);
      }
    }
    return index;
  }, [response]);
  const chatsByOrder = useMemo(() => {
    const index = new Map<string, OrderCustomerChat[]>();
    for (const chat of response?.customerChats ?? []) {
      for (const id of chat.orderIds) {
        const existing = index.get(id) ?? [];
        existing.push(chat);
        index.set(id, existing);
      }
    }
    return index;
  }, [response]);
  const [selectedOrder, setSelectedOrder] = useState<OrderReference | null>(null);
  const [selectedChatOrder, setSelectedChatOrder] = useState<CustomerChatOrderReference | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogId = useId();
  const selectedIssues = selectedOrder && !completedIds.has(selectedOrder.id) ? issuesByOrder.get(selectedOrder.id) ?? [] : [];
  const visible = !!selectedOrder && selectedIssues.length > EMPTY_COUNT;
  const selectedChats = selectedChatOrder && !completedIds.has(selectedChatOrder.id) ? chatsByOrder.get(selectedChatOrder.id) ?? [] : [];
  const chatVisible = !!selectedChatOrder && !completedIds.has(selectedChatOrder.id)
    && (selectedChats.length > EMPTY_COUNT || !!selectedChatOrder.tags?.hasCustomerMessage);
  const close = useCallback(() => {
    setSelectedOrder(null);
    setSelectedChatOrder(null);
    triggerRef.current?.focus();
  }, []);
  const showOrderIssues = useCallback((item: OrderReference, trigger: HTMLButtonElement) => {
    if (item.status === ItemStatus.Done || item.status === ItemStatus.Hidden) return;
    triggerRef.current = trigger;
    setSelectedChatOrder(null);
    setSelectedOrder(item);
  }, []);
  const showOrderChat = useCallback((item: CustomerChatOrderReference, trigger: HTMLButtonElement) => {
    if (item.status === ItemStatus.Done || item.status === ItemStatus.Hidden || completedIds.has(item.id)) return;
    triggerRef.current = trigger;
    setSelectedOrder(null);
    setSelectedChatOrder(item);
  }, [completedIds]);
  const dismissOrderChat = useCallback((id: string) => {
    setSelectedChatOrder(selected => selected?.id === id ? null : selected);
  }, []);
  const dismissOrderIssues = useCallback((id: string) => {
    setSelectedOrder((selected) => selected?.id === id ? null : selected);
  }, []);
  useEffect(() => { if (visible) closeRef.current?.focus(); }, [visible, selectedOrder?.id]);
  useEffect(() => { if (selectedOrder && !visible) close(); }, [selectedOrder, visible, close]);
  useEffect(() => { if (chatVisible) closeRef.current?.focus(); }, [chatVisible, selectedChatOrder?.id]);
  useEffect(() => { if (selectedChatOrder && !chatVisible) close(); }, [selectedChatOrder, chatVisible, close]);
  const value = useMemo(() => ({ scan, issuesByOrder, chatsByOrder, excludedOrderIds: completedIds,
    showOrderIssues, dismissOrderIssues, showOrderChat, dismissOrderChat, filterSearchResponse }),
    [scan, issuesByOrder, chatsByOrder, completedIds, showOrderIssues, dismissOrderIssues, showOrderChat, dismissOrderChat, filterSearchResponse]);
  const result: AskTuesdayResponse | null = visible && response ? {
    mode: "record-search", page: "/orders", results: selectedIssues, totalMatches: selectedIssues.length,
    summary: `${selectedIssues.length} issue${selectedIssues.length === SINGLE_ISSUE_COUNT ? "" : "s"} to review`,
    freshness: response.freshness, capabilities: response.capabilities, limitations: response.limitations,
  } : null;

  return <TuesdayScanContext.Provider value={value}>
    {children}
    {visible && selectedOrder && result && <section id={dialogId} role="dialog" aria-modal={false}
      aria-label={`Issues for ${selectedOrder.customerName || "order"} ${selectedOrder.id}`}
      onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") { event.preventDefault(); close(); }
      }}
      style={{ width: PANEL_WIDTH, maxHeight: PANEL_HEIGHT }}
      className="fixed left-1/2 top-8 z-[80] flex -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl shadow-black/60">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <h2 className="break-words text-sm font-semibold text-slate-100">{selectedOrder.customerName || "Order"}</h2>
          <p className="mt-1 break-all text-xs text-slate-400">Order {selectedOrder.id}</p>
        </div>
        <button ref={closeRef} type="button" aria-label="Close order issues" onClick={close}
          className="rounded-lg px-2 py-1 text-xl leading-none text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">×</button>
      </header>
      <div className="min-h-0 space-y-3 overflow-y-auto overscroll-contain p-4">
        {scan.error && <p role="status" className="text-xs text-amber-200">Last findings — current checks are unavailable.</p>}
        <AskTuesdayResults response={result} referencePrefix={dialogId} onOpenOrder={() => undefined} issueMode
          showOrderAction={false} incomplete={response?.status === "partial"} />
      </div>
    </section>}
    {chatVisible && selectedChatOrder && <section id={dialogId} role="dialog" aria-modal={false}
      aria-label={`Customer chat for ${selectedChatOrder.customerName || "customer"} order ${selectedChatOrder.id}`}
      onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key === "Escape") { event.preventDefault(); close(); }
      }}
      style={{ width: PANEL_WIDTH, maxHeight: PANEL_HEIGHT }}
      className="fixed left-1/2 top-8 z-[80] flex -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl shadow-black/60">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <h2 className="break-words text-sm font-semibold text-slate-100">{selectedChatOrder.customerName || "Customer"}</h2>
          <p className="mt-1 break-all text-xs text-slate-400">Order {selectedChatOrder.id}</p>
        </div>
        <button ref={closeRef} type="button" aria-label="Close customer chat" onClick={close}
          className="rounded-lg px-2 py-1 text-xl leading-none text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">×</button>
      </header>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
        <CustomerChatSummary chats={selectedChats} stale={!!scan.error || response?.status === "unavailable"} partial={response?.status === "partial"} />
      </div>
    </section>}
  </TuesdayScanContext.Provider>;
}
