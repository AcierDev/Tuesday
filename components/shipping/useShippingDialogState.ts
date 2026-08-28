"use client";

import { useCallback, useState } from "react";

export type ShippingDialog = "label" | "tracking";

export function useShippingDialogState(primaryDialog: ShippingDialog) {
  const [activeDialog, setActiveDialog] = useState<ShippingDialog | null>(null);

  const openPrimary = useCallback(() => {
    setActiveDialog(primaryDialog);
  }, [primaryDialog]);

  const openLabels = useCallback(() => {
    setActiveDialog("label");
  }, []);

  const setLabelOpen = useCallback((open: boolean) => {
    setActiveDialog((currentDialog) => {
      if (open) return "label";
      return currentDialog === "label" ? null : currentDialog;
    });
  }, []);

  const setTrackingOpen = useCallback((open: boolean) => {
    setActiveDialog((currentDialog) => {
      if (open) return "tracking";
      return currentDialog === "tracking" ? null : currentDialog;
    });
  }, []);

  return {
    isLabelOpen: activeDialog === "label",
    isTrackingOpen: activeDialog === "tracking",
    openLabels,
    openPrimary,
    setLabelOpen,
    setTrackingOpen,
  };
}
