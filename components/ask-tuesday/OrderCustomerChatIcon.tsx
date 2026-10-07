"use client";
import React, { useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { ItemStatus, type Item } from "@/typings/types";
import { useTuesdayScanContext } from "./TuesdayScanProvider";

const EMPTY_COUNT = 0;
export type CustomerChatOrderReference = Pick<Item, "id" | "status" | "customerName"> & { tags?: { hasCustomerMessage?: boolean } };

export function OrderCustomerChatIcon({ item }: { item: CustomerChatOrderReference }) {
  const context = useTuesdayScanContext();
  const ignored = item.status === ItemStatus.Done || item.status === ItemStatus.Hidden || !!context?.excludedOrderIds.has(item.id);
  const chats = context?.chatsByOrder.get(item.id) ?? [];
  const available = chats.length > EMPTY_COUNT || !!item.tags?.hasCustomerMessage;
  const dismiss = context?.dismissOrderChat;
  useEffect(() => { if (ignored || !available) dismiss?.(item.id); }, [ignored, available, item.id, dismiss]);
  useEffect(() => () => dismiss?.(item.id), [item.id, dismiss]);
  if (!context || ignored || !available) return null;
  const stopPropagation = (event: React.SyntheticEvent) => event.stopPropagation();
  return <button type="button" aria-label={`Show customer chat for ${item.customerName || "customer"} order ${item.id}`} aria-haspopup="dialog"
    title={chats.some(chat => chat.summary) ? "View saved AI summary and messages" : "View customer messages — summary not available yet"}
    onPointerDownCapture={stopPropagation} onPointerDown={stopPropagation} onMouseDown={stopPropagation}
    onTouchStart={stopPropagation} onKeyDown={stopPropagation}
    onClick={(event) => { event.stopPropagation(); context.showOrderChat(item, event.currentTarget); }}
    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sky-400 hover:bg-sky-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
    <MessageCircle aria-hidden="true" className="h-4 w-4" />
  </button>;
}
