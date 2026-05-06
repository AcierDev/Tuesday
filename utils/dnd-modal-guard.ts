/**
 * Drag-and-drop sensors must not activate while a modal dialog is open —
 * otherwise users can drag rows underneath the dialog overlay.
 *
 * Radix Dialog (and AlertDialog) put `role="dialog"`/`role="alertdialog"` on
 * the open content with `data-state="open"`. Popovers and dropdowns use
 * `role="menu"` etc., so this query is precise.
 */
export function isAnyModalDialogOpen(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.querySelector(
      '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
    )
  );
}
