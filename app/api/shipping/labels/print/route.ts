import { getDb } from "@/app/api/db/connect";
import { getLabel } from "@/lib/s3-client";
import { handlePrintFutureLabels } from "@/lib/shipping-labels/print-http";
import { listShippingLabels } from "@/lib/shipping-labels/repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const db = await getDb();
  return handlePrintFutureLabels(request, {
    listLabels: (orderId) => listShippingLabels(db, orderId),
    getObject: getLabel,
  });
}
