import React, { useMemo } from "react";
import { ShippingCell } from "../../cells/ShippingCell";
import { ItemStatus } from "@/typings/types";

interface ShippingStatusDisplayProps {
  orderId: string;
}

export const ShippingStatusDisplay: React.FC<ShippingStatusDisplayProps> = ({
  orderId,
}) => {
  // Memoize the dummy item to prevent unnecessary re-renders
  const memoizedItem = useMemo(
    () => ({
      id: orderId,
      values: [],
      createdAt: 0,
      status: ItemStatus.New,
      visible: true,
      deleted: false,
      index: 0,
    }),
    [orderId]
  );

  return <ShippingCell item={memoizedItem} />;
};
