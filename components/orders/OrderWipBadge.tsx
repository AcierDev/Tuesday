"use client";

import React from "react";
import { ORDER_WIP_STYLES } from "@/config/order-wip";
import { isOrderWip } from "@/lib/order-wip";
import type { Item } from "@/typings/types";

export function OrderWipBadge({ item }: { item: Item }) {
  return isOrderWip(item) ? (
    <span className={ORDER_WIP_STYLES.badge} aria-label="Work in progress">WIP</span>
  ) : null;
}
