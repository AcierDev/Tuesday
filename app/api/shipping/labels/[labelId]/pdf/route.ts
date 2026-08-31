import { handleFutureLabelPdf } from "@/lib/shipping-labels/http";
import { createShippingLabelHttpDeps } from "@/lib/shipping-labels/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ labelId: string }> }
) {
  const { labelId } = await params;
  const deps = await createShippingLabelHttpDeps();
  return handleFutureLabelPdf(labelId, deps);
}
