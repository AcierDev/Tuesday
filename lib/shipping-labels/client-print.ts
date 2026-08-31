import type { ShippingLabelPrintRequest } from "./print";
import { requestFutureLabelPrint } from "./client-api";

const PRINT_OBJECT_URL_LIFETIME_MS = 5 * 60 * 1000;

export async function printFutureLabels(
  request: ShippingLabelPrintRequest
): Promise<void> {
  const printWindow = window.open("about:blank", "_blank");
  if (!printWindow) {
    throw new Error("Allow pop-ups to print shipping labels.");
  }

  try {
    printWindow.document.title = "Preparing shipping labels…";
    const objectUrl = URL.createObjectURL(
      await requestFutureLabelPrint(request)
    );
    printWindow.location.replace(objectUrl);
    window.setTimeout(
      () => URL.revokeObjectURL(objectUrl),
      PRINT_OBJECT_URL_LIFETIME_MS
    );
  } catch (error) {
    printWindow.close();
    throw error;
  }
}
