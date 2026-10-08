"use client";

import { TableCell } from "@/components/ui/table";
import { OrderAttentionIcons } from "@/components/ask-tuesday/OrderAttentionIcons";
import type { CustomerChatOrderReference } from "@/components/ask-tuesday/OrderCustomerChatIcon";
import { ORDER_ATTENTION_LAYOUT } from "@/config/order-attention-layout";

export function OrderAttentionCell({ item }: { item: CustomerChatOrderReference }) {
  return (
    <TableCell
      className="relative isolate border-b border-gray-100 p-0 dark:border-gray-700/60"
      style={{ width: `${ORDER_ATTENTION_LAYOUT.cellWidthRem}rem` }}
    >
      <div className="flex items-center justify-center py-0.5">
        <OrderAttentionIcons item={item} />
      </div>
    </TableCell>
  );
}
