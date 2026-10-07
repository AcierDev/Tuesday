"use client";

import type { CSSProperties } from "react";
import { OrderIssueIcon } from "./OrderIssueIcon";
import {
  OrderCustomerChatIcon,
  type CustomerChatOrderReference,
} from "./OrderCustomerChatIcon";
import { cn } from "@/utils/functions";
import { ORDER_ATTENTION_LAYOUT } from "@/config/order-attention-layout";

const ICON_BUTTON_CLASSES =
  "relative col-start-1 row-start-1 h-[var(--order-attention-button-size)] w-[var(--order-attention-button-size)] shadow-sm ring-1 ring-inset focus-visible:z-20";

export function OrderAttentionIcons({
  item,
}: {
  item: CustomerChatOrderReference;
}) {
  return (
    <div
      role="group"
      aria-label="Order alerts and messages"
      className="isolate grid shrink-0 place-items-center empty:hidden"
      style={{
        width: `${ORDER_ATTENTION_LAYOUT.clusterWidthRem}rem`,
        height: `${ORDER_ATTENTION_LAYOUT.clusterHeightRem}rem`,
        "--order-attention-button-size": `${ORDER_ATTENTION_LAYOUT.buttonSizeRem}rem`,
      } as CSSProperties}
    >
      <OrderIssueIcon
        item={item}
        className={cn(
          ICON_BUTTON_CLASSES,
          "z-0 bg-amber-50 text-amber-700 ring-amber-500/25 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900",
          "[&:has(+button)]:justify-self-start [&:has(+button)]:self-start"
        )}
      />
      <OrderCustomerChatIcon
        item={item}
        className={cn(
          ICON_BUTTON_CLASSES,
          "z-10 bg-sky-50 text-sky-700 ring-sky-500/25 hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-300 dark:hover:bg-sky-900",
          "[&:not(:only-child)]:justify-self-end [&:not(:only-child)]:self-end"
        )}
      />
    </div>
  );
}
